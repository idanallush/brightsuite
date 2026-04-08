import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/db/turso';

// GET /api/writer/history/:id — single generation with outputs
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const db = getTurso();
    const genResult = await db.execute({
      sql: `
        SELECT g.*, c.name as client_name
        FROM generations g
        LEFT JOIN clients c ON g.client_id = c.id
        WHERE g.id = ?
      `,
      args: [id],
    });

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

// DELETE /api/writer/history/:id — delete a single generation and its outputs
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const db = getTurso();
    await db.execute({ sql: 'DELETE FROM generation_outputs WHERE generation_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM generations WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
