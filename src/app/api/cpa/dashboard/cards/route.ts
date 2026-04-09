import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/cpa/supabase-server";
import { fetchInsightsBatch, parseInsights } from "@/lib/cpa/insights";
import { detectConversionType, type ConversionType } from "@/lib/cpa/detection";
import type { MetricType } from "@/lib/cpa/metric-presets";

interface TopicMetrics {
  topic_id: string;
  topic_name: string;
  metric_type: MetricType;
  spend: number;
  conversions: number;
  cpa: number | null;
  tcpa: number | null;
  tcpa_currency: string | null;
  status: "green" | "yellow" | "red" | "no_data";
  conversion_type: string | null;
  revenue: number | null;
  roas: number | null;
  impressions: number;
  clicks: number;
  ctr: number | null;
  cpm: number | null;
  reach: number;
  prev_spend?: number;
  prev_conversions?: number;
  prev_cpa?: number | null;
  spend_change_pct?: number | null;
  cpa_change_pct?: number | null;
}

interface ClientCardData {
  client_id: string;
  client_name: string;
  fb_account_id: string;
  currency: string;
  is_multi_topic: boolean;
  topics: TopicMetrics[];
  total_spend: number;
  total_conversions: number;
  overall_cpa: number | null;
}

function getConversionsForMetricType(
  metrics: ReturnType<typeof parseInsights>,
  metricType: MetricType,
  conversionType: ConversionType | string | null
): number {
  switch (metricType) {
    case "ecommerce":
      return metrics.purchases ?? 0;
    case "engagement":
      return metrics.clicks ?? 0;
    case "leads":
    default:
      // For leads, use the specific conversion type if available
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
          return metrics.leads ?? metrics.purchases ?? metrics.clicks ?? 0;
      }
  }
}

function determineStatus(
  cpa: number | null,
  tcpa: number | null
): "green" | "yellow" | "red" | "no_data" {
  if (cpa === null || tcpa === null || tcpa === 0) return "no_data";
  if (cpa <= tcpa) return "green";
  const overPercent = ((cpa - tcpa) / tcpa) * 100;
  if (overPercent <= 20) return "yellow";
  return "red";
}

