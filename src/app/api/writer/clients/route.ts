import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/db/turso';

const toNum = (v: unknown): number => typeof v === 'bigint' ? Number(v) : v as number;

// GET /api/writer/clients — list all clients
export async function GET() {
  try {
    const db = getTurso();
    const result = await db.execute('SELECT * FROM clients ORDER BY created_at ASC');
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// POST /api/writer/clients — create client
export async function POST(request: NextRequest) {
  const { name, initial, color, about, website, logo, winning_ads, avoid_notes } = await request.json();
  if (!name || !initial) {
    return NextResponse.json({ error: 'name and initial are required' }, { status: 400 });
  }
  try {
    const db = getTurso();
    const result = await db.execute({
      sql: 'INSERT INTO clients (name, initial, color, about, website, logo, winning_ads, avoid_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [name, initial, color || 'bg-gray-400', about || '', website || '', logo || '', winning_ads || '', avoid_notes || ''],
    });
    const client = await db.execute({ sql: 'SELECT * FROM clients WHERE id = ?', args: [toNum(result.lastInsertRowid)] });
    return NextResponse.json(client.rows[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
