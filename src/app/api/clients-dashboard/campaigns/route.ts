import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';
import type { Platform } from '@/lib/clients-dashboard/types';
import type {
  CampaignRow,
  CampaignDailyPoint,
  CampaignsApiResponse,
  CampaignsTotals,
} from '@/lib/clients-dashboard/campaigns';

// GET /api/clients-dashboard/campaigns?clientId=X&startDate=Y&endDate=Z
//   → paginated list of per-campaign aggregates over the date range, joined
//     to ah_campaigns metadata when available. Pagination is applied AFTER
//     aggregation so `total` counts deduped campaigns, not raw daily rows.
//
// GET /api/clients-dashboard/campaigns?clientId=X&campaignKey=PLATFORM:ID&startDate=Y&endDate=Z
//   → adds `daily` (per-day series for that single campaign) to the response.
//     campaignKey requests bypass pagination (single campaign).
//
// Pagination params:
//   ?page=N        → 1-indexed, default 1
//   ?pageSize=N    → default 50, max 200
//   ?all=1         → bypass pagination entirely (used by CSV / print export
//                    on the client to grab every row in one shot). Sets
//                    pageSize to MAX_ALL_PAGE_SIZE internally.
//
// Sort:
//   ?sortKey=...   → optional; falls back to spend DESC, name ASC.
//   ?sortDir=asc|desc
//
// Filter (applied AFTER aggregation, BEFORE pagination, so totals + total
// reflect the filtered set — which is what users see in the table):
//   ?platform=meta|google|ga4
//   ?q=<substring>   case-insensitive name match
//
// Defaults: startDate = today-29 days, endDate = today (so 30 days inclusive).

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
// `?all=1` cap. Generous but bounded to keep the response from blowing up if
// a client account ever ends up with tens of thousands of distinct campaigns.
const MAX_ALL_PAGE_SIZE = 10000;

type SortKey =
  | 'name'
  | 'platform'
  | 'status'
  | 'spend'
  | 'impressions'
  | 'clicks'
  | 'conversions'
  | 'revenue'
  | 'ctr'
  | 'cpc'
  | 'cpl'
  | 'roas';

const SORTABLE_KEYS: ReadonlyArray<SortKey> = [
  'name',
  'platform',
  'status',
  'spend',
  'impressions',
  'clicks',
  'conversions',
  'revenue',
  'ctr',
  'cpc',
  'cpl',
  'roas',
];
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

  // Pagination params (ignored when campaignKey is set — single-campaign
  // drill-down doesn't need pagination).
  const all = search.get('all') === '1';
  const pageRaw = Number(search.get('page') ?? 1);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const pageSizeRaw = Number(search.get('pageSize') ?? DEFAULT_PAGE_SIZE);
  const pageSizeClamp = all
    ? MAX_ALL_PAGE_SIZE
    : Math.min(
        MAX_PAGE_SIZE,
        Math.max(
          1,
          Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
            ? Math.floor(pageSizeRaw)
            : DEFAULT_PAGE_SIZE,
        ),
      );

  // Sort params
  const sortKeyParam = search.get('sortKey') as SortKey | null;
  const sortKey: SortKey =
    sortKeyParam && SORTABLE_KEYS.includes(sortKeyParam) ? sortKeyParam : 'spend';
  const sortDir: 'asc' | 'desc' = search.get('sortDir') === 'asc' ? 'asc' : 'desc';

  // Filter params
  const platformFilter = search.get('platform');
  const validPlatform: Platform | null =
    platformFilter === 'meta' || platformFilter === 'google' || platformFilter === 'ga4'
      ? platformFilter
      : null;
  const qParam = (search.get('q') || '').trim().toLowerCase();

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

  const allCampaigns: CampaignRow[] = aggResult.rows.map((row) => {
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

  // Apply filter (platform + name search) AFTER aggregation so totals and
  // `total` reflect the filtered set the user sees. Single-campaign drill-down
  // requests skip filter (campaignKey already targets one row).
  const filteredCampaigns = campaignKey
    ? allCampaigns
    : allCampaigns.filter((r) => {
        if (validPlatform && r.platform !== validPlatform) return false;
        if (qParam && !r.name.toLowerCase().includes(qParam)) return false;
        return true;
      });

  // Sort the filtered list, then paginate. Sorting in JS (rather than SQL
  // ORDER BY) keeps derived metrics (ctr/cpc/cpl/roas) sortable without
  // re-deriving them in SQL.
  filteredCampaigns.sort((a, b) => compareRows(a, b, sortKey, sortDir));

  const total = filteredCampaigns.length;

  // Totals are computed across ALL filtered campaigns — never just the
  // current page — so the footer stays correct under pagination.
  const totals: CampaignsTotals = filteredCampaigns.reduce<CampaignsTotals>(
    (acc, r) => {
      acc.spend += r.spend;
      acc.impressions += r.impressions;
      acc.clicks += r.clicks;
      acc.conversions += r.conversions;
      acc.revenue += r.revenue;
      acc.count += 1;
      return acc;
    },
    { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0, count: 0 },
  );

  const offset = (page - 1) * pageSizeClamp;
  const campaigns = filteredCampaigns.slice(offset, offset + pageSizeClamp);

  const response: CampaignsApiResponse = {
    campaigns,
    range: { startDate, endDate },
    total,
    page,
    pageSize: pageSizeClamp,
    totals,
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

function compareRows(
  a: CampaignRow,
  b: CampaignRow,
  key: SortKey,
  dir: 'asc' | 'desc',
): number {
  const av = a[key as keyof CampaignRow];
  const bv = b[key as keyof CampaignRow];
  let cmp = 0;
  if (av == null && bv == null) cmp = 0;
  else if (av == null) cmp = 1; // nulls last
  else if (bv == null) cmp = -1;
  else if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
  else cmp = String(av).localeCompare(String(bv), 'he');
  return dir === 'asc' ? cmp : -cmp;
}

function isoToday(): string {
  return new Date().toISOString().split('T')[0];
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}
