import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';
import type { MetricType } from '@/lib/clients-dashboard/types';

// PATCH /api/clients-dashboard/clients/[id]
// Body: { metricType: 'leads' | 'ecommerce' }
// Admin-only. Updates the client's metric_type so the dashboard surfaces
// the correct primary KPI (CPL for leads, ROAS for ecommerce).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;
  if (auth.session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { metricType?: MetricType };
  const next = body.metricType;
  if (next !== 'leads' && next !== 'ecommerce') {
    return NextResponse.json(
      { error: "metricType must be 'leads' or 'ecommerce'" },
      { status: 400 },
    );
  }

  const db = getTurso();
  const result = await db.execute({
    sql: `UPDATE ah_clients
          SET metric_type = ?, updated_at = datetime('now')
          WHERE id = ?`,
    args: [next, id],
  });

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  return NextResponse.json({ id: Number(id), metricType: next });
}

// PUT /api/clients-dashboard/clients/[id] — full client update from settings UI
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;
  if (auth.session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id } = await params;
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
      id,
    ],
  });

  const updated = await db.execute({
    sql: 'SELECT * FROM ah_clients WHERE id = ?',
    args: [id],
  });

  return NextResponse.json({ client: updated.rows[0] });
}

// DELETE /api/clients-dashboard/clients/[id] — delete client
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;
  if (auth.session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id } = await params;
  const db = getTurso();

  await db.execute({
    sql: 'DELETE FROM ah_clients WHERE id = ?',
    args: [id],
  });

  return NextResponse.json({ success: true });
}
