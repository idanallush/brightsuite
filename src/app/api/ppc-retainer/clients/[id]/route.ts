import { NextRequest } from 'next/server';
import { getTurso } from '@/lib/db/turso';
import {
  requirePpcAuth,
  json,
  apiError,
  mapClient,
} from '@/lib/ppc-retainer/api-helpers';

type Params = { params: Promise<{ id: string }> };

// PUT /api/ppc-retainer/clients/[id] — update full record (all fields optional;
// any omitted field keeps its current value)
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
  if (body.retainer != null) {
    sets.push('retainer = ?');
    args.push(Number(body.retainer) || 0);
  }
  if (typeof body.manager === 'string') {
    sets.push('manager = ?');
    args.push(body.manager);
  }
  if (Array.isArray(body.platforms)) {
    sets.push('platforms = ?');
    args.push(JSON.stringify((body.platforms as unknown[]).map((p) => String(p))));
  }
  if (body.meta != null) {
    sets.push('meta = ?');
    args.push(Math.max(0, Math.trunc(Number(body.meta) || 0)));
  }
  if (body.google != null) {
    sets.push('google = ?');
    args.push(Math.max(0, Math.trunc(Number(body.google) || 0)));
  }
  if (body.status === 'active' || body.status === 'archived') {
    sets.push('status = ?');
    args.push(body.status);
  }

  if (sets.length === 0) return apiError('No fields to update');
  sets.push("updated_at = datetime('now')");

  try {
    const db = getTurso();
    const result = await db.execute({
      sql: `UPDATE pr_clients SET ${sets.join(', ')} WHERE id = ? RETURNING *`,
      args: [...args, numericId],
    });
    if (result.rows.length === 0) return apiError('Not found', 404);
    return json(mapClient(result.rows[0]));
  } catch (err) {
    console.error('[ppc-retainer] PUT /clients/[id] error:', err);
    return apiError('Internal server error', 500);
  }
}

// DELETE /api/ppc-retainer/clients/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requirePpcAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return apiError('Invalid id');

  try {
    const db = getTurso();
    await db.execute({ sql: `DELETE FROM pr_clients WHERE id = ?`, args: [numericId] });
    return json({ ok: true });
  } catch (err) {
    console.error('[ppc-retainer] DELETE /clients/[id] error:', err);
    return apiError('Internal server error', 500);
  }
}