function makeEmptyTopicMetrics(overrides?: Partial<TopicMetrics>): TopicMetrics {
  return {
    topic_id: "__default__",
    topic_name: "Default",
    metric_type: "leads",
    spend: 0,
    conversions: 0,
    cpa: null,
    tcpa: null,
    tcpa_currency: null,
    status: "no_data",
    conversion_type: null,
    revenue: null,
    roas: null,
    impressions: 0,
    clicks: 0,
    ctr: null,
    cpm: null,
    reach: 0,
    ...overrides,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const since = searchParams.get("since");
    const until = searchParams.get("until");
    const compare = searchParams.get("compare") === "true";

    if (!since || !until) {
      return NextResponse.json(
        { error: "Missing since or until query parameters" },
        { status: 400 }
      );
    }

    // Calculate previous period for comparison
    let prevDateRange: { since: string; until: string } | null = null;
    if (compare) {
      const sinceDate = new Date(since + "T00:00:00");
      const untilDate = new Date(until + "T00:00:00");
      const durationMs = untilDate.getTime() - sinceDate.getTime();
      const prevUntilDate = new Date(sinceDate.getTime() - 86400000); // day before since
      const prevSinceDate = new Date(prevUntilDate.getTime() - durationMs);
      const pad = (d: Date) => d.toISOString().split("T")[0];
      prevDateRange = { since: pad(prevSinceDate), until: pad(prevUntilDate) };
    }

    const supabase = createServiceRoleClient();

    // Load active clients
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("*")
      .eq("is_active", true)
      .order("display_order");

    if (clientsError) {
      return NextResponse.json(
        { error: "Failed to load clients" },
        { status: 500 }
      );
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json([]);
    }

    // Load active topics for all clients
    const clientIds = clients.map((c) => c.id);
    const { data: topics, error: topicsError } = await supabase
      .from("topics")
      .select("*")
      .in("client_id", clientIds)
      .eq("is_active", true)
      .order("display_order");

    if (topicsError) {
      return NextResponse.json(
        { error: "Failed to load topics" },
        { status: 500 }
      );
    }

    // Get latest active FB token
    const { data: fbConn } = await supabase
      .from("fb_connections")
      .select("*")
      .gt("token_expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!fbConn) {
      return NextResponse.json([]);
    }

    const accessToken = fbConn.access_token;
    const dateRange = { since, until };
    const cards: ClientCardData[] = [];

    for (const client of clients) {
      try {
        const clientTopics = (topics || []).filter(
          (t) => t.client_id === client.id
        );

        // Clients with no topics - create default metrics
        if (clientTopics.length === 0) {
          cards.push({
            client_id: client.id,
            client_name: client.name,
            fb_account_id: client.fb_account_id,
            currency: client.currency || "USD",
            is_multi_topic: false,
            topics: [makeEmptyTopicMetrics()],
            total_spend: 0,
            total_conversions: 0,
            overall_cpa: null,
          });
          continue;
        }

        const topicMetrics: TopicMetrics[] = [];

        for (const topic of clientTopics) {
          const campaignIds: string[] = topic.campaign_ids || [];
          const metricType: MetricType = topic.metric_type || "leads";

          // Skip topics with no campaign IDs
          if (campaignIds.length === 0) continue;

          // Check metrics_cache
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          const { data: cached } = await supabase
            .from("metrics_cache")
            .select("*")
            .eq("topic_id", topic.id)
            .eq("date_since", since)
            .eq("date_until", until)
            .gt("fetched_at", oneHourAgo)
            .limit(1)
            .single();

          let parsedMetrics: ReturnType<typeof parseInsights>;

          if (cached) {
            parsedMetrics = cached.metrics as ReturnType<typeof parseInsights>;
          } else {
            // Cache miss - fetch from Facebook
            const insightsMap = await fetchInsightsBatch(
              campaignIds,
              dateRange,
              accessToken
            );

            // Aggregate insights across campaigns
            let totalSpend = 0;
            let totalImpressions = 0;
            let totalClicks = 0;
            let totalLeads = 0;
            let totalPurchases = 0;
            let totalRevenue = 0;
            let totalReach = 0;

            for (const insights of insightsMap.values()) {
              if (!insights) continue;
              const parsed = parseInsights(insights);
              totalSpend += parsed.spend ?? 0;
              totalImpressions += parsed.impressions ?? 0;
              totalClicks += parsed.clicks ?? 0;
              totalLeads += parsed.leads ?? 0;
              totalPurchases += parsed.purchases ?? 0;
              totalRevenue += parsed.revenue ?? 0;
              totalReach += parsed.reach ?? 0;
            }

            parsedMetrics = {
              spend: totalSpend,
              impressions: totalImpressions,
              reach: totalReach,
              frequency: null,
              clicks: totalClicks,
              ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : null,
              cpc: totalClicks > 0 ? totalSpend / totalClicks : null,
              cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : null,
              leads: totalLeads,
              cpl: totalLeads > 0 ? totalSpend / totalLeads : null,
              purchases: totalPurchases,
              revenue: totalRevenue > 0 ? totalRevenue : null,
              roas: totalSpend > 0 && totalRevenue > 0 ? totalRevenue / totalSpend : null,
              cpa: totalPurchases > 0 ? totalSpend / totalPurchases : null,
              add_to_cart: null,
              initiate_checkout: null,
              results: null,
              cost_per_result: null,
            };

            // Upsert to metrics_cache
            await supabase.from("metrics_cache").upsert(
              {
                topic_id: topic.id,
                date_since: since,
                date_until: until,
                metrics: parsedMetrics,
                fetched_at: new Date().toISOString(),
              },
              { onConflict: "topic_id,date_since,date_until" }
            );
          }

          // Determine effective conversion type
          let effectiveConversionType: ConversionType | string | null =
            client.conversion_type_override ||
            topic.conversion_type ||
            null;

          if (!effectiveConversionType && metricType === "leads") {
            effectiveConversionType = await detectConversionType(
              client.fb_account_id,
              accessToken
            );
          }

          const conversions = getConversionsForMetricType(
            parsedMetrics,
            metricType,
            effectiveConversionType
          );
          const spend = parsedMetrics.spend ?? 0;
          const cpa = conversions > 0 ? spend / conversions : null;
          const tcpa = topic.tcpa ?? null;
          const status = determineStatus(cpa, tcpa);

          // Fetch previous period metrics for comparison
          let prevSpend: number | undefined;
          let prevConversions: number | undefined;
          let prevCpa: number | null | undefined;
          let spendChangePct: number | null | undefined;
          let cpaChangePct: number | null | undefined;

          if (compare && prevDateRange) {
            const prevOneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            const { data: prevCached } = await supabase
              .from("metrics_cache")
              .select("*")
              .eq("topic_id", topic.id)
              .eq("date_since", prevDateRange.since)
              .eq("date_until", prevDateRange.until)
              .gt("fetched_at", prevOneHourAgo)
              .limit(1)
              .single();

            let prevParsedMetrics: ReturnType<typeof parseInsights>;

            if (prevCached) {
              prevParsedMetrics = prevCached.metrics as ReturnType<typeof parseInsights>;
            } else {
              const prevInsightsMap = await fetchInsightsBatch(
                campaignIds,
                prevDateRange,
                accessToken
              );

              let pTotalSpend = 0;
              let pTotalImpressions = 0;
              let pTotalClicks = 0;
              let pTotalLeads = 0;
              let pTotalPurchases = 0;
              let pTotalRevenue = 0;
              let pTotalReach = 0;

              for (const insights of prevInsightsMap.values()) {
                if (!insights) continue;
                const parsed = parseInsights(insights);
                pTotalSpend += parsed.spend ?? 0;
                pTotalImpressions += parsed.impressions ?? 0;
                pTotalClicks += parsed.clicks ?? 0;
                pTotalLeads += parsed.leads ?? 0;
                pTotalPurchases += parsed.purchases ?? 0;
                pTotalRevenue += parsed.revenue ?? 0;
                pTotalReach += parsed.reach ?? 0;
              }

              prevParsedMetrics = {
                spend: pTotalSpend,
                impressions: pTotalImpressions,
                reach: pTotalReach,
                frequency: null,
                clicks: pTotalClicks,
                ctr: pTotalImpressions > 0 ? (pTotalClicks / pTotalImpressions) * 100 : null,
                cpc: pTotalClicks > 0 ? pTotalSpend / pTotalClicks : null,
                cpm: pTotalImpressions > 0 ? (pTotalSpend / pTotalImpressions) * 1000 : null,
                leads: pTotalLeads,
                cpl: pTotalLeads > 0 ? pTotalSpend / pTotalLeads : null,
                purchases: pTotalPurchases,
                revenue: pTotalRevenue > 0 ? pTotalRevenue : null,
                roas: pTotalSpend > 0 && pTotalRevenue > 0 ? pTotalRevenue / pTotalSpend : null,
                cpa: pTotalPurchases > 0 ? pTotalSpend / pTotalPurchases : null,
                add_to_cart: null,
                initiate_checkout: null,
                results: null,
                cost_per_result: null,
              };

              await supabase.from("metrics_cache").upsert(
                {
                  topic_id: topic.id,
                  date_since: prevDateRange.since,
                  date_until: prevDateRange.until,
                  metrics: prevParsedMetrics,
                  fetched_at: new Date().toISOString(),
                },
                { onConflict: "topic_id,date_since,date_until" }
              );
            }

            const pConversions = getConversionsForMetricType(
              prevParsedMetrics,
              metricType,
              effectiveConversionType
            );
            const pSpend = prevParsedMetrics.spend ?? 0;
            const pCpa = pConversions > 0 ? pSpend / pConversions : null;

            prevSpend = pSpend;
            prevConversions = pConversions;
            prevCpa = pCpa;
            spendChangePct = pSpend > 0 ? ((spend - pSpend) / pSpend) * 100 : null;
            cpaChangePct =
              cpa !== null && pCpa !== null && pCpa > 0
                ? ((cpa - pCpa) / pCpa) * 100
                : null;
          }

          topicMetrics.push({
            topic_id: topic.id,
            topic_name: topic.name,
            metric_type: metricType,
            spend,
            conversions,
            cpa,
            tcpa,
            tcpa_currency: topic.tcpa_currency || null,
            status,
            conversion_type: effectiveConversionType,
            revenue: parsedMetrics.revenue,
            roas: parsedMetrics.roas,
            impressions: parsedMetrics.impressions ?? 0,
            clicks: parsedMetrics.clicks ?? 0,
            ctr: parsedMetrics.ctr,
            cpm: parsedMetrics.cpm,
            reach: parsedMetrics.reach ?? 0,
            ...(compare
              ? {
                  prev_spend: prevSpend,
                  prev_conversions: prevConversions,
                  prev_cpa: prevCpa,
                  spend_change_pct: spendChangePct,
                  cpa_change_pct: cpaChangePct,
                }
              : {}),
          });
        }

        const nonDefaultTopics = topicMetrics.filter(
          (t) => t.topic_id !== "__default__"
        );
        const isMultiTopic = nonDefaultTopics.length > 1;

        const totalSpend = topicMetrics.reduce((sum, t) => sum + t.spend, 0);
        const totalConversions = topicMetrics.reduce(
          (sum, t) => sum + t.conversions,
          0
        );
        const overallCpa =
          totalConversions > 0 ? totalSpend / totalConversions : null;

        cards.push({
          client_id: client.id,
          client_name: client.name,
          fb_account_id: client.fb_account_id,
          currency: client.currency || "USD",
          is_multi_topic: isMultiTopic,
          topics: topicMetrics.length > 0
            ? topicMetrics
            : [makeEmptyTopicMetrics()],
          total_spend: totalSpend,
          total_conversions: totalConversions,
          overall_cpa: overallCpa,
        });
      } catch (clientError) {
        console.error(`Error processing client ${client.name}:`, clientError);
        cards.push({
          client_id: client.id,
          client_name: client.name,
          fb_account_id: client.fb_account_id,
          currency: client.currency || "USD",
          is_multi_topic: false,
          topics: [makeEmptyTopicMetrics()],
          total_spend: 0,
          total_conversions: 0,
          overall_cpa: null,
        });
      }
    }

    return NextResponse.json(cards);
  } catch (error) {
    console.error("Dashboard cards error:", error);
    return NextResponse.json([]);
  }
}
