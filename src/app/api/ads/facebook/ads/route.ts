import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { fetchAds } from "@/lib/ads/facebook-ads";
import { fetchInsightsBatch, parseInsights } from "@/lib/ads/facebook-insights";
import { normalizeAds, resolveMediaUrls } from "@/lib/ads/facebook-creatives";
import { FacebookApiError } from "@/lib/facebook/client";
import { getFbToken } from "@/lib/facebook/connection";
import type { FBInsights } from "@/lib/facebook/types";

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
    // Fetch ACTIVE and PAUSED ads — we rely on insights data to filter by date-range activity
    const effectiveStatuses = ["ACTIVE", "PAUSED", "CAMPAIGN_PAUSED", "ADSET_PAUSED"];

    // Fetch ads — if campaignId is set, fetch all ads for that campaign
    const ads = await fetchAds(accountId, accessToken, {
      effectiveStatuses,
      campaignId: campaignId || undefined,
    });

    console.log(`[Ads] Fetched ${ads.length} raw ads from Facebook API`);

    if (ads.length === 0) {
      return NextResponse.json({ ads: [] });
    }

    // Fetch insights for all ads in batch (chunked at 25 to avoid FB "reduce data" error)
    const adIds = ads.map((ad) => ad.id);
    console.log(`[Ads] Fetching insights for ${adIds.length} ads (${since} → ${until})`);
    let insightsMap: Map<string, FBInsights | null>;
    try {
      insightsMap = await fetchInsightsBatch(
        adIds,
        { since, until },
        accessToken
      );
    } catch (insightsErr) {
      console.error(`[Ads] fetchInsightsBatch failed for ${adIds.length} ads:`, insightsErr instanceof Error ? insightsErr.message : insightsErr);
      throw insightsErr;
    }

    // Parse insights per ad
    const parsedInsightsMap = new Map<string, ReturnType<typeof parseInsights>>();
    for (const [adId, rawInsights] of insightsMap) {
      const ad = ads.find((a) => a.id === adId);
      parsedInsightsMap.set(adId, parseInsights(rawInsights, ad?.campaign?.objective));
    }

    // Normalize into unified rows
    let normalizedAds = normalizeAds(ads, parsedInsightsMap);
    console.log(`[Ads] After normalizeAds: ${normalizedAds.length} ads`);

    // Log ads that will be filtered out
    const zeroActivity = normalizedAds.filter((a) => {
      const impressions = (a.metrics.impressions as number) ?? 0;
      const spend = (a.metrics.spend as number) ?? 0;
      return impressions <= 0 && spend <= 0;
    });
    console.log(`[Ads] Zero impressions AND zero spend: ${zeroActivity.length} ads`);
    for (const a of zeroActivity) {
      console.log(`[Ads]   Filtered out: ${a.adName} | impressions=${a.metrics.impressions} | spend=${a.metrics.spend} | status=${a.status}`);
    }

    // Filter out ads with no activity — keep if impressions > 0 OR spend > 0
    normalizedAds = normalizedAds.filter((ad) => {
      const impressions = (ad.metrics.impressions as number) ?? 0;
      const spend = (ad.metrics.spend as number) ?? 0;
      return impressions > 0 || spend > 0;
    });
    console.log(`[Ads] After activity filter: ${normalizedAds.length} ads remaining`);

    if (normalizedAds.length === 0) {
      return NextResponse.json({ ads: [] });
    }

    // Only pass raw ads that survived the activity filter to resolveMediaUrls
    const activeAdIds = new Set(normalizedAds.map((a) => a.adId));
    const filteredRawAds = ads.filter((raw) => activeAdIds.has(raw.id));

    // Resolve missing media URLs via story IDs + image hash resolution
    normalizedAds = await resolveMediaUrls(normalizedAds, filteredRawAds, accessToken, accountId);

    return NextResponse.json({ ads: normalizedAds });
  } catch (err) {
    if (err instanceof FacebookApiError && err.isTokenExpired) {
      session.fbAccessToken = undefined;
      session.fbTokenExpiry = undefined;
      await session.save();
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    console.error("Failed to fetch ads:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch ads" },
      { status: 500 }
    );
  }
}
