import { NextRequest } from 'next/server';
import { getTurso } from '@/lib/db/turso';
import { requireBudgetAuth, json, error } from '@/lib/budget/api-helpers';

const statusLabels: Record<string, string> = {
  active: 'פעיל',
  paused: 'מושהה',
  stopped: 'הופסק',
  scheduled: 'מתוזמן',
};

// GET /api/budget/campaigns/[id] — get campaign by ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireBudgetAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  if (!id) return error('Campaign ID is required');

  try {
    const db = getTurso();
    const result = await db.execute({
      sql: 'SELECT * FROM bf_campaigns WHERE id = ? LIMIT 1',
      args: [id],
    });

    if (result.rows.length === 0) return error('Campaign not found', 404);
    return json(result.rows[0]);
  } catch (err) {
    console.error('Get campaign error:', err);
    return error('Internal server error', 500);
  }
}

// PUT /api/budget/campaigns/[id] — update campaign (budget change, status change, remove from plan, edit)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireBudgetAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  if (!id) return error('Campaign ID is required');

  const body = await request.json().catch(() => null);
  if (!body) return error('Request body is required');

  const db = getTurso();

  // Budget change: { action: 'budget', new_budget, effective_date, old_budget }
  if (body.action === 'budget') {
    const { new_budget, effective_date, old_budget } = body;
    if (!new_budget || !effective_date || old_budget === undefined) {
      return error('new_budget, effective_date, and old_budget are required');
    }
    try {
      const endDate = new Date(effective_date);
      endDate.setDate(endDate.getDate() - 1);
      const endDateStr = endDate.toISOString().split('T')[0];

      // Close current open period
      await db.execute({
        sql: 'UPDATE bf_budget_periods SET end_date = ? WHERE campaign_id = ? AND end_date IS NULL',
        args: [endDateStr, id],
      });

      // Create new period
      const periodResult = await db.execute({
        sql: `INSERT INTO bf_budget_periods (campaign_id, daily_budget, start_date, end_date)
              VALUES (?, ?, ?, ?) RETURNING *`,
        args: [id, new_budget, effective_date, body.end_date || null],
      });

      // Changelog
      await db.execute({
        sql: `INSERT INTO bf_changelog (campaign_id, action, description, old_value, new_value, performed_by, created_by_user_id)
              VALUES (?, 'budget_change', ?, ?, ?, ?, ?)`,
        args: [
          id,
          `תקציב שונה מ-₪${old_budget} ל-₪${new_budget}, החל מ-${effective_date}`,
          String(old_budget),
          String(new_budget),
          auth.session.name,
          auth.session.userId,
        ],
      });

      return json(periodResult.rows[0], 201);
    } catch (err) {
      console.error('Budget change error:', err);
      return error('Internal server error', 500);
    }
  }

  // Status change: { action: 'status', status, end_date? }
  if (body.action === 'status') {
    const { status, end_date } = body;
    if (!status) return error('status is required');
    try {
      let result;
      if (end_date) {
        result = await db.execute({
          sql: 'UPDATE bf_campaigns SET status = ?, end_date = ? WHERE id = ? RETURNING *',
          args: [status, end_date, id],
        });
      } else {
        result = await db.execute({
          sql: 'UPDATE bf_campaigns SET status = ? WHERE id = ? RETURNING *',
          args: [status, id],
        });
      }

      if (result.rows.length === 0) return error('Campaign not found', 404);

      // If stopped, close open budget periods
      if (status === 'stopped' && end_date) {
        await db.execute({
          sql: 'UPDATE bf_budget_periods SET end_date = ? WHERE campaign_id = ? AND end_date IS NULL',
          args: [end_date, id],
        });
      }

      // Changelog
      await db.execute({
        sql: `INSERT INTO bf_changelog (campaign_id, action, description, new_value, performed_by, created_by_user_id)
              VALUES (?, 'status_change', ?, ?, ?, ?)`,
        args: [
          id,
          `סטטוס שונה ל${statusLabels[status] ?? status}`,
          status,
          auth.session.name,
          auth.session.userId,
        ],
      });

      return json(result.rows[0]);
    } catch (err) {
      console.error('Status change error:', err);
      return error('Internal server error', 500);
    }
  }

  // Remove from plan: close budget period + set end_date
  if (body.action === 'remove_from_plan') {
    const { effective_date } = body;
    if (!effective_date) return error('effective_date is required');
    try {
      // Close open budget periods at the effective date
      await db.execute({
        sql: 'UPDATE bf_budget_periods SET end_date = ? WHERE campaign_id = ? AND end_date IS NULL',
        args: [effective_date, id],
      });

      // Set campaign end_date
      const result = await db.execute({
        sql: 'UPDATE bf_campaigns SET end_date = ? WHERE id = ? RETURNING *',
        args: [effective_date, id],
      });

      if (result.rows.length === 0) return error('Campaign not found', 404);

      // Changelog
      await db.execute({
        sql: `INSERT INTO bf_changelog (campaign_id, action, description, new_value, performed_by, created_by_user_id)
              VALUES (?, 'campaign_removed', ?, ?, ?, ?)`,
        args: [
          id,
          `קמפיין הוצא מתוכנית התקציב החל מ-${effective_date}`,
          effective_date,
          auth.session.name,
          auth.session.userId,
        ],
      });

      return json(result.rows[0]);
    } catch (err) {
      console.error('Remove from plan error:', err);
      return error('Internal server error', 500);
    }
  }

  // General update (campaign details) — no specific action
  try {
    const allowedFields = ['name', 'technical_name', 'platform', 'campaign_type', 'ad_link', 'status', 'start_date', 'end_date', 'notes', 'meta_campaign_id'];
    const setClauses: string[] = [];
    const args: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(body)) {
      if (key === 'action') continue;
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = ?`);
        args.push(value as string | number | null);
      }
    }

    if (setClauses.length === 0) return error('No valid fields to update');

    args.push(id);
    const result = await db.execute({
      sql: `UPDATE bf_campaigns SET ${setClauses.join(', ')} WHERE id = ? RETURNING *`,
      args,
    });

    if (result.rows.length === 0) return error('Campaign not found', 404);
    return json(result.rows[0]);
  } catch (err) {
    console.error('Update campaign error:', err);
    return error('Internal server error', 500);
  }
}

// DELETE /api/budget/campaigns/[id] — soft-delete campaign
// We don't hard-delete because Meta keeps reporting the campaign as
// ACTIVE/PAUSED long after stop_time, and a hard delete would let the
// next sync re-create the row. Soft-delete via dismissed_at lets sync
// look it up by meta_campaign_id and skip it.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireBudgetAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  if (!id) return error('Campaign ID is required');

  try {
    const db = getTurso();
    const result = await db.execute({
      sql: `UPDATE bf_campaigns
            SET dismissed_at = datetime('now')
            WHERE id = ? AND dismissed_at IS NULL
            RETURNING *`,
      args: [id],
    });

    if (result.rows.length === 0) return error('Campaign not found', 404);
    return json({ success: true });
  } catch (err) {
    console.error('Delete campaign error:', err);
    return error('Internal server error', 500);
  }
}
