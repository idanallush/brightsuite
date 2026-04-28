import { NextRequest } from 'next/server';
import { getTurso } from '@/lib/db/turso';
import {
  requirePpcAuth,
  json,
  apiError,
  mapExpense,
} from '@/lib/ppc-retainer/api-helpers';

type Params = { params: Promise<{ id: string }> };

// PUT /api/ppc-retainer/expenses/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requirePpcAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return apiError('Invalid id');

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return apiError('Invalid body');

  const sets: string[] = [];
  const args: (string | number)[] = [];
  if (typeof body.name === 'string') {
    sets.push('name = ?');
    args.push(body.name.trim());
  }
  if (body.amount != null) {
    sets.push('amount = ?');
    args.push(Number(body.amount) || 0);
  }
  if (typeof body.note === 'string') {
    sets.push('note = ?');
    args.push(body.note);
  }
  if (typeof body.category === 'string') {
    sets.push('category = ?');
    args.push(body.category);
  }
  if (sets.length === 0) return apiError('No fields to update');
  sets.push("updated_at = datetime('now')");

  try {
    const db = getTurso();
    const result = await db.execute({
      sql: `UPDATE pr_expenses SET ${sets.join(', ')} WHERE id = ? RETURNING *`,
      args: [...args, numericId],
    });
    if (result.rows.length === 0) return apiError('Not found', 404);
    return json(mapExpense(result.rows[0]));
  } catch (err) {
    console.error('[ppc-retainer] PUT /expenses/[id] error:', err);
    return apiError('Internal server error', 500);
  }
}

// DELETE /api/ppc-retainer/expenses/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requirePpcAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return apiError('Invalid id');

  try {
    const db = getTurso();
    await db.execute({ sql: `DELETE FROM pr_expenses WHERE id = ?`, args: [numericId] });
    return json({ ok: true });
  } catch (err) {
    console.error('[ppc-retainer] DELETE /expenses/[id] error:', err);
    return apiError('Internal server error', 500);
  }
}
