import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';

// POST /api/clients-dashboard/clients/[id]/restore — un-archive a client
// Admin-only. Flips is_active back to 1 and writes a matching
// cd_client_changes audit row in the same db.batch.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;
  if (auth.session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return NextResponse.json({ error: 'מזהה לקוח לא תקין' }, { status: 400 });
  }

  const db = getTurso();
  const current = await db.execute({
    sql: 'SELECT id, is_active FROM ah_clients WHERE id = ?',
    args: [numericId],
  });
  if (current.rows.length === 0) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }
  const wasActive = Number(current.rows[0].is_active ?? 0) === 1;
  if (wasActive) {
    return NextResponse.json({ success: true, alreadyActive: true });
  }

  await db.batch([
    {
      sql: `UPDATE ah_clients
            SET is_active = 1, updated_at = datetime('now')
            WHERE id = ?`,
      args: [numericId],
    },
    {
      sql: `INSERT INTO cd_client_changes
            (client_id, field, old_value, new_value, user_id, source, note)
            VALUES (?, 'is_active', '0', '1', ?, 'user', NULL)`,
      args: [numericId, auth.session.userId ?? null],
    },
  ]);

  return NextResponse.json({ success: true });
}
