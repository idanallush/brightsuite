import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';
import type { Platform } from '@/lib/clients-dashboard/types';
import type {
  CampaignRow,
  CampaignDailyPoint,
  CampaignsApiResponse,
} from '@/lib/clients-dashboard/campaigns';

// GET /api/clients-dashboard/campaigns?clientId=X&startDate=Y&endDate=Z
//   → list of per-campaign aggregates over the date range, joined to
//     ah_campaigns metadata when available.
//
// GET /api/clients-dashboard/campaigns?clientId=X&campaignKey=PLATFORM:ID&startDate=Y&endDate=Z
//   → adds `daily` (per-day series for that single campaign) to the response.
//
// Defaults: startDate = today-29 days, endDate = today (so 30 days inclusive).
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const search = request.nextUrl.searchParams;
  const clientIdRaw = search.get('clientId');
  if (!clientIdRaw) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }
  const clientId = Number(clientIdRaw);
  if (!Number.isFinite(clientId) || clientId <= 0) {
    return NextResponse.json({ error: 'clientId must be a positive integer' }, { status: 400 });
  }

  const startDate = search.get('startDate') || isoDaysAgo(29);
  const endDate = search.get('endDate') || isoToday();
  const campaignKey = search.get('campaignKey'); // optional: PLATFORM:ID

  const db = getTurso();

  // Per-campaign aggregation. We GROUP BY (platform, platform_campaign_id)
  // because performance rows live keyed by the platform's own ID, while
  // ah_campaigns is the metadata source. LEFT JOIN handles the case where a
  // performance row exists but the campaign metadata row hasn't synced yet.
  const aggResult = await db.execute({
    sql: `
      SELECT
        p.platform AS platform,
        p.campaign_id AS platform_campaign_id,
        c.id AS campaign_id,
        c.name AS name,
        c.status AS status,
        c.objective AS objective,
        SUM(p.spend) AS spend,
        SUM(p.impressions) AS impressions,
        SUM(p.clicks) AS clicks,
        SUM(p.conversions) AS conversions,
        SUM(p.revenue) AS revenue
      FROM ah_performance_daily p
      LEFT JOIN ah_campaigns c
        ON c.platform = p.platform
       AND c.platform_campaign_id = p.campaign_id
      WHERE p.client_id = ?
        AND p.date BETWEEN ? AND ?
      GROUP BY p.platform, p.campaign_id, c.id, c.name, c.status, c.objective
      ORDER BY spend DESC, name ASC
    `,
    args: [clientId, startDate, endDate],
  });

  const campaigns: CampaignRow[] = aggResult.rows.map((row) => {
    const platform = (row.platform as Platform) ?? 'meta';
    const platformCampaignId = String(row.platform_campaign_id ?? '');
    const spend = num(row.spend);
    const impressions = num(row.impressions);
    const clicks = num(row.clicks);
    const conversions = num(row.conversions);
    const revenue = num(row.revenue);

    return {
      key: `${platform}:${platformCampaignId}`,
      platform,
      platformCampaignId,
      campaignId: row.campaign_id != null ? Number(row.campaign_id) : null,
      name: (row.name as string | null) ?? `(${platform} ${platformCampaignId})`,
      status: (row.status as string | null) ?? null,
      objective: (row.objective as string | null) ?? null,
      spend,
      impressions,
      clicks,
      conversions,
      revenue,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
      cpc: clicks > 0 ? spend / clicks : null,
      cpl: conversions > 0 ? spend / conversions : null,
      roas: spend > 0 ? revenue / spend : null,
    };
  });

  const response: CampaignsApiResponse = {
    campaigns,
    range: { startDate, endDate },
  };

  if (campaignKey) {
    const [platformPart, ...idParts] = campaignKey.split(':');
    const platformCampaignId = idParts.join(':');
    if (platformPart && platformCampaignId) {
      const dailyResult = await db.execute({
        sql: `
          SELECT
            date,
            SUM(spend) AS spend,
            SUM(impressions) AS impressions,
            SUM(clicks) AS clicks,
            SUM(conversions) AS conversions,
            SUM(revenue) AS revenue
          FROM ah_performance_daily
          WHERE client_id = ?
            AND platform = ?
            AND campaign_id = ?
            AND date BETWEEN ? AND ?
          GROUP BY date
          ORDER BY date ASC
        `,
        args: [clientId, platformPart, platformCampaignId, startDate, endDate],
      });

      const daily: CampaignDailyPoint[] = dailyResult.rows.map((r) => ({
        date: String(r.date),
        spend: num(r.spend),
        impressions: num(r.impressions),
        clicks: num(r.clicks),
        conversions: num(r.conversions),
        revenue: num(r.revenue),
      }));

      response.daily = daily;
    }
  }

  return NextResponse.json(response);
}

function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function isoToday(): string {
  return new Date().toISOString().split('T')[0];
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}
