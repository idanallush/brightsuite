import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/db/turso';

// GET /api/writer/clients/:id — single client
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const db = getTurso();
    const result = await db.execute({ sql: 'SELECT * FROM clients WHERE id = ?', args: [id] });
    if (result.rows.length === 0) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// PUT /api/writer/clients/:id — update client
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, initial, color, about, website, logo, winning_ads, avoid_notes } = await request.json();
  try {
    const db = getTurso();
    const existing = await db.execute({ sql: 'SELECT * FROM clients WHERE id = ?', args: [id] });
    if (existing.rows.length === 0) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    const ex = existing.rows[0];

    await db.execute({
      sql: 'UPDATE clients SET name = ?, initial = ?, color = ?, about = ?, website = ?, logo = ?, winning_ads = ?, avoid_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [
        name || ex.name,
        initial || ex.initial,
        color || ex.color,
        about !== undefined ? about : ex.about,
        website !== undefined ? website : ex.website,
        logo !== undefined ? logo : ((ex.logo as string) || ''),
        winning_ads !== undefined ? winning_ads : ((ex.winning_ads as string) || ''),
        avoid_notes !== undefined ? avoid_notes : ((ex.avoid_notes as string) || ''),
        id,
      ],
    });

    const client = await db.execute({ sql: 'SELECT * FROM clients WHERE id = ?', args: [id] });
    return NextResponse.json(client.rows[0]);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// DELETE /api/writer/clients/:id — delete client
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const db = getTurso();
    const existing = await db.execute({ sql: 'SELECT * FROM clients WHERE id = ?', args: [id] });
    if (existing.rows.length === 0) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    await db.execute({ sql: 'DELETE FROM clients WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
