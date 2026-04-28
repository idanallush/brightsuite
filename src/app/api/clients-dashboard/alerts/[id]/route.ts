import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';
import type { AlertStatus } from '@/lib/clients-dashboard/types';

// PATCH /api/clients-dashboard/alerts/[id]
// Body: { status: 'acknowledged' | 'resolved' | 'open' }
// Sets acknowledged_by from session and the relevant timestamp.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { status?: AlertStatus };
  const next = body.status;
  if (next !== 'acknowledged' && next !== 'resolved' && next !== 'open') {
    return NextResponse.json(
      { error: 'status must be acknowledged | resolved | open' },
      { status: 400 }
    );
  }

  const db = getTurso();
  const userId = auth.session.userId;

  if (next === 'acknowledged') {
    await db.execute({
      sql: `UPDATE cd_alerts
            SET status = 'acknowledged', acknowledged_by = ?, acknowledged_at = datetime('now')
            WHERE id = ?`,
      args: [userId, id],
    });
  } else if (next === 'resolved') {
    await db.execute({
      sql: `UPDATE cd_alerts
            SET status = 'resolved', resolved_at = datetime('now')
            WHERE id = ?`,
      args: [id],
    });
  } else {
    // re-open
    await db.execute({
      sql: `UPDATE cd_alerts
            SET status = 'open', acknowledged_by = NULL, acknowledged_at = NULL, resolved_at = NULL
            WHERE id = ?`,
      args: [id],
    });
  }

  const updated = await db.execute({
    sql: `SELECT id, client_id, campaign_id, platform, severity, kind, title, detail,
                 metric_value, threshold_value, status, acknowledged_by, acknowledged_at,
                 resolved_at, created_at
          FROM cd_alerts WHERE id = ?`,
    args: [id],
  });

  if (updated.rows.length === 0) {
    return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
  }

  return NextResponse.json({ alert: updated.rows[0] });
}
