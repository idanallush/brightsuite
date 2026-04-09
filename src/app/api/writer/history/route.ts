import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/db/turso';
import { requireApiAuth } from '@/lib/auth/require-auth-api';

// GET /api/writer/history — list generations (with client name), scoped to user
export async function GET(request: NextRequest) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  try {
    const db = getTurso();
    const { searchParams } = new URL(request.url);
    const client_id = searchParams.get('client_id');

    let sql = `
      SELECT g.*, c.name as client_name, c.initial as client_initial, c.color as client_color
      FROM generations g
      LEFT JOIN clients c ON g.client_id = c.id
    `;
    const args: (string | number)[] = [];
    const conditions: string[] = [];

    // Scope to user (admin sees all)
    if (session.role !== 'admin') {
      conditions.push('(g.created_by_user_id = ? OR g.created_by_user_id IS NULL)');
      args.push(session.userId);
    }

    if (client_id) {
      conditions.push('g.client_id = ?');
      args.push(client_id);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY g.created_at DESC';

    const result = await db.execute({ sql, args });
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// DELETE /api/writer/history — delete ALL generations and outputs (scoped to user)
export async function DELETE() {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  try {
    const db = getTurso();

    if (session.role === 'admin') {
      // Admin can delete all
      await db.execute('DELETE FROM generation_outputs');
      await db.execute('DELETE FROM generations');
    } else {
      // Delete only user's generations and their outputs
      await db.execute({
        sql: `DELETE FROM generation_outputs WHERE generation_id IN (
          SELECT id FROM generations WHERE created_by_user_id = ? OR created_by_user_id IS NULL
        )`,
        args: [session.userId],
      });
      await db.execute({
        sql: 'DELETE FROM generations WHERE created_by_user_id = ? OR created_by_user_id IS NULL',
        args: [session.userId],
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
