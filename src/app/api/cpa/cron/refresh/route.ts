import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/cpa/supabase-server";
import { fetchInsightsBatch, parseInsights } from "@/lib/cpa/insights";
import { detectConversionType, type ConversionType } from "@/lib/cpa/detection";
import { sendAlertEmail } from "@/lib/cpa/alerts/email";
import { sendSlackAlert } from "@/lib/cpa/alerts/slack";
import { sendTelegramAlert } from "@/lib/cpa/alerts/telegram";

export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

    if (!authHeader || authHeader !== expectedToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createServiceRoleClient();

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

    // Date range: last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const since = sevenDaysAgo.toISOString().split("T")[0];
    const until = now.toISOString().split("T")[0];
    const dateRange = { since, until };

    // Load active clients and topics
    const { data: clients } = await supabase
      .from("clients")
      .select("*")
      .eq("is_active", true);

    if (!clients?.length) {
      return NextResponse.json({
        data: { refreshed: 0, alerts: 0, message: "No active clients" },
      });
    }

    const clientIds = clients.map((c) => c.id);
    const { data: topics } = await supabase
      .from("topics")
      .select("*")
      .in("client_id", clientIds)
      .eq("is_active", true);

    let refreshedCount = 0;

    // Refresh metrics for all clients/topics
    for (const client of clients) {
      const clientTopics = (topics || []).filter(
        (t) => t.client_id === client.id
      );

      for (const topic of clientTopics) {
        const campaignIds: string[] = topic.campaign_ids || [];
        if (campaignIds.length === 0) continue;

        try {
          const insightsMap = await fetchInsightsBatch(
            campaignIds,
            dateRange,
            fbConn.access_token
          );

          let totalSpend = 0;
          let totalImpressions = 0;
          let totalClicks = 0;
          let totalLeads = 0;
          let totalPurchases = 0;

          for (const insights of insightsMap.values()) {
            if (!insights) continue;
            const parsed = parseInsights(insights);
            totalSpend += parsed.spend ?? 0;
            totalImpressions += parsed.impressions ?? 0;
            totalClicks += parsed.clicks ?? 0;
            totalLeads += parsed.leads ?? 0;
            totalPurchases += parsed.purchases ?? 0;
          }

          const metrics = {
            spend: totalSpend,
            impressions: totalImpressions,
            reach: null,
            frequency: null,
            clicks: totalClicks,
            ctr: null,
            cpc: null,
            cpm: null,
            leads: totalLeads,
            cpl: totalLeads > 0 ? totalSpend / totalLeads : null,
            purchases: totalPurchases,
            revenue: null,
            roas: null,
            cpa: totalPurchases > 0 ? totalSpend / totalPurchases : null,
            add_to_cart: null,
            initiate_checkout: null,
            results: null,
            cost_per_result: null,
          };

          await supabase.from("metrics_cache").upsert(
            {
              topic_id: topic.id,
              date_since: since,
              date_until: until,
              metrics,
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "topic_id,date_since,date_until" }
          );

          refreshedCount++;
        } catch (error) {
          console.error(
            `Failed to refresh topic ${topic.id} for client ${client.id}:`,
            error
          );
        }
      }
    }

    // Run alert check
    let alertViolations = 0;
    try {
      const { data: alertConfigs } = await supabase
        .from("alert_configs")
        .select("*")
        .eq("is_enabled", true);

      for (const client of clients) {
        const clientTopics = (topics || []).filter(
          (t) => t.client_id === client.id
        );

        for (const topic of clientTopics) {
          const campaignIds: string[] = topic.campaign_ids || [];
          if (campaignIds.length === 0) continue;

          // Get cached metrics
          const { data: cached } = await supabase
            .from("metrics_cache")
            .select("*")
            .eq("topic_id", topic.id)
            .eq("date_since", since)
            .eq("date_until", until)
            .limit(1)
            .single();

          if (!cached) continue;

          const metrics = cached.metrics as ReturnType<typeof parseInsights>;
          let effectiveConversionType: ConversionType | string | null =
            client.conversion_type_override || topic.conversion_type || null;

          if (!effectiveConversionType) {
            effectiveConversionType = await detectConversionType(
              client.fb_account_id,
              fbConn.access_token
            );
          }

          const conversions = getConversionsForType(
            metrics,
            effectiveConversionType
          );
          const spend = metrics.spend ?? 0;
          const cpa = conversions > 0 ? spend / conversions : null;
          const tcpa = topic.tcpa ?? null;

          if (cpa === null || tcpa === null || tcpa === 0) continue;

          const relevantConfigs = (alertConfigs || []).filter(
            (cfg: { client_id: string; topic_id: string | null; threshold_percent: number; notify_emails?: string[]; notify_slack_webhook?: string; notify_telegram_chat_id?: string }) =>
              cfg.client_id === client.id &&
              (!cfg.topic_id || cfg.topic_id === topic.id)
          );

          for (const config of relevantConfigs) {
            const threshold = config.threshold_percent ?? 0;
            const maxCpa = tcpa * (1 + threshold / 100);

            if (cpa > maxCpa) {
              alertViolations++;
              const overagePercent = ((cpa - tcpa) / tcpa) * 100;

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

              const alertMessage = `[CPA Alert] ${client.name} - ${topic.name}: CPA $${cpa.toFixed(2)} exceeds TCPA $${tcpa.toFixed(2)} by ${overagePercent.toFixed(1)}%`;
              const channelsNotified: string[] = [];

              // Send notifications via proper alert functions
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

              // Log alert with all columns (both old and new)
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
    } catch (error) {
      console.error("Alert check during cron failed:", error);
    }

    return NextResponse.json({
      data: {
        refreshed: refreshedCount,
        alerts: alertViolations,
        date_range: { since, until },
      },
    });
  } catch (error) {
    console.error("Cron refresh error:", error);
    return NextResponse.json(
      { error: "Cron refresh failed" },
      { status: 500 }
    );
  }
}

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
