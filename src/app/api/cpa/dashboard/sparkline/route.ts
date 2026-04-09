import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/cpa/supabase-server";
import type { SparklineData, DailyMetric } from "@/lib/cpa/types/dashboard";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const since = searchParams.get("since");
    const until = searchParams.get("until");

    if (!since || !until) {
      return NextResponse.json(
        { error: "Missing since or until query parameters" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Load active clients
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id")
      .eq("is_active", true);

    if (clientsError || !clients || clients.length === 0) {
      return NextResponse.json([]);
    }

    const clientIds = clients.map((c) => c.id);

    // Load active topics for all clients
    const { data: topics, error: topicsError } = await supabase
      .from("topics")
      .select("id, client_id")
      .in("client_id", clientIds)
      .eq("is_active", true);

    if (topicsError || !topics || topics.length === 0) {
      return NextResponse.json([]);
    }

    const topicIds = topics.map((t) => t.id);

    // Fetch all cache rows in the date range
    const { data: allCache } = await supabase
      .from("metrics_cache")
      .select("topic_id, date_since, date_until, metrics")
      .in("topic_id", topicIds)
      .gte("date_since", since)
      .lte("date_until", until);

    if (!allCache || allCache.length === 0) {
      return NextResponse.json([]);
    }

    // Build a map: client_id -> date -> { spend, conversions }
    const topicToClient = new Map<string, string>();
    for (const t of topics) {
      topicToClient.set(t.id, t.client_id);
    }

    const clientDailyMap = new Map<string, Map<string, { spend: number; conversions: number }>>();

    for (const row of allCache) {
      // Only use single-day entries for sparkline data
      if (row.date_since !== row.date_until) continue;

      const clientId = topicToClient.get(row.topic_id);
      if (!clientId) continue;

      const metrics = row.metrics as Record<string, number | null>;
      const spend = metrics?.spend ?? 0;
      const conversions =
        (metrics?.leads ?? 0) +
        (metrics?.purchases ?? 0) ||
        (metrics?.clicks ?? 0);

      if (!clientDailyMap.has(clientId)) {
        clientDailyMap.set(clientId, new Map());
      }
      const dayMap = clientDailyMap.get(clientId)!;
      const existing = dayMap.get(row.date_since) ?? { spend: 0, conversions: 0 };
      dayMap.set(row.date_since, {
        spend: existing.spend + spend,
        conversions: existing.conversions + conversions,
      });
    }

    // Convert to response format
    const result: SparklineData[] = [];

    for (const [clientId, dayMap] of clientDailyMap) {
      const daily: DailyMetric[] = [];
      const sortedDates = Array.from(dayMap.keys()).sort();

      for (const date of sortedDates) {
        const { spend, conversions } = dayMap.get(date)!;
        const cpa = conversions > 0 ? spend / conversions : 0;
        daily.push({ date, spend, conversions, cpa });
      }

      if (daily.length > 0) {
        result.push({ client_id: clientId, daily });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Sparkline data error:", error);
    return NextResponse.json([]);
  }
}
