import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';
import type { CreativeType } from '@/lib/clients-dashboard/types';

export interface CreativeAssetRow {
  id: number;
  sortOrder: number;
  assetType: 'video' | 'image';
  thumbnailUrl: string | null;
  mediaUrl: string | null;
  headline: string | null;
  body: string | null;
  landingUrl: string | null;
}

export interface CreativeDailyRow {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  revenue: number;
  videoViews: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  p100: number;
}

// GET /api/clients-dashboard/creative/:id?startDate=&endDate=
// Returns the single creative + its assets + daily perf time-series.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const creativeId = Number(id);
  if (!creativeId) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const search = request.nextUrl.searchParams;
  const startDate = search.get('startDate') || isoDaysAgo(30);
  const endDate = search.get('endDate') || isoToday();

  const db = getTurso();

  const creativeResult = await db.execute({
    sql: `SELECT id, client_id, platform, platform_ad_id, platform_campaign_id,
                 ad_name, type, thumbnail_url, media_url, headline, body,
                 cta, landing_url, effective_status, first_seen_at, last_seen_at
          FROM cd_creatives WHERE id = ?`,
    args: [creativeId],
  });
  if (creativeResult.rows.length === 0) {
    return NextResponse.json({ error: 'Creative not found' }, { status: 404 });
  }
  const c = creativeResult.rows[0];

  const assetsResult = await db.execute({
    sql: `SELECT id, sort_order, asset_type, thumbnail_url, media_url, headline, body, landing_url
          FROM cd_creative_assets WHERE creative_id = ? ORDER BY sort_order ASC`,
    args: [creativeId],
  });
  const assets: CreativeAssetRow[] = assetsResult.rows.map((r) => ({
    id: Number(r.id),
    sortOrder: Number(r.sort_order ?? 0),
    assetType: r.asset_type as 'video' | 'image',
    thumbnailUrl: (r.thumbnail_url as string | null) ?? null,
    mediaUrl: (r.media_url as string | null) ?? null,
    headline: (r.headline as string | null) ?? null,
    body: (r.body as string | null) ?? null,
    landingUrl: (r.landing_url as string | null) ?? null,
  }));

  const perfResult = await db.execute({
    sql: `SELECT date, impressions, clicks, spend, conversions, revenue,
                 video_views, p25, p50, p75, p95, p100
          FROM cd_creative_performance
          WHERE creative_id = ? AND date BETWEEN ? AND ?
          ORDER BY date ASC`,
    args: [creativeId, startDate, endDate],
  });
  const daily: CreativeDailyRow[] = perfResult.rows.map((r) => ({
    date: String(r.date),
    impressions: Number(r.impressions ?? 0),
    clicks: Number(r.clicks ?? 0),
    spend: Number(r.spend ?? 0),
    conversions: Number(r.conversions ?? 0),
    revenue: Number(r.revenue ?? 0),
    videoViews: Number(r.video_views ?? 0),
    p25: Number(r.p25 ?? 0),
    p50: Number(r.p50 ?? 0),
    p75: Number(r.p75 ?? 0),
    p95: Number(r.p95 ?? 0),
    p100: Number(r.p100 ?? 0),
  }));

  const totals = daily.reduce(
    (acc, d) => {
      acc.impressions += d.impressions;
      acc.clicks += d.clicks;
      acc.spend += d.spend;
      acc.conversions += d.conversions;
      acc.revenue += d.revenue;
      acc.videoViews += d.videoViews;
      return acc;
    },
    { impressions: 0, clicks: 0, spend: 0, conversions: 0, revenue: 0, videoViews: 0 },
  );

  return NextResponse.json({
    creative: {
      id: Number(c.id),
      clientId: Number(c.client_id),
      platform: String(c.platform),
      platformAdId: String(c.platform_ad_id),
      platformCampaignId: (c.platform_campaign_id as string | null) ?? null,
      adName: (c.ad_name as string | null) ?? null,
      type: c.type as CreativeType,
      thumbnailUrl: (c.thumbnail_url as string | null) ?? null,
      mediaUrl: (c.media_url as string | null) ?? null,
      headline: (c.headline as string | null) ?? null,
      body: (c.body as string | null) ?? null,
      cta: (c.cta as string | null) ?? null,
      landingUrl: (c.landing_url as string | null) ?? null,
      effectiveStatus: (c.effective_status as string | null) ?? null,
      firstSeenAt: (c.first_seen_at as string | null) ?? null,
      lastSeenAt: (c.last_seen_at as string | null) ?? null,
    },
    assets,
    daily,
    totals,
    range: { startDate, endDate },
  });
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function isoToday(): string {
  return new Date().toISOString().split('T')[0];
}
