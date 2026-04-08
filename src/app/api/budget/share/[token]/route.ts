import { NextRequest } from 'next/server';
import { getTurso } from '@/lib/db/turso';
import { json, error } from '@/lib/budget/api-helpers';

// GET /api/budget/share/[token] — public share view (no auth required)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) return error('Token is required');

  try {
    const db = getTurso();

    // Find client by share token
    const clientResult = await db.execute({
      sql: 'SELECT * FROM bf_clients WHERE share_token = ? LIMIT 1',
      args: [token],
    });

    if (clientResult.rows.length === 0) return error('Invalid share link', 404);
    const client = clientResult.rows[0];
    const clientId = client.id as string;

    // Get campaigns for this client
    const campaignResult = await db.execute({
      sql: 'SELECT * FROM bf_campaigns WHERE client_id = ? ORDER BY platform, name',
      args: [clientId],
    });

    const campaignList = campaignResult.rows;
    const campaignIds = campaignList.map((c) => c.id as string);

    let periods: unknown[] = [];
    if (campaignIds.length > 0) {
      const placeholders = campaignIds.map(() => '?').join(',');
      const periodsResult = await db.execute({
        sql: `SELECT * FROM bf_budget_periods WHERE campaign_id IN (${placeholders}) ORDER BY start_date ASC`,
        args: campaignIds,
      });
      periods = periodsResult.rows;
    }

    return json({
      client,
      campaigns: campaignList,
      budget_periods: periods,
    });
  } catch (err) {
    console.error('Share view error:', err);
    return error('Internal server error', 500);
  }
}
