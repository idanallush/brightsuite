import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { fbFetchAll } from "@/lib/facebook/client";
import { FacebookApiError } from "@/lib/facebook/client";

interface FBCampaignInsightRow {
  campaign_id: string;
  campaign_name: string;
  spend: string;
  impressions: string;
  clicks: string;
  reach: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
  purchase_roas?: { action_type: string; value: string }[];
}

export interface CampaignInsightRow {
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  leads: number;
  purchases: number;
  revenue: number;
  cpl: number | null;
  cpa: number | null;
  roas: number | null;
  ctr: number | null;
  cpm: number | null;
}

function getActionValue(
  actions: { action_type: string; value: string }[] | undefined,
  actionType: string
): number {
  if (!actions) return 0;
  const action = actions.find((a) => a.action_type === actionType);
  return action ? parseFloat(action.value) || 0 : 0;
}

function parseCampaignRow(row: FBCampaignInsightRow): CampaignInsightRow {
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
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : null;
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : null;

  return {
    campaignId: row.campaign_id,
    campaignName: row.campaign_name,
    spend,
    impressions,
    clicks,
    reach,
    leads,
    purchases,
    revenue,
    cpl,
    cpa,
    roas,
    ctr,
    cpm,
  };
}

const CAMPAIGN_INSIGHT_FIELDS = [
  "campaign_id",
  "campaign_name",
  "spend",
  "impressions",
  "clicks",
  "reach",
  "actions",
  "action_values",
  "purchase_roas",
].join(",");

export async function GET(request: NextRequest) {
  const session = await getServerSession();

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("account_id");
  const since = searchParams.get("since");
  const until = searchParams.get("until");

  if (!accountId) {
    return NextResponse.json({ error: "account_id is required" }, { status: 400 });
  }

  if (!since || !until) {
    return NextResponse.json(
      { error: "since and until dates are required" },
      { status: 400 }
    );
  }

  if (!session.fbAccessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const timeRange = JSON.stringify({ since, until });
    const filtering = JSON.stringify([
      { field: "spend", operator: "GREATER_THAN", value: "0" },
    ]);

    const path =
      `/${accountId}/insights?level=campaign` +
      `&fields=${CAMPAIGN_INSIGHT_FIELDS}` +
      `&time_range=${timeRange}` +
      `&filtering=${filtering}` +
      `&limit=100`;

    const rows = await fbFetchAll<FBCampaignInsightRow>(path, session.fbAccessToken, 20);
    const campaigns = rows.map(parseCampaignRow);

    // Sort by spend descending
    campaigns.sort((a, b) => b.spend - a.spend);

    return NextResponse.json({ campaigns });
  } catch (err) {
    if (err instanceof FacebookApiError && err.isTokenExpired) {
      session.fbAccessToken = undefined;
      session.fbTokenExpiry = undefined;
      await session.save();
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    console.error("Failed to fetch campaign insights:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}
