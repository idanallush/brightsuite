import { NextRequest } from 'next/server';
import { getTurso } from '@/lib/db/turso';
import { requireBudgetAuth, json, error } from '@/lib/budget/api-helpers';

// GET /api/budget/campaigns?client_id=xxx — list campaigns + budget periods for a client
export async function GET(request: NextRequest) {
  const auth = await requireBudgetAuth();
  if (auth.error) return auth.error;

  const clientId = request.nextUrl.searchParams.get('client_id');
  if (!clientId) return error('client_id is required');

  try {
    const db = getTurso();

    const campaignResult = await db.execute({
      sql: `SELECT * FROM bf_campaigns
            WHERE client_id = ? AND dismissed_at IS NULL
            ORDER BY platform, name`,
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

    return json({ campaigns: campaignList, budget_periods: periods });
  } catch (err) {
    console.error('Get campaigns error:', err);
    return error('Internal server error', 500);
  }
}

// POST /api/budget/campaigns — create a new campaign
export async function POST(request: NextRequest) {
  const auth = await requireBudgetAuth();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const { client_id, name, technical_name, platform, campaign_type, daily_budget, start_date, ad_link, notes } = body ?? {};
  if (!client_id || !name || !platform || !daily_budget || !start_date) {
    return error('client_id, name, platform, daily_budget, and start_date are required');
  }

  try {
    const db = getTurso();

    // Create campaign
    const campaignResult = await db.execute({
      sql: `INSERT INTO bf_campaigns (client_id, name, technical_name, platform, campaign_type, ad_link, start_date, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        client_id,
        name,
        technical_name ?? null,
        platform,
        campaign_type ?? null,
        ad_link ?? null,
        start_date,
        notes ?? null,
      ],
    });

    const newCampaign = campaignResult.rows[0];
    const campaignId = newCampaign.id as string;

    // Create initial budget period
    await db.execute({
      sql: `INSERT INTO bf_budget_periods (campaign_id, daily_budget, start_date) VALUES (?, ?, ?)`,
      args: [campaignId, daily_budget, start_date],
    });

    // Changelog entry
    await db.execute({
      sql: `INSERT INTO bf_changelog (campaign_id, action, description, performed_by, created_by_user_id)
            VALUES (?, 'campaign_added', ?, ?, ?)`,
      args: [campaignId, `קמפיין חדש נוסף: ${name}`, auth.session.name, auth.session.userId],
    });

    return json(newCampaign, 201);
  } catch (err) {
    console.error('Create campaign error:', err);
    return error('Internal server error', 500);
  }
}
