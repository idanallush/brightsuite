import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';

// GET /api/ads-hub/campaigns — campaigns with aggregated metrics
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get('clientId');
  const platform = searchParams.get('platform');
  const startDate = searchParams.get('startDate') || getMonthStart();
  const endDate = searchParams.get('endDate') || getToday();

  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  const db = getTurso();

  const conditions = ['c.client_id = ?'];
  const args: (string | number)[] = [Number(clientId)];

  if (platform) {
    conditions.push('c.platform = ?');
    args.push(platform);
  }

  // Add date range args at end
  args.push(startDate, endDate);

  const result = await db.execute({
    sql: `
      SELECT
        c.*,
        COALESCE(SUM(p.spend), 0) as total_spend,
        COALESCE(SUM(p.impressions), 0) as total_impressions,
        COALESCE(SUM(p.clicks), 0) as total_clicks,
        COALESCE(SUM(p.conversions), 0) as total_conversions,
        CASE WHEN SUM(p.conversions) > 0 THEN SUM(p.spend) / SUM(p.conversions) ELSE NULL END as cpl
      FROM ah_campaigns c
      LEFT JOIN ah_performance_daily p
        ON p.campaign_id = c.platform_campaign_id
        AND p.platform = c.platform
        AND p.date BETWEEN ? AND ?
      WHERE ${conditions.join(' AND ')}
      GROUP BY c.id
      ORDER BY total_spend DESC
    `,
    args,
  });

  return NextResponse.json({ campaigns: result.rows });
}

function getMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}
