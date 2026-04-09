import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';

// GET /api/ads-hub/performance — daily performance data
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get('clientId');
  const startDate = searchParams.get('startDate') || getMonthStart();
  const endDate = searchParams.get('endDate') || getToday();
  const platform = searchParams.get('platform');

  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  const db = getTurso();

  const conditions = ['p.client_id = ?', 'p.date BETWEEN ? AND ?'];
  const args: (string | number)[] = [clientId, startDate, endDate];

  if (platform) {
    conditions.push('p.platform = ?');
    args.push(platform);
  }

  const result = await db.execute({
    sql: `
      SELECT
        p.date,
        SUM(p.impressions) as impressions,
        SUM(p.clicks) as clicks,
        SUM(p.conversions) as conversions,
        SUM(p.spend) as spend,
        CASE WHEN SUM(p.clicks) > 0 THEN SUM(p.spend) / SUM(p.clicks) ELSE NULL END as cpc,
        CASE WHEN SUM(p.impressions) > 0 THEN (CAST(SUM(p.clicks) AS REAL) / SUM(p.impressions)) * 100 ELSE NULL END as ctr,
        CASE WHEN SUM(p.conversions) > 0 THEN SUM(p.spend) / SUM(p.conversions) ELSE NULL END as cpl
      FROM ah_performance_daily p
      WHERE ${conditions.join(' AND ')}
      GROUP BY p.date
      ORDER BY p.date ASC
    `,
    args,
  });

  return NextResponse.json({ data: result.rows });
}

function getMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}
