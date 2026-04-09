import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/db/turso';
import { requireApiAuth } from '@/lib/auth/require-auth-api';

// DELETE /api/writer/copy-archive/:id — delete an archive item (scoped to owner or admin)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const { id } = await params;
  try {
    const db = getTurso();

    // Verify ownership (admin can delete any)
    if (session.role !== 'admin') {
      const check = await db.execute({
        sql: 'SELECT id FROM copy_archive WHERE id = ? AND (created_by_user_id = ? OR created_by_user_id IS NULL)',
        args: [id, session.userId],
      });
      if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Archive item not found' }, { status: 404 });
      }
    }

    await db.execute({ sql: 'DELETE FROM copy_archive WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Copy archive DELETE error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
