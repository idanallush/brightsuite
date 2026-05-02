import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';
import type { CampaignChangeRecord } from '@/lib/clients-dashboard/types';

// GET /api/clients-dashboard/history?clientId=X&campaignId=Y&startDate=Z&endDate=W&page=N&pageSize=M
// Returns the campaign change timeline (joined with ah_campaigns.name) plus a
// daily time-series of spend / conversions / revenue for the chart.
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const search = request.nextUrl.searchParams;
  const clientId = search.get('clientId');
  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  const campaignId = search.get('campaignId');
  const startDate = search.get('startDate') || defaultStart();
  const endDate = search.get('endDate') || todayYmd();

  const pageRaw = Number(search.get('page'));
  const pageSizeRaw = Number(search.get('pageSize'));
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
    ? Math.min(500, Math.floor(pageSizeRaw))
    : 100;
  const offset = (page - 1) * pageSize;

  const db = getTurso();

  // Campaign list — used by the dropdown in the UI.
  const campaignsResult = await db.execute({
    sql: `SELECT id, name, platform, platform_campaign_id, status
          FROM ah_campaigns WHERE client_id = ?
          ORDER BY name`,
    args: [clientId],
  });

  // Change timeline.
  const filterArgs: (string | number)[] = [clientId, startDate, endDate];
  let campaignFilter = '';
  if (campaignId) {
    campaignFilter = ' AND ch.campaign_id = ?';
    filterArgs.push(campaignId);
  }

  // Total count for pagination footer.
  const countResult = await db.execute({
    sql: `
      SELECT COUNT(*) AS total
      FROM cd_campaign_changes ch
      WHERE ch.client_id = ?
        AND date(ch.detected_at) BETWEEN ? AND ?
        ${campaignFilter}
    `,
    args: filterArgs,
  });
  const total = Number(countResult.rows[0]?.total ?? 0);

  const changesResult = await db.execute({
    sql: `
      SELECT
        ch.id, ch.client_id, ch.campaign_id, ch.platform, ch.platform_campaign_id,
        ch.change_type, ch.field, ch.old_value, ch.new_value, ch.source,
        ch.user_id, ch.detected_at, ch.note,
        c.name AS campaign_name,
        u.name AS user_name
      FROM cd_campaign_changes ch
      LEFT JOIN ah_campaigns c ON c.id = ch.campaign_id
      LEFT JOIN bs_users u ON u.id = ch.user_id
      WHERE ch.client_id = ?
        AND date(ch.detected_at) BETWEEN ? AND ?
        ${campaignFilter}
      ORDER BY ch.detected_at DESC
      LIMIT ? OFFSET ?
    `,
    args: [...filterArgs, pageSize, offset],
  });

  const changes = changesResult.rows.map((row) => ({
    id: Number(row.id),
    clientId: Number(row.client_id),
    campaignId: row.campaign_id != null ? Number(row.campaign_id) : null,
    platform: String(row.platform),
    platformCampaignId: (row.platform_campaign_id as string | null) ?? null,
    changeType: String(row.change_type),
    field: (row.field as string | null) ?? null,
    oldValue: (row.old_value as string | null) ?? null,
    newValue: (row.new_value as string | null) ?? null,
    source: row.source as CampaignChangeRecord['source'],
    userId: row.user_id != null ? Number(row.user_id) : null,
    detectedAt: String(row.detected_at),
    note: (row.note as string | null) ?? null,
    campaignName: (row.campaign_name as string | null) ?? null,
    userName: (row.user_name as string | null) ?? null,
  }));

  // Time-series. If a campaign is selected we filter by its platform +
  // platform_campaign_id (ah_performance_daily uses platform-keyed ids).
  const seriesArgs: (string | number)[] = [clientId, startDate, endDate];
  let seriesFilter = '';
  if (campaignId) {
    const cmp = campaignsResult.rows.find((r) => Number(r.id) === Number(campaignId));
    if (cmp) {
      seriesFilter = ' AND p.platform = ? AND p.campaign_id = ?';
      seriesArgs.push(String(cmp.platform), String(cmp.platform_campaign_id));
    }
  }

  const seriesResult = await db.execute({
    sql: `
      SELECT p.date,
             SUM(p.spend) AS spend,
             SUM(p.conversions) AS conversions,
             SUM(p.revenue) AS revenue
      FROM ah_performance_daily p
      WHERE p.client_id = ?
        AND p.date BETWEEN ? AND ?
        ${seriesFilter}
      GROUP BY p.date
      ORDER BY p.date ASC
    `,
    args: seriesArgs,
  });

  const series = seriesResult.rows.map((row) => ({
    date: String(row.date),
    spend: Number(row.spend ?? 0),
    conversions: Number(row.conversions ?? 0),
    revenue: Number(row.revenue ?? 0),
  }));

  return NextResponse.json({
    changes,
    total,
    page,
    pageSize,
    series,
    campaigns: campaignsResult.rows.map((r) => ({
      id: Number(r.id),
      name: String(r.name),
      platform: String(r.platform),
      platformCampaignId: (r.platform_campaign_id as string | null) ?? null,
      status: (r.status as string | null) ?? null,
    })),
    range: { startDate, endDate },
  });
}

function todayYmd(): string {
  return new Date().toISOString().split('T')[0];
}

function defaultStart(): string {
  // Default to last 90 days so the chart shows ~3 months by default.
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 90);
  return d.toISOString().split('T')[0];
}
