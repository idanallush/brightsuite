import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/db/turso';
import { requireApiAuth } from '@/lib/auth/require-auth-api';

// GET /api/writer/history/:id — single generation with outputs (scoped to user)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const { id } = await params;
  try {
    const db = getTurso();

    // Build query with user scope
    let sql = `
      SELECT g.*, c.name as client_name
      FROM generations g
      LEFT JOIN clients c ON g.client_id = c.id
      WHERE g.id = ?
    `;
    const args: (string | number)[] = [id];

    if (session.role !== 'admin') {
      sql += ' AND (g.created_by_user_id = ? OR g.created_by_user_id IS NULL)';
      args.push(session.userId);
    }

    const genResult = await db.execute({ sql, args });

    if (genResult.rows.length === 0) return NextResponse.json({ error: 'Generation not found' }, { status: 404 });

    const outputs = await db.execute({
      sql: 'SELECT * FROM generation_outputs WHERE generation_id = ? ORDER BY platform, section',
      args: [id],
    });

    return NextResponse.json({ ...genResult.rows[0], outputs: outputs.rows });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// DELETE /api/writer/history/:id — delete a single generation and its outputs (scoped to user)
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
        sql: 'SELECT id FROM generations WHERE id = ? AND (created_by_user_id = ? OR created_by_user_id IS NULL)',
        args: [id, session.userId],
      });
      if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
      }
    }

    await db.execute({ sql: 'DELETE FROM generation_outputs WHERE generation_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM generations WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
