import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';

// GET /api/ads-hub/clients — list all clients with aggregated KPIs
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get('startDate') || getMonthStart();
  const endDate = searchParams.get('endDate') || getToday();

  const db = getTurso();

  const result = await db.execute({
    sql: `
      SELECT
        c.*,
        COALESCE(SUM(p.spend), 0) as total_spend,
        COALESCE(SUM(p.impressions), 0) as total_impressions,
        COALESCE(SUM(p.clicks), 0) as total_clicks,
        COALESCE(SUM(p.conversions), 0) as total_conversions,
        CASE WHEN SUM(p.conversions) > 0 THEN SUM(p.spend) / SUM(p.conversions) ELSE NULL END as cpl
      FROM ah_clients c
      LEFT JOIN ah_performance_daily p ON p.client_id = c.id AND p.date BETWEEN ? AND ?
      WHERE c.is_active = 1
      GROUP BY c.id
      ORDER BY total_spend DESC
    `,
    args: [startDate, endDate],
  });

  return NextResponse.json({ clients: result.rows });
}

// POST /api/ads-hub/clients — create a new client
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;
  if (auth.session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { name, slug, metaAccountId, googleCustomerId, googleMccId, ga4PropertyId, currency, metricType } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
  }

  const db = getTurso();

  try {
    const result = await db.execute({
      sql: `INSERT INTO ah_clients (name, slug, meta_account_id, google_customer_id, google_mcc_id, ga4_property_id, currency, metric_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        name,
        slug,
        metaAccountId || null,
        googleCustomerId?.replace(/-/g, '') || null,
        googleMccId?.replace(/-/g, '') || null,
        ga4PropertyId || null,
        currency || 'ILS',
        metricType === 'ecommerce' ? 'ecommerce' : 'leads',
      ],
    });

    return NextResponse.json({ client: result.rows[0] }, { status: 201 });
  } catch (err) {
    if ((err as Error).message.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Client slug already exists' }, { status: 409 });
    }
    throw err;
  }
}

function getMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}
