import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/cpa/supabase-server";

type OverallStatus = "healthy" | "warning" | "critical";

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    // 1. Check FB connection
    const { data: fbConn } = await supabase
      .from("fb_connections")
      .select("id, token_expires_at, is_active")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const fbConnected = !!fbConn;
    let fbTokenExpiresInDays: number | null = null;

    if (fbConn?.token_expires_at) {
      const expiresAt = new Date(fbConn.token_expires_at);
      const now = new Date();
      fbTokenExpiresInDays = Math.ceil(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // 2. Get active clients
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, is_active")
      .eq("is_active", true);

    const activeClients = clients ?? [];
    const activeClientsCount = activeClients.length;
    const clientIds = activeClients.map((c) => c.id);

    // 3. Get all topics for active clients
    let allTopics: Array<{
      id: string;
      client_id: string;
      name: string;
      campaign_ids: string[] | null;
      tcpa: number | null;
    }> = [];

    if (clientIds.length > 0) {
      const { data: topics } = await supabase
        .from("topics")
        .select("id, client_id, name, campaign_ids, tcpa, is_active")
        .in("client_id", clientIds)
        .eq("is_active", true);

      allTopics = topics ?? [];
    }

    // Clients without any active topics
    const clientIdsWithTopics = new Set(allTopics.map((t) => t.client_id));
    const clientsWithoutTopics = activeClients
      .filter((c) => !clientIdsWithTopics.has(c.id))
      .map((c) => c.name);

    // Topics without campaign_ids
    const topicsWithoutCampaigns = allTopics
      .filter((t) => !t.campaign_ids || t.campaign_ids.length === 0)
      .map((t) => {
        const client = activeClients.find((c) => c.id === t.client_id);
        return `${client?.name ?? "Unknown"} / ${t.name}`;
      });

    // Topics without tcpa
    const topicsWithoutTcpa = allTopics
      .filter((t) => !t.tcpa || t.tcpa === 0)
      .map((t) => {
        const client = activeClients.find((c) => c.id === t.client_id);
        return `${client?.name ?? "Unknown"} / ${t.name}`;
      });

    // 4. Get alert configs
    let alertConfigs: Array<{
      id: string;
      client_id: string;
      is_enabled: boolean;
    }> = [];

    if (clientIds.length > 0) {
      const { data: configs } = await supabase
        .from("alert_configs")
        .select("id, client_id, is_enabled")
        .in("client_id", clientIds);

      alertConfigs = configs ?? [];
    }

    const enabledAlerts = alertConfigs.filter((c) => c.is_enabled);
    const alertsConfiguredCount = enabledAlerts.length;

    const clientIdsWithAlerts = new Set(enabledAlerts.map((c) => c.client_id));
    const clientsWithoutAlerts = activeClients
      .filter((c) => !clientIdsWithAlerts.has(c.id))
      .map((c) => c.name);

    // 5. Determine overall status
    let overallStatus: OverallStatus = "healthy";

    if (!fbConnected || (fbTokenExpiresInDays !== null && fbTokenExpiresInDays < 0)) {
      overallStatus = "critical";
    } else if (
      (fbTokenExpiresInDays !== null && fbTokenExpiresInDays <= 7) ||
      clientsWithoutTopics.length > 0 ||
      topicsWithoutCampaigns.length > 0 ||
      topicsWithoutTcpa.length > 0 ||
      clientsWithoutAlerts.length > 0
    ) {
      overallStatus = "warning";
    }

    return NextResponse.json({
      fb_connected: fbConnected,
      fb_token_expires_in_days: fbTokenExpiresInDays,
      active_clients_count: activeClientsCount,
      clients_without_topics: clientsWithoutTopics,
      topics_without_campaigns: topicsWithoutCampaigns,
      topics_without_tcpa: topicsWithoutTcpa,
      alerts_configured_count: alertsConfiguredCount,
      clients_without_alerts: clientsWithoutAlerts,
      overall_status: overallStatus,
    });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      { error: "Failed to run health check" },
      { status: 500 }
    );
  }
}
