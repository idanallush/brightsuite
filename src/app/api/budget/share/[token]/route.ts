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

// PUT /api/budget/share/[token] — update campaign notes from share view
// (no session auth — share token authorizes the action; campaign must belong to client)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) return error('Token is required');

  const body = await request.json().catch(() => null);
  if (!body) return error('Invalid JSON body');

  const { campaign_id, notes } = body;
  if (!campaign_id) return error('campaign_id is required');

  try {
    const db = getTurso();

    const clientResult = await db.execute({
      sql: 'SELECT * FROM bf_clients WHERE share_token = ? LIMIT 1',
      args: [token],
    });
    if (clientResult.rows.length === 0) return error('Invalid share link', 404);
    const clientId = clientResult.rows[0].id as string;

    // Verify the campaign belongs to this client
    const campaignResult = await db.execute({
      sql: 'SELECT * FROM bf_campaigns WHERE id = ? AND client_id = ? LIMIT 1',
      args: [campaign_id, clientId],
    });
    if (campaignResult.rows.length === 0) return error('Campaign not found', 404);

    const updateResult = await db.execute({
      sql: 'UPDATE bf_campaigns SET notes = ? WHERE id = ? RETURNING *',
      args: [notes || null, campaign_id],
    });

    return json(updateResult.rows[0]);
  } catch (err) {
    console.error('Share notes update error:', err);
    return error('Internal server error', 500);
  }
}
