import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { fbBatch, FacebookApiError } from "@/lib/facebook/client";
import { getFbToken } from "@/lib/facebook/connection";
import type { FBBatchRequest, FBInsights } from "@/lib/facebook/types";
import { parseInsights, type ParsedMetrics } from "@/lib/ads/facebook-insights";

/**
 * GET /api/ads/facebook/campaign-insights
 *
 * Fetches campaign-level insights for specific campaign IDs using the batch API.
 * Returns the EXACT same numbers Facebook Ads Manager shows at the campaign level,
 * even if some individual ads are missing or their insights failed to load.
 *
 * Query params:
 *   campaign_ids - comma-separated campaign IDs (required)
 *   since        - date string YYYY-MM-DD (required)
 *   until        - date string YYYY-MM-DD (required)
 */

const CAMPAIGN_INSIGHT_FIELDS = [
  "spend",
  "impressions",
  "reach",
  "frequency",
  "clicks",
  "ctr",
  "cpc",
  "cpm",
  "actions",
  "cost_per_action_type",
  "action_values",
  "video_thruplay_watched_actions",
  "results",
  "cost_per_result",
].join(",");

export async function GET(request: NextRequest) {
  const session = await getServerSession();

  const { searchParams } = new URL(request.url);
  const campaignIdsParam = searchParams.get("campaign_ids");
  const since = searchParams.get("since");
  const until = searchParams.get("until");

  if (!campaignIdsParam) {
    return NextResponse.json({ error: "campaign_ids is required" }, { status: 400 });
  }
  if (!since || !until) {
    return NextResponse.json({ error: "since and until are required" }, { status: 400 });
  }
  // Try DB first, fall back to session
  const accessToken = (session.userId ? await getFbToken(session.userId) : null) ?? session.fbAccessToken;

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const campaignIds = campaignIdsParam.split(",").filter(Boolean);
  if (campaignIds.length === 0) {
    return NextResponse.json({ insights: {} });
  }

  try {
    const timeRange = JSON.stringify({ since, until });

    // Build batch requests — one per campaign
    const requests: FBBatchRequest[] = campaignIds.map((id) => ({
      method: "GET",
      relative_url: `${id}/insights?fields=${CAMPAIGN_INSIGHT_FIELDS}&time_range=${timeRange}`,
    }));

    // fbBatch handles chunking at 50
    const responses = await fbBatch(requests, accessToken);

    const insights: Record<string, ParsedMetrics> = {};

    responses.forEach((response, index) => {
      const campaignId = campaignIds[index];
      if (response.code === 200) {
        try {
          const body = JSON.parse(response.body);
          const rawInsights: FBInsights | null = body.data?.[0] ?? null;
          // Parse using the same parseInsights function as ads — no objective needed
          // since we're just getting raw metrics for the campaign summary
          insights[campaignId] = parseInsights(rawInsights);
        } catch {
          // Parse error — skip this campaign
        }
      }
    });

    return NextResponse.json({ insights });
  } catch (err) {
    if (err instanceof FacebookApiError && err.isTokenExpired) {
      session.fbAccessToken = undefined;
      session.fbTokenExpiry = undefined;
      await session.save();
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    console.error("Failed to fetch campaign insights:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch campaign insights" },
      { status: 500 }
    );
  }
}
