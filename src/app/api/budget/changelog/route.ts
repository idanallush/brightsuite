import { NextRequest } from 'next/server';
import { getTurso } from '@/lib/db/turso';
import { requireBudgetAuth, json, error } from '@/lib/budget/api-helpers';

// GET /api/budget/changelog?campaign_id=xxx OR ?client_id=xxx
export async function GET(request: NextRequest) {
  const auth = await requireBudgetAuth();
  if (auth.error) return auth.error;

  const campaignId = request.nextUrl.searchParams.get('campaign_id');
  const clientId = request.nextUrl.searchParams.get('client_id');

  if (!campaignId && !clientId) {
    return error('campaign_id or client_id is required');
  }

  try {
    const db = getTurso();

    if (campaignId) {
      const result = await db.execute({
        sql: 'SELECT * FROM bf_changelog WHERE campaign_id = ? ORDER BY performed_at DESC',
        args: [campaignId],
      });
      return json(result.rows);
    }

    // By client_id: get all campaigns for the client, then their changelogs
    const campaignsResult = await db.execute({
      sql: 'SELECT id FROM bf_campaigns WHERE client_id = ?',
      args: [clientId!],
    });

    const campaignIds = campaignsResult.rows.map((c) => c.id as string);
    if (campaignIds.length === 0) return json([]);

    const placeholders = campaignIds.map(() => '?').join(',');
    const result = await db.execute({
      sql: `SELECT * FROM bf_changelog WHERE campaign_id IN (${placeholders}) ORDER BY performed_at DESC`,
      args: campaignIds,
    });

    return json(result.rows);
  } catch (err) {
    console.error('Get changelog error:', err);
    return error('Internal server error', 500);
  }
}
