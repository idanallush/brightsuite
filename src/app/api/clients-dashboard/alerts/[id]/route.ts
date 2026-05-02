import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';
import type { AlertStatus } from '@/lib/clients-dashboard/types';

// Allowed status transitions. Same status is rejected, as is any combo
// not listed below. Hebrew copy below mirrors this list exactly.
const ALLOWED_TRANSITIONS: Record<AlertStatus, AlertStatus[]> = {
  open: ['acknowledged', 'resolved'],
  acknowledged: ['resolved', 'open'],
  resolved: ['open'],
};

const STATUS_LABEL_HE: Record<AlertStatus, string> = {
  open: 'פתוח',
  acknowledged: 'אושר',
  resolved: 'פתור',
};

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
      { error: 'סטטוס חייב להיות פתוח, אושר או פתור' },
      { status: 400 }
    );
  }

  const db = getTurso();
  const userId = auth.session.userId;

  // Read the current status before the update so we can validate the
  // transition. One query, then the UPDATE — no race-y read-modify-write
  // logic since we constrain on id alone.
  const existing = await db.execute({
    sql: `SELECT status FROM cd_alerts WHERE id = ?`,
    args: [id],
  });
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: 'ההתראה לא נמצאה' }, { status: 404 });
  }
  const current = existing.rows[0].status as AlertStatus;

  if (current === next) {
    return NextResponse.json(
      {
        error: `ההתראה כבר במצב "${STATUS_LABEL_HE[current]}"`,
      },
      { status: 400 }
    );
  }
  const allowed = ALLOWED_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    const allowedLabels = allowed.map((s) => `"${STATUS_LABEL_HE[s]}"`).join(', ');
    return NextResponse.json(
      {
        error: `לא ניתן לשנות סטטוס מ-"${STATUS_LABEL_HE[current]}" ל-"${STATUS_LABEL_HE[next]}". מעברים מותרים: ${allowedLabels || 'אין'}`,
      },
      { status: 400 }
    );
  }

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
    return NextResponse.json({ error: 'ההתראה לא נמצאה' }, { status: 404 });
  }

  return NextResponse.json({ alert: updated.rows[0] });
}
