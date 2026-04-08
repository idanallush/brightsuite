import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/db/turso';

// GET /api/writer/history — list generations (with client name)
export async function GET(request: NextRequest) {
  try {
    const db = getTurso();
    const { searchParams } = new URL(request.url);
    const client_id = searchParams.get('client_id');
    let sql = `
      SELECT g.*, c.name as client_name, c.initial as client_initial, c.color as client_color
      FROM generations g
      LEFT JOIN clients c ON g.client_id = c.id
    `;
    const args: string[] = [];
    if (client_id) {
      sql += ' WHERE g.client_id = ?';
      args.push(client_id);
    }
    sql += ' ORDER BY g.created_at DESC';

    const result = await db.execute({ sql, args });
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// DELETE /api/writer/history — delete ALL generations and outputs
export async function DELETE() {
  try {
    const db = getTurso();
    await db.execute('DELETE FROM generation_outputs');
    await db.execute('DELETE FROM generations');
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
