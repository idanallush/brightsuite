import { NextRequest } from 'next/server';
import { getTurso } from '@/lib/db/turso';
import { requireBudgetAuth, json, error } from '@/lib/budget/api-helpers';

// GET /api/budget/clients/[slug] — get a single client by slug
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireBudgetAuth();
  if (auth.error) return auth.error;

  const { slug } = await params;
  if (!slug) return error('Slug is required');

  try {
    const db = getTurso();
    const result = await db.execute({
      sql: 'SELECT * FROM bf_clients WHERE slug = ? LIMIT 1',
      args: [slug],
    });

    if (result.rows.length === 0) return error('Client not found', 404);
    return json(result.rows[0]);
  } catch (err) {
    console.error('Get client error:', err);
    return error('Internal server error', 500);
  }
}

// PUT /api/budget/clients/[slug] — update client
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireBudgetAuth();
  if (auth.error) return auth.error;

  const { slug } = await params;
  if (!slug) return error('Slug is required');

  const updates = await request.json().catch(() => null);
  if (!updates || Object.keys(updates).length === 0) {
    return error('No updates provided');
  }

  try {
    const db = getTurso();

    // Build dynamic SET clause from update fields
    const allowedFields = ['name', 'slug', 'share_token', 'is_active', 'notes', 'meta_ad_account_id', 'google_customer_id', 'google_mcc_id'];
    const setClauses: string[] = [];
    const args: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = ?`);
        args.push(value as string | number | null);
      }
    }

    if (setClauses.length === 0) return error('No valid fields to update');

    args.push(slug);
    const result = await db.execute({
      sql: `UPDATE bf_clients SET ${setClauses.join(', ')} WHERE slug = ? RETURNING *`,
      args,
    });

    if (result.rows.length === 0) return error('Client not found', 404);
    return json(result.rows[0]);
  } catch (err) {
    console.error('Update client error:', err);
    return error('Internal server error', 500);
  }
}

// DELETE /api/budget/clients/[slug] — delete client
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireBudgetAuth();
  if (auth.error) return auth.error;

  const { slug } = await params;
  if (!slug) return error('Slug is required');

  try {
    const db = getTurso();
    const result = await db.execute({
      sql: 'DELETE FROM bf_clients WHERE slug = ? RETURNING *',
      args: [slug],
    });

    if (result.rows.length === 0) return error('Client not found', 404);
    return json({ success: true });
  } catch (err) {
    console.error('Delete client error:', err);
    return error('Internal server error', 500);
  }
}
