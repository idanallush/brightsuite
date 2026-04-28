import { NextRequest } from 'next/server';
import { getTurso } from '@/lib/db/turso';
import {
  requirePpcAuth,
  json,
  apiError,
  mapTeam,
} from '@/lib/ppc-retainer/api-helpers';

type Params = { params: Promise<{ id: string }> };

// PUT /api/ppc-retainer/team/[id] — update revenue / employer_cost for a team member
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
  if (body.revenue != null) {
    sets.push('revenue = ?');
    args.push(Number(body.revenue) || 0);
  }
  if (body.employerCost != null) {
    sets.push('employer_cost = ?');
    args.push(Number(body.employerCost) || 0);
  }
  if (typeof body.name === 'string') {
    sets.push('name = ?');
    args.push(body.name.trim());
  }
  if (sets.length === 0) return apiError('No fields to update');
  sets.push("updated_at = datetime('now')");

  try {
    const db = getTurso();
    const result = await db.execute({
      sql: `UPDATE pr_team SET ${sets.join(', ')} WHERE id = ? RETURNING *`,
      args: [...args, numericId],
    });
    if (result.rows.length === 0) return apiError('Not found', 404);
    return json(mapTeam(result.rows[0]));
  } catch (err) {
    console.error('[ppc-retainer] PUT /team/[id] error:', err);
    return apiError('Internal server error', 500);
  }
}
