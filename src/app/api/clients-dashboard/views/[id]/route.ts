import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';
import type { UserViewRecord } from '@/lib/clients-dashboard/types';

type Params = { params: Promise<{ id: string }> };

function mapView(row: Record<string, unknown>): UserViewRecord {
  let payload: unknown = null;
  try {
    payload = row.payload != null ? JSON.parse(String(row.payload)) : null;
  } catch {
    payload = null;
  }
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    scope: String(row.scope),
    name: String(row.name),
    payload,
    isDefault: Number(row.is_default ?? 0) === 1,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

// PUT /api/clients-dashboard/views/[id]
// Body: { name?, payload?, isDefault? }
// Only the owner can update. Mismatched user → 404 (kept narrow on purpose).
export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const db = getTurso();
  const userId = auth.session.userId;

  // Confirm ownership. 404 (not 403) when row exists for someone else.
  const existing = await db.execute({
    sql: `SELECT * FROM cd_user_views WHERE id = ? AND user_id = ? LIMIT 1`,
    args: [numericId, userId],
  });
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const current = mapView(existing.rows[0] as unknown as Record<string, unknown>);

  const sets: string[] = [];
  const args: (string | number)[] = [];

  if (typeof body.name === 'string') {
    const name = body.name.trim();
    if (name.length < 1 || name.length > 80) {
      return NextResponse.json({ error: 'name must be 1..80 chars' }, { status: 400 });
    }
    sets.push('name = ?');
    args.push(name);
  }

  if (body.payload !== undefined) {
    let payloadJson: string;
    try {
      if (typeof body.payload === 'string') {
        const parsed = JSON.parse(body.payload);
        payloadJson = JSON.stringify(parsed);
      } else {
        payloadJson = JSON.stringify(body.payload);
      }
    } catch {
      return NextResponse.json({ error: 'payload must be valid JSON' }, { status: 400 });
    }
    sets.push('payload = ?');
    args.push(payloadJson);
  }

  // isDefault is handled specially below to ensure mutual exclusion in the scope.
  const wantDefault = body.isDefault === true || body.isDefault === false ? Boolean(body.isDefault) : null;

  try {
    if (wantDefault === true) {
      // Clear other defaults in scope, then update this row (with any other patches).
      const updateSql = sets.length
        ? `UPDATE cd_user_views SET ${sets.join(', ')}, is_default = 1, updated_at = datetime('now') WHERE id = ? AND user_id = ?`
        : `UPDATE cd_user_views SET is_default = 1, updated_at = datetime('now') WHERE id = ? AND user_id = ?`;

      await db.batch([
        {
          sql: `UPDATE cd_user_views SET is_default = 0, updated_at = datetime('now')
                WHERE user_id = ? AND scope = ? AND is_default = 1 AND id <> ?`,
          args: [userId, current.scope, numericId],
        },
        {
          sql: updateSql,
          args: [...args, numericId, userId],
        },
      ]);
    } else if (wantDefault === false) {
      const updateSql = sets.length
        ? `UPDATE cd_user_views SET ${sets.join(', ')}, is_default = 0, updated_at = datetime('now') WHERE id = ? AND user_id = ?`
        : `UPDATE cd_user_views SET is_default = 0, updated_at = datetime('now') WHERE id = ? AND user_id = ?`;
      await db.execute({ sql: updateSql, args: [...args, numericId, userId] });
    } else {
      if (sets.length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      }
      await db.execute({
        sql: `UPDATE cd_user_views SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
        args: [...args, numericId, userId],
      });
    }

    const fresh = await db.execute({
      sql: `SELECT * FROM cd_user_views WHERE id = ? AND user_id = ? LIMIT 1`,
      args: [numericId, userId],
    });
    if (fresh.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({
      view: mapView(fresh.rows[0] as unknown as Record<string, unknown>),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    if (/UNIQUE/i.test(msg)) {
      return NextResponse.json(
        { error: 'A view with this name already exists in this scope' },
        { status: 409 },
      );
    }
    console.error('[clients-dashboard] PUT /views/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/clients-dashboard/views/[id]
// Owner-only. Mismatched user → 404.
export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const db = getTurso();
  const result = await db.execute({
    sql: `DELETE FROM cd_user_views WHERE id = ? AND user_id = ?`,
    args: [numericId, auth.session.userId],
  });

  if ((result.rowsAffected ?? 0) === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
