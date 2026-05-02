import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';
import { CPA_VIEWS_CURRENT_VERSION } from '@/lib/cpa/views-schema';
import type { CpaUserViewRecord } from '../route';

type Params = { params: Promise<{ id: string }> };

function mapView(row: Record<string, unknown>): CpaUserViewRecord {
  let payload: unknown = null;
  try {
    payload = row.payload != null ? JSON.parse(String(row.payload)) : null;
  } catch {
    payload = null;
  }
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    name: String(row.name),
    payload,
    payloadVersion: Number(row.payload_version ?? 1),
    isDefault: Number(row.is_default ?? 0) === 1,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

// PUT /api/cpa/views/[id]
// Body: { name?, payload?, isDefault? }
// Only the owner can update. Mismatched user → 404 (kept narrow on purpose).
export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: 'מזהה לא תקין' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'גוף הבקשה לא תקין' }, { status: 400 });
  }

  const db = getTurso();
  const userId = auth.session.userId;

  // Confirm ownership. 404 (not 403) when row exists for someone else.
  const existing = await db.execute({
    sql: `SELECT * FROM cpa_user_views WHERE id = ? AND user_id = ? LIMIT 1`,
    args: [numericId, userId],
  });
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: 'תצוגה לא נמצאה' }, { status: 404 });
  }

  const sets: string[] = [];
  const args: (string | number)[] = [];

  if (typeof body.name === 'string') {
    const name = body.name.trim();
    if (name.length < 1 || name.length > 80) {
      return NextResponse.json({ error: 'שם התצוגה חייב להיות בין 1 ל־80 תווים' }, { status: 400 });
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
      return NextResponse.json({ error: 'payload חייב להיות JSON תקין' }, { status: 400 });
    }
    sets.push('payload = ?');
    args.push(payloadJson);
    // The new payload was produced by the current client, so it's at the
    // current schema version. Stamping the row keeps reads honest after a
    // shape change lands and old rows are migrated forward by the read path.
    sets.push('payload_version = ?');
    args.push(CPA_VIEWS_CURRENT_VERSION);
  }

  // isDefault is handled specially below to ensure mutual exclusion per user.
  const wantDefault =
    body.isDefault === true || body.isDefault === false ? Boolean(body.isDefault) : null;

  try {
    if (wantDefault === true) {
      const updateSql = sets.length
        ? `UPDATE cpa_user_views SET ${sets.join(', ')}, is_default = 1, updated_at = datetime('now') WHERE id = ? AND user_id = ?`
        : `UPDATE cpa_user_views SET is_default = 1, updated_at = datetime('now') WHERE id = ? AND user_id = ?`;

      await db.batch([
        {
          sql: `UPDATE cpa_user_views SET is_default = 0, updated_at = datetime('now')
                WHERE user_id = ? AND is_default = 1 AND id <> ?`,
          args: [userId, numericId],
        },
        {
          sql: updateSql,
          args: [...args, numericId, userId],
        },
      ]);
    } else if (wantDefault === false) {
      const updateSql = sets.length
        ? `UPDATE cpa_user_views SET ${sets.join(', ')}, is_default = 0, updated_at = datetime('now') WHERE id = ? AND user_id = ?`
        : `UPDATE cpa_user_views SET is_default = 0, updated_at = datetime('now') WHERE id = ? AND user_id = ?`;
      await db.execute({ sql: updateSql, args: [...args, numericId, userId] });
    } else {
      if (sets.length === 0) {
        return NextResponse.json({ error: 'אין שדות לעדכון' }, { status: 400 });
      }
      await db.execute({
        sql: `UPDATE cpa_user_views SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
        args: [...args, numericId, userId],
      });
    }

    const fresh = await db.execute({
      sql: `SELECT * FROM cpa_user_views WHERE id = ? AND user_id = ? LIMIT 1`,
      args: [numericId, userId],
    });
    if (fresh.rows.length === 0) {
      return NextResponse.json({ error: 'תצוגה לא נמצאה' }, { status: 404 });
    }
    return NextResponse.json({
      view: mapView(fresh.rows[0] as unknown as Record<string, unknown>),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    if (/UNIQUE/i.test(msg)) {
      return NextResponse.json({ error: 'כבר קיימת תצוגה בשם זה' }, { status: 409 });
    }
    console.error('[cpa] PUT /views/[id] error:', err);
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 });
  }
}

// DELETE /api/cpa/views/[id]
// Owner-only. Mismatched user → 404.
export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: 'מזהה לא תקין' }, { status: 400 });
  }

  try {
    const db = getTurso();
    const result = await db.execute({
      sql: `DELETE FROM cpa_user_views WHERE id = ? AND user_id = ?`,
      args: [numericId, auth.session.userId],
    });

    if ((result.rowsAffected ?? 0) === 0) {
      return NextResponse.json({ error: 'תצוגה לא נמצאה' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[cpa] DELETE /views/[id] error:', err);
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 });
  }
}
