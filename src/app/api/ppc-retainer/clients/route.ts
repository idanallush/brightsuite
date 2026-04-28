import { NextRequest } from 'next/server';
import { getTurso } from '@/lib/db/turso';
import {
  requirePpcAuth,
  json,
  apiError,
  mapClient,
} from '@/lib/ppc-retainer/api-helpers';

// POST /api/ppc-retainer/clients — create a new retainer client
export async function POST(req: NextRequest) {
  const auth = await requirePpcAuth();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return apiError('Invalid body');

  const name = String(body.name ?? '').trim();
  if (!name) return apiError('שם הלקוח חסר');

  const retainer = Number(body.retainer) || 0;
  const manager = String(body.manager ?? '').trim() || 'עידן';
  const platforms = Array.isArray(body.platforms)
    ? (body.platforms as unknown[]).map((p) => String(p))
    : [];
  const meta = Math.max(0, Math.trunc(Number(body.meta) || 0));
  const google = Math.max(0, Math.trunc(Number(body.google) || 0));
  const status: 'active' | 'archived' = body.status === 'archived' ? 'archived' : 'active';

  try {
    const db = getTurso();
    const result = await db.execute({
      sql: `INSERT INTO pr_clients (name, retainer, manager, platforms, meta, google, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            RETURNING *`,
      args: [name, retainer, manager, JSON.stringify(platforms), meta, google, status],
    });
    return json(mapClient(result.rows[0]), 201);
  } catch (err) {
    console.error('[ppc-retainer] POST /clients error:', err);
    return apiError('Internal server error', 500);
  }
}
