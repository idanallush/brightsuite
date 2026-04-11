import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';

// GET /api/ads-hub/clients/[clientId] — client detail with KPIs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const { clientId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get('startDate') || getMonthStart();
  const endDate = searchParams.get('endDate') || getToday();
  const platform = searchParams.get('platform'); // optional filter

  const db = getTurso();

  // Client info
  const clientResult = await db.execute({
    sql: 'SELECT * FROM ah_clients WHERE id = ?',
    args: [clientId],
  });
  if (clientResult.rows.length === 0) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Aggregated KPIs
  const platformFilter = platform ? 'AND p.platform = ?' : '';
  const kpiArgs: (string | number)[] = [clientId, startDate, endDate];
  if (platform) kpiArgs.push(platform);

  const kpiResult = await db.execute({
    sql: `
      SELECT
        COALESCE(SUM(p.spend), 0) as total_spend,
        COALESCE(SUM(p.impressions), 0) as total_impressions,
        COALESCE(SUM(p.clicks), 0) as total_clicks,
        COALESCE(SUM(p.conversions), 0) as total_conversions,
        CASE WHEN SUM(p.conversions) > 0 THEN SUM(p.spend) / SUM(p.conversions) ELSE NULL END as cpl,
        CASE WHEN SUM(p.clicks) > 0 THEN SUM(p.spend) / SUM(p.clicks) ELSE NULL END as cpc,
        CASE WHEN SUM(p.impressions) > 0 THEN (CAST(SUM(p.clicks) AS REAL) / SUM(p.impressions)) * 100 ELSE NULL END as ctr
      FROM ah_performance_daily p
      WHERE p.client_id = ? AND p.date BETWEEN ? AND ? ${platformFilter}
    `,
    args: kpiArgs,
  });

  return NextResponse.json({
    client: clientResult.rows[0],
    kpis: kpiResult.rows[0],
  });
}

// PUT /api/ads-hub/clients/[clientId] — update client
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;
  if (auth.session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { clientId } = await params;
  const body = await request.json();
  const { name, metaAccountId, googleCustomerId, googleMccId, ga4PropertyId, currency, isActive, metricType } = body;

  const db = getTurso();

  await db.execute({
    sql: `UPDATE ah_clients SET
            name = COALESCE(?, name),
            meta_account_id = COALESCE(?, meta_account_id),
            google_customer_id = COALESCE(?, google_customer_id),
            google_mcc_id = COALESCE(?, google_mcc_id),
            ga4_property_id = COALESCE(?, ga4_property_id),
            currency = COALESCE(?, currency),
            metric_type = COALESCE(?, metric_type),
            is_active = COALESCE(?, is_active),
            updated_at = datetime('now')
          WHERE id = ?`,
    args: [
      name || null,
      metaAccountId || null,
      googleCustomerId?.replace(/-/g, '') || null,
      googleMccId?.replace(/-/g, '') || null,
      ga4PropertyId || null,
      currency || null,
      metricType === 'ecommerce' || metricType === 'leads' ? metricType : null,
      isActive !== undefined ? (isActive ? 1 : 0) : null,
      clientId,
    ],
  });

  const updated = await db.execute({
    sql: 'SELECT * FROM ah_clients WHERE id = ?',
    args: [clientId],
  });

  return NextResponse.json({ client: updated.rows[0] });
}

// DELETE /api/ads-hub/clients/[clientId] — delete client
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;
  if (auth.session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { clientId } = await params;
  const db = getTurso();

  await db.execute({
    sql: 'DELETE FROM ah_clients WHERE id = ?',
    args: [clientId],
  });

  return NextResponse.json({ success: true });
}

function getMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}
