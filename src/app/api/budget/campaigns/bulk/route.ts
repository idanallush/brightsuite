import { NextRequest } from 'next/server';
import { getTurso } from '@/lib/db/turso';
import { json, error } from '@/lib/budget/api-helpers';
import { requireApiAuth } from '@/lib/auth/require-auth-api';

const statusLabels: Record<string, string> = {
  active: 'פעיל',
  paused: 'מושהה',
  stopped: 'הופסק',
  scheduled: 'מתוזמן',
};

// PUT /api/budget/campaigns/bulk — bulk actions on multiple campaigns
export async function PUT(request: NextRequest) {
  const { session, error: authError } = await requireApiAuth();
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  if (!body) return error('Invalid JSON body');

  const { ids, action } = body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return error('ids array is required and must not be empty');
  }
  if (!action) return error('action is required');

  const performedBy = session.name || session.email || 'מערכת';
  const db = getTurso();

  try {
    const placeholders = ids.map(() => '?').join(',');

    // Bulk status change
    if (action === 'status') {
      const { status, end_date } = body;
      if (!status) return error('status is required');

      if (end_date) {
        await db.execute({
          sql: `UPDATE bf_campaigns SET status = ?, end_date = ? WHERE id IN (${placeholders})`,
          args: [status, end_date, ...ids],
        });
      } else {
        await db.execute({
          sql: `UPDATE bf_campaigns SET status = ? WHERE id IN (${placeholders})`,
          args: [status, ...ids],
        });
      }

      if (status === 'stopped' && end_date) {
        for (const id of ids) {
          await db.execute({
            sql: `UPDATE bf_budget_periods SET end_date = ? WHERE campaign_id = ? AND end_date IS NULL`,
            args: [end_date, id],
          });
        }
      }

      for (const id of ids) {
        await db.execute({
          sql: `INSERT INTO bf_changelog (campaign_id, action, description, new_value, performed_by)
                VALUES (?, 'status_change', ?, ?, ?)`,
          args: [id, `סטטוס שונה ל${statusLabels[status] ?? status} (פעולה מרובה)`, status, performedBy],
        });
      }

      return json({ success: true, action: 'status', affected: ids.length });
    }

    // Bulk delete
    if (action === 'delete') {
      await db.execute({
        sql: `DELETE FROM bf_campaigns WHERE id IN (${placeholders})`,
        args: ids,
      });

      return json({ success: true, action: 'delete', affected: ids.length });
    }

    // Bulk update ad_link
    if (action === 'update_ad_link') {
      const { ad_link } = body;
      if (ad_link === undefined) return error('ad_link is required');

      await db.execute({
        sql: `UPDATE bf_campaigns SET ad_link = ? WHERE id IN (${placeholders})`,
        args: [ad_link, ...ids],
      });

      for (const id of ids) {
        await db.execute({
          sql: `INSERT INTO bf_changelog (campaign_id, action, description, new_value, performed_by)
                VALUES (?, 'note_added', ?, ?, ?)`,
          args: [id, `לינק מודעה עודכן (פעולה מרובה)`, ad_link, performedBy],
        });
      }

      return json({ success: true, action: 'update_ad_link', affected: ids.length });
    }

    // Bulk remove from plan
    if (action === 'remove_from_plan') {
      const { effective_date } = body;
      if (!effective_date) return error('effective_date is required');

      for (const id of ids) {
        await db.execute({
          sql: `UPDATE bf_budget_periods SET end_date = ? WHERE campaign_id = ? AND end_date IS NULL`,
          args: [effective_date, id],
        });
      }

      await db.execute({
        sql: `UPDATE bf_campaigns SET end_date = ? WHERE id IN (${placeholders})`,
        args: [effective_date, ...ids],
      });

      for (const id of ids) {
        await db.execute({
          sql: `INSERT INTO bf_changelog (campaign_id, action, description, new_value, performed_by)
                VALUES (?, 'campaign_removed', ?, ?, ?)`,
          args: [id, `קמפיין הוצא מתוכנית התקציב החל מ-${effective_date} (פעולה מרובה)`, effective_date, performedBy],
        });
      }

      return json({ success: true, action: 'remove_from_plan', affected: ids.length });
    }

    return error(`Unknown action: ${action}`);
  } catch (err) {
    console.error('Bulk action error:', err);
    return error('Internal server error', 500);
  }
}
