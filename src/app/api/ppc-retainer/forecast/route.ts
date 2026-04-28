import { NextRequest } from 'next/server';
import { getTurso } from '@/lib/db/turso';
import {
  requirePpcAuth,
  json,
  apiError,
  mapForecast,
} from '@/lib/ppc-retainer/api-helpers';

// PUT /api/ppc-retainer/forecast — upsert the singleton forecast row
export async function PUT(req: NextRequest) {
  const auth = await requirePpcAuth();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return apiError('Invalid body');

  const newMonthly = Number(body.newMonthly) || 0;
  const churnMonthly = Number(body.churnMonthly) || 0;
  const raisePct = Number(body.raisePct) || 0;

  try {
    const db = getTurso();
    const result = await db.execute({
      sql: `INSERT INTO pr_forecast (id, new_monthly, churn_monthly, raise_pct)
            VALUES (1, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              new_monthly = excluded.new_monthly,
              churn_monthly = excluded.churn_monthly,
              raise_pct = excluded.raise_pct,
              updated_at = datetime('now')
            RETURNING *`,
      args: [newMonthly, churnMonthly, raisePct],
    });
    return json(mapForecast(result.rows[0]));
  } catch (err) {
    console.error('[ppc-retainer] PUT /forecast error:', err);
    return apiError('Internal server error', 500);
  }
}
