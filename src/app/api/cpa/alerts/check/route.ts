import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/cpa/supabase-server";
import { fetchInsightsBatch, parseInsights } from "@/lib/cpa/insights";
import { detectConversionType, type ConversionType } from "@/lib/cpa/detection";
import { sendAlertEmail } from "@/lib/cpa/alerts/email";
import { sendSlackAlert } from "@/lib/cpa/alerts/slack";
import { sendTelegramAlert } from "@/lib/cpa/alerts/telegram";

function getConversionsForType(
  metrics: ReturnType<typeof parseInsights>,
  conversionType: ConversionType | string | null
): number {
  switch (conversionType) {
    case "PURCHASE":
      return metrics.purchases ?? 0;
    case "LEAD":
      return metrics.leads ?? 0;
    case "COMPLETE_REGISTRATION":
      return metrics.results ?? 0;
    case "LINK_CLICK":
      return metrics.clicks ?? 0;
    default:
      return metrics.purchases ?? metrics.leads ?? metrics.clicks ?? 0;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const filterClientId = body?.client_id;

    const supabase = createServiceRoleClient();

    // Get date range (today)
    const now = new Date();
    const since = now.toISOString().split("T")[0];
    const until = since;

    // Load active clients
    let clientsQuery = supabase
      .from("clients")
      .select("*")
      .eq("is_active", true);

    if (filterClientId) {
      clientsQuery = clientsQuery.eq("id", filterClientId);
    }

    const { data: clients, error: clientsError } = await clientsQuery;

    if (clientsError || !clients?.length) {
      return NextResponse.json({ data: { violations: [] } });
    }

    // Load topics
    const clientIds = clients.map((c) => c.id);
    const { data: topics } = await supabase
      .from("topics")
      .select("*")
      .in("client_id", clientIds)
      .eq("is_active", true);

    // Get FB token
    const { data: fbConn } = await supabase
      .from("fb_connections")
      .select("*")
      .gt("token_expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!fbConn) {
      return NextResponse.json(
        { error: "No active Facebook connection" },
        { status: 401 }
      );
    }

    // Load alert configs
    let configsQuery = supabase
      .from("alert_configs")
      .select("*")
      .eq("is_enabled", true);

    if (filterClientId) {
      configsQuery = configsQuery.eq("client_id", filterClientId);
    }

    const { data: alertConfigs } = await configsQuery;

    const violations: Array<{
      client_id: string;
      client_name: string;
      topic_id: string;
      topic_name: string;
      cpa: number;
      tcpa: number;
      threshold_percent: number;
      overage_percent: number;
    }> = [];

    for (const client of clients) {
      const clientTopics = (topics || []).filter(
        (t) => t.client_id === client.id
      );

      for (const topic of clientTopics) {
        const campaignIds: string[] = topic.campaign_ids || [];
        if (campaignIds.length === 0) continue;

        const insightsMap = await fetchInsightsBatch(
          campaignIds,
          { since, until },
          fbConn.access_token
        );

        let totalSpend = 0;
        let totalLeads = 0;
        let totalPurchases = 0;
        let totalClicks = 0;

        for (const insights of insightsMap.values()) {
          if (!insights) continue;
          const parsed = parseInsights(insights);
          totalSpend += parsed.spend ?? 0;
          totalLeads += parsed.leads ?? 0;
          totalPurchases += parsed.purchases ?? 0;
          totalClicks += parsed.clicks ?? 0;
        }

        let effectiveConversionType: ConversionType | string | null =
          client.conversion_type_override || topic.conversion_type || null;

        if (!effectiveConversionType) {
          effectiveConversionType = await detectConversionType(
            client.fb_account_id,
            fbConn.access_token
          );
        }

        const aggregatedMetrics = {
          spend: totalSpend,
          impressions: null,
          reach: null,
          frequency: null,
          clicks: totalClicks,
          ctr: null,
          cpc: null,
          cpm: null,
          leads: totalLeads,
          cpl: null,
          purchases: totalPurchases,
          revenue: null,
          roas: null,
          cpa: null,
          add_to_cart: null,
          initiate_checkout: null,
          results: null,
          cost_per_result: null,
        };

        const conversions = getConversionsForType(
          aggregatedMetrics,
          effectiveConversionType
        );
        const cpa = conversions > 0 ? totalSpend / conversions : null;
        const tcpa = topic.tcpa ?? null;

        if (cpa === null || tcpa === null || tcpa === 0) continue;

        // Check each alert config for this client/topic
        const relevantConfigs = (alertConfigs || []).filter(
          (cfg) =>
            cfg.client_id === client.id &&
            (!cfg.topic_id || cfg.topic_id === topic.id)
        );

        for (const config of relevantConfigs) {
          const threshold = config.threshold_percent ?? 0;
          const maxCpa = tcpa * (1 + threshold / 100);

          if (cpa > maxCpa) {
            const overagePercent = ((cpa - tcpa) / tcpa) * 100;

            const violation = {
              client_id: client.id,
              client_name: client.name,
              topic_id: topic.id,
              topic_name: topic.name,
              cpa,
              tcpa,
              threshold_percent: threshold,
              overage_percent: Math.round(overagePercent * 100) / 100,
            };

            violations.push(violation);

            const alertViolation = {
              client_id: client.id,
              client_name: client.name,
              topic_id: topic.id,
              topic_name: topic.name,
              actual_cpa: cpa,
              target_cpa: tcpa,
              overshoot_percent: overagePercent,
              currency: client.currency || "ILS",
              date_range: { since, until },
            };

            const alertMessage = `[CPA Alert] ${client.name} - ${topic.name}: CPA $${cpa.toFixed(2)} exceeds TCPA $${tcpa.toFixed(2)} by ${overagePercent.toFixed(1)}% (threshold: ${threshold}%)`;

            const channelsNotified: string[] = [];

            // Send alerts via configured channels
            if (config.notify_emails?.length) {
              const sent = await sendAlertEmail(alertViolation, config.notify_emails);
              if (sent) channelsNotified.push("email");
            }
            if (config.notify_slack_webhook) {
              const sent = await sendSlackAlert(alertViolation, config.notify_slack_webhook);
              if (sent) channelsNotified.push("slack");
            }
            if (config.notify_telegram_chat_id) {
              const sent = await sendTelegramAlert(alertViolation, config.notify_telegram_chat_id);
              if (sent) channelsNotified.push("telegram");
            }

            // Log to alert_log
            await supabase.from("alert_log").insert({
              client_id: client.id,
              topic_id: topic.id,
              client_name: client.name,
              topic_name: topic.name,
              actual_cpa: cpa,
              target_cpa: tcpa,
              overshoot_percent: overagePercent,
              date_range_since: since,
              date_range_until: until,
              channel: channelsNotified[0] || "email",
              alert_config_id: config.id,
              cpa,
              tcpa,
              overage_percent: overagePercent,
              message: alertMessage,
              channels_notified: channelsNotified,
            });
          }
        }
      }
    }

    return NextResponse.json({ data: { violations } });
  } catch (error) {
    console.error("Alert check error:", error);
    return NextResponse.json(
      { error: "Alert check failed" },
      { status: 500 }
    );
  }
}
