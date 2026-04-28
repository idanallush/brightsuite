import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';
import type { CreativeType } from '@/lib/clients-dashboard/types';

export interface CreativeListRow {
  id: number;
  clientId: number;
  platform: string;
  platformAdId: string;
  platformCampaignId: string | null;
  adName: string | null;
  type: CreativeType;
  thumbnailUrl: string | null;
  mediaUrl: string | null;
  headline: string | null;
  body: string | null;
  cta: string | null;
  landingUrl: string | null;
  effectiveStatus: string | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  // Aggregated perf for the requested date range.
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  revenue: number;
  videoViews: number;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  cpl: number | null;
  roas: number | null;
}

// GET /api/clients-dashboard/creative
//   ?clientId=X
//   &startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
//   &type=all|video|image|carousel|collection
// Returns creatives with aggregated perf, sorted by spend desc.
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const search = request.nextUrl.searchParams;
  const clientId = Number(search.get('clientId'));
  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }
  const startDate = search.get('startDate') || isoDaysAgo(30);
  const endDate = search.get('endDate') || isoToday();
  const typeFilter = (search.get('type') || 'all') as CreativeType | 'all';

  const validTypes: ReadonlyArray<CreativeType | 'all'> = [
    'all',
    'video',
    'image',
    'carousel',
    'collection',
  ];
  if (!validTypes.includes(typeFilter)) {
    return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  }

  const db = getTurso();

  const sql = `
    SELECT
      c.id, c.client_id, c.platform, c.platform_ad_id, c.platform_campaign_id,
      c.ad_name, c.type, c.thumbnail_url, c.media_url, c.headline, c.body,
      c.cta, c.landing_url, c.effective_status, c.first_seen_at, c.last_seen_at,
      COALESCE(p.impressions, 0)  AS impressions,
      COALESCE(p.clicks, 0)       AS clicks,
      COALESCE(p.spend, 0)        AS spend,
      COALESCE(p.conversions, 0)  AS conversions,
      COALESCE(p.revenue, 0)      AS revenue,
      COALESCE(p.video_views, 0)  AS video_views
    FROM cd_creatives c
    LEFT JOIN (
      SELECT creative_id,
             SUM(impressions) AS impressions,
             SUM(clicks)      AS clicks,
             SUM(spend)       AS spend,
             SUM(conversions) AS conversions,
             SUM(revenue)     AS revenue,
             SUM(video_views) AS video_views
      FROM cd_creative_performance
      WHERE date BETWEEN ? AND ?
      GROUP BY creative_id
    ) p ON p.creative_id = c.id
    WHERE c.client_id = ?
      ${typeFilter === 'all' ? '' : 'AND c.type = ?'}
    ORDER BY spend DESC, c.last_seen_at DESC
  `;
  const args: Array<string | number> =
    typeFilter === 'all'
      ? [startDate, endDate, clientId]
      : [startDate, endDate, clientId, typeFilter];

  const result = await db.execute({ sql, args });

  const creatives: CreativeListRow[] = result.rows.map((row) => {
    const impressions = Number(row.impressions ?? 0);
    const clicks = Number(row.clicks ?? 0);
    const spend = Number(row.spend ?? 0);
    const conversions = Number(row.conversions ?? 0);
    const revenue = Number(row.revenue ?? 0);
    return {
      id: Number(row.id),
      clientId: Number(row.client_id),
      platform: String(row.platform),
      platformAdId: String(row.platform_ad_id),
      platformCampaignId: (row.platform_campaign_id as string | null) ?? null,
      adName: (row.ad_name as string | null) ?? null,
      type: row.type as CreativeType,
      thumbnailUrl: (row.thumbnail_url as string | null) ?? null,
      mediaUrl: (row.media_url as string | null) ?? null,
      headline: (row.headline as string | null) ?? null,
      body: (row.body as string | null) ?? null,
      cta: (row.cta as string | null) ?? null,
      landingUrl: (row.landing_url as string | null) ?? null,
      effectiveStatus: (row.effective_status as string | null) ?? null,
      firstSeenAt: (row.first_seen_at as string | null) ?? null,
      lastSeenAt: (row.last_seen_at as string | null) ?? null,
      impressions,
      clicks,
      spend,
      conversions,
      revenue,
      videoViews: Number(row.video_views ?? 0),
      ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
      cpc: clicks > 0 ? spend / clicks : null,
      cpm: impressions > 0 ? (spend / impressions) * 1000 : null,
      cpl: conversions > 0 ? spend / conversions : null,
      roas: spend > 0 ? revenue / spend : null,
    };
  });

  return NextResponse.json({
    creatives,
    range: { startDate, endDate },
    type: typeFilter,
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
