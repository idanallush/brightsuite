import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/db/turso';

const toNum = (v: unknown) => typeof v === 'bigint' ? Number(v) : v;

// GET /api/writer/copy-archive?client_id=X — get archive items for a client + global items
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const client_id = searchParams.get('client_id');
  try {
    const db = getTurso();
    let result;
    if (client_id) {
      result = await db.execute({
        sql: 'SELECT * FROM copy_archive WHERE client_id = ? OR is_global = 1 ORDER BY created_at DESC',
        args: [client_id],
      });
    } else {
      result = await db.execute('SELECT * FROM copy_archive ORDER BY created_at DESC');
    }
    return NextResponse.json(result.rows.map((r) => ({ ...r, id: toNum(r.id), client_id: r.client_id ? toNum(r.client_id) : null })));
  } catch (err) {
    console.error('Copy archive GET error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// POST /api/writer/copy-archive — add a new archive item
export async function POST(request: NextRequest) {
  const { client_id, text, platform, notes, is_global } = await request.json();
  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }
  try {
    const db = getTurso();
    const result = await db.execute({
      sql: 'INSERT INTO copy_archive (client_id, text, platform, notes, is_global) VALUES (?, ?, ?, ?, ?)',
      args: [is_global ? null : (client_id || null), text.trim(), platform || '', notes || '', is_global ? 1 : 0],
    });
    return NextResponse.json({
      id: toNum(result.lastInsertRowid),
      client_id: is_global ? null : (client_id || null),
      text: text.trim(),
      platform: platform || '',
      notes: notes || '',
      is_global: is_global ? 1 : 0,
    });
  } catch (err) {
    console.error('Copy archive POST error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
