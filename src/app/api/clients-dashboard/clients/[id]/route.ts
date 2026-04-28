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
