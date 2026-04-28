import { getTurso } from '@/lib/db/turso';
import {
  requirePpcAuth,
  json,
  apiError,
  mapClient,
  mapTeam,
  mapExpense,
  mapForecast,
} from '@/lib/ppc-retainer/api-helpers';

// GET /api/ppc-retainer/data — returns all four datasets in one shot
export async function GET() {
  const auth = await requirePpcAuth();
  if (auth.error) return auth.error;

  try {
    const db = getTurso();
    const [clients, team, expenses, forecast] = await Promise.all([
      db.execute({
        sql: `SELECT * FROM pr_clients ORDER BY status ASC, retainer DESC, id ASC`,
        args: [],
      }),
      db.execute({
        sql: `SELECT * FROM pr_team ORDER BY sort_order ASC, id ASC`,
        args: [],
      }),
      db.execute({
        sql: `SELECT * FROM pr_expenses ORDER BY id ASC`,
        args: [],
      }),
      db.execute({
        sql: `SELECT * FROM pr_forecast WHERE id = 1`,
        args: [],
      }),
    ]);

    return json({
      clients: clients.rows.map(mapClient),
      team: team.rows.map(mapTeam),
      expenses: expenses.rows.map(mapExpense),
      forecast: mapForecast(forecast.rows[0]),
    });
  } catch (err) {
    console.error('[ppc-retainer] GET /data error:', err);
    return apiError('Internal server error', 500);
  }
}
