import { NextRequest } from 'next/server';
import { getTurso } from '@/lib/db/turso';
import {
  requirePpcAuth,
  json,
  apiError,
  mapExpense,
} from '@/lib/ppc-retainer/api-helpers';

// POST /api/ppc-retainer/expenses
export async function POST(req: NextRequest) {
  const auth = await requirePpcAuth();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return apiError('Invalid body');

  const name = String(body.name ?? '').trim();
  if (!name) return apiError('שם ההוצאה חסר');
  const amount = Number(body.amount) || 0;
  const note = String(body.note ?? '');
  const category = String(body.category ?? '').trim() || 'Tools';

  try {
    const db = getTurso();
    const result = await db.execute({
      sql: `INSERT INTO pr_expenses (name, amount, note, category)
            VALUES (?, ?, ?, ?) RETURNING *`,
      args: [name, amount, note, category],
    });
    return json(mapExpense(result.rows[0]), 201);
  } catch (err) {
    console.error('[ppc-retainer] POST /expenses error:', err);
    return apiError('Internal server error', 500);
  }
}
