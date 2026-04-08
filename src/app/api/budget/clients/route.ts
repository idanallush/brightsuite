import { NextRequest } from 'next/server';
import { getTurso } from '@/lib/db/turso';
import { requireBudgetAuth, json, error } from '@/lib/budget/api-helpers';

// GET /api/budget/clients — list active clients
export async function GET() {
  const auth = await requireBudgetAuth();
  if (auth.error) return auth.error;

  try {
    const db = getTurso();
    const result = await db.execute(
      'SELECT * FROM bf_clients WHERE is_active = 1 ORDER BY name'
    );

    return json(result.rows);
  } catch (err) {
    console.error('Get clients error:', err);
    return error('Internal server error', 500);
  }
}

// POST /api/budget/clients — create a new client
export async function POST(request: NextRequest) {
  const auth = await requireBudgetAuth();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const { name, slug, share_token, notes } = body ?? {};
  if (!name || !slug || !share_token) {
    return error('Name, slug, and share_token are required');
  }

  try {
    const db = getTurso();
    const result = await db.execute({
      sql: `INSERT INTO bf_clients (name, slug, share_token, notes) VALUES (?, ?, ?, ?) RETURNING *`,
      args: [name, slug, share_token, notes ?? null],
    });

    return json(result.rows[0], 201);
  } catch (err) {
    console.error('Create client error:', err);
    return error('Internal server error', 500);
  }
}
