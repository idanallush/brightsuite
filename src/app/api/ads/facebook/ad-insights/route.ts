import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { fbFetchAll, FacebookApiError } from "@/lib/facebook/client";
import { getFbToken } from "@/lib/facebook/connection";

interface FBAdInsightRow {
  ad_id: string;
  ad_name: string;
  campaign_id: string;
  campaign_name: string;
  adset_id: string;
  adset_name: string;
  spend: string;
  impressions: string;
  clicks: string;
  reach: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
}

export interface AdInsightRow {
  adId: string;
  adName: string;
  campaignId: string;
  campaignName: string;
  adsetId: string;
  adsetName: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  leads: number;
  purchases: number;
  revenue: number;
  roas: number | null;
  cpl: number | null;
  cpa: number | null;
}

function getActionValue(
  actions: { action_type: string; value: string }[] | undefined,
  actionType: string
): number {
  if (!actions) return 0;
  const action = actions.find((a) => a.action_type === actionType);
  return action ? parseFloat(action.value) || 0 : 0;
}

function parseAdInsightRow(row: FBAdInsightRow): AdInsightRow {
  const spend = parseFloat(row.spend) || 0;
  const impressions = parseFloat(row.impressions) || 0;
  const clicks = parseFloat(row.clicks) || 0;
  const reach = parseFloat(row.reach) || 0;

  const leads =
    getActionValue(row.actions, "lead") ||
    getActionValue(row.actions, "offsite_conversion.fb_pixel_lead");
  const purchases =
    getActionValue(row.actions, "purchase") ||
    getActionValue(row.actions, "offsite_conversion.fb_pixel_purchase");
  const revenue =
    getActionValue(row.action_values, "purchase") ||
    getActionValue(row.action_values, "offsite_conversion.fb_pixel_purchase");

  const cpl = leads > 0 ? spend / leads : null;
  const cpa = purchases > 0 ? spend / purchases : null;
  const roas = spend > 0 ? revenue / spend : null;

  return {
    adId: row.ad_id,
    adName: row.ad_name,
    campaignId: row.campaign_id,
    campaignName: row.campaign_name,
    adsetId: row.adset_id,
    adsetName: row.adset_name,
    spend,
    impressions,
    clicks,
    reach,
    leads,
    purchases,
    revenue,
    roas,
    cpl,
    cpa,
  };
}

const AD_INSIGHT_FIELDS = [
  "ad_id",
  "ad_name",
  "campaign_id",
  "campaign_name",
  "adset_id",
  "adset_name",
  "spend",
  "impressions",
  "clicks",
  "reach",
  "actions",
  "action_values",
].join(",");

export async function GET(request: NextRequest) {
  const session = await getServerSession();

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("account_id");
  const since = searchParams.get("since");
  const until = searchParams.get("until");
  const campaignId = searchParams.get("campaign_id");

  if (!accountId) {
    return NextResponse.json({ error: "account_id is required" }, { status: 400 });
  }

  if (!since || !until) {
    return NextResponse.json(
      { error: "since and until dates are required" },
      { status: 400 }
    );
  }

  // Try DB first, fall back to session
  const accessToken = (session.userId ? await getFbToken(session.userId) : null) ?? session.fbAccessToken;

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const timeRange = JSON.stringify({ since, until });
    const filtering = JSON.stringify([
      { field: "spend", operator: "GREATER_THAN", value: "0" },
      ...(campaignId
        ? [{ field: "campaign.id", operator: "EQUAL", value: campaignId }]
        : []),
    ]);

    const path =
      `/${accountId}/insights?level=ad` +
      `&fields=${AD_INSIGHT_FIELDS}` +
      `&time_range=${timeRange}` +
      `&filtering=${filtering}` +
      `&limit=100`;

    const rows = await fbFetchAll<FBAdInsightRow>(path, accessToken, 20);
    const adInsights = rows.map(parseAdInsightRow);

    // Sort by spend descending
    adInsights.sort((a, b) => b.spend - a.spend);

    return NextResponse.json({ adInsights });
  } catch (err) {
    if (err instanceof FacebookApiError && err.isTokenExpired) {
      session.fbAccessToken = undefined;
      session.fbTokenExpiry = undefined;
      await session.save();
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    console.error("Failed to fetch ad insights:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch ad insights" },
      { status: 500 }
    );
  }
}
