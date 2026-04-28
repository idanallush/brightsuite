import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';
import type { ClientSummary } from '@/lib/clients-dashboard/types';

// GET /api/clients-dashboard/clients?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Returns each active client with its KPIs aggregated over the date range,
// connection flags, and open-alert count. Drives the list page.
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const search = request.nextUrl.searchParams;
  const startDate = search.get('startDate') || getMonthStart();
  const endDate = search.get('endDate') || getToday();

  const db = getTurso();

  const result = await db.execute({
    sql: `
      SELECT
        c.id,
        c.name,
        c.slug,
        c.metric_type,
        c.currency,
        c.is_active,
        c.meta_account_id,
        c.google_customer_id,
        c.ga4_property_id,
        COALESCE(p.spend, 0) AS total_spend,
        COALESCE(p.impressions, 0) AS total_impressions,
        COALESCE(p.clicks, 0) AS total_clicks,
        COALESCE(p.conversions, 0) AS total_conversions,
        COALESCE(p.revenue, 0) AS total_revenue,
        COALESCE(a.open_alerts, 0) AS open_alerts,
        s.last_sync_at
      FROM ah_clients c
      LEFT JOIN (
        SELECT client_id,
               SUM(spend) AS spend,
               SUM(impressions) AS impressions,
               SUM(clicks) AS clicks,
               SUM(conversions) AS conversions,
               SUM(revenue) AS revenue
        FROM ah_performance_daily
        WHERE date BETWEEN ? AND ?
        GROUP BY client_id
      ) p ON p.client_id = c.id
      LEFT JOIN (
        SELECT client_id, COUNT(*) AS open_alerts
        FROM cd_alerts
        WHERE status = 'open'
        GROUP BY client_id
      ) a ON a.client_id = c.id
      LEFT JOIN (
        SELECT client_id, MAX(completed_at) AS last_sync_at
        FROM ah_sync_log
        WHERE status = 'success'
        GROUP BY client_id
      ) s ON s.client_id = c.id
      WHERE c.is_active = 1
      ORDER BY total_spend DESC, c.name ASC
    `,
    args: [startDate, endDate],
  });

  const clients: ClientSummary[] = result.rows.map((row) => {
    const spend = Number(row.total_spend ?? 0);
    const clicks = Number(row.total_clicks ?? 0);
    const impressions = Number(row.total_impressions ?? 0);
    const conversions = Number(row.total_conversions ?? 0);
    const revenue = Number(row.total_revenue ?? 0);
    const metricType = (row.metric_type as 'leads' | 'ecommerce' | null) ?? 'leads';

    return {
      id: Number(row.id),
      name: String(row.name),
      slug: String(row.slug),
      metricType,
      currency: (row.currency as string) ?? 'ILS',
      isActive: Number(row.is_active ?? 0) === 1,
      hasMeta: Boolean(row.meta_account_id),
      hasGoogle: Boolean(row.google_customer_id),
      hasGa4: Boolean(row.ga4_property_id),
      totalSpend: spend,
      totalImpressions: impressions,
      totalClicks: clicks,
      totalConversions: conversions,
      totalRevenue: revenue,
      cpl: conversions > 0 ? spend / conversions : null,
      roas: spend > 0 ? revenue / spend : null,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
      cpc: clicks > 0 ? spend / clicks : null,
      openAlerts: Number(row.open_alerts ?? 0),
      lastSyncAt: (row.last_sync_at as string | null) ?? null,
    };
  });

  return NextResponse.json({ clients, range: { startDate, endDate } });
}

function getMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}
