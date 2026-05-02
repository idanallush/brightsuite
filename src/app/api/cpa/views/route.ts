import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';
import { CPA_VIEWS_CURRENT_VERSION } from '@/lib/cpa/views-schema';

export interface CpaUserViewRecord {
  id: number;
  userId: number;
  name: string;
  payload: unknown;
  payloadVersion: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Map a raw cpa_user_views row into a typed record, parsing the JSON payload.
function mapView(row: Record<string, unknown>): CpaUserViewRecord {
  let payload: unknown = null;
  try {
    payload = row.payload != null ? JSON.parse(String(row.payload)) : null;
  } catch {
    // Corrupt payload — surface as null so the UI can degrade gracefully.
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

// GET /api/cpa/views
// List the current user's saved CPA dashboard views.
// Returns `CpaUserViewRecord[]` with `payload` already parsed from JSON.
export async function GET() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  try {
    const db = getTurso();
    const result = await db.execute({
      sql: `SELECT * FROM cpa_user_views WHERE user_id = ? ORDER BY is_default DESC, updated_at DESC, name ASC`,
      args: [auth.session.userId],
    });
    const views = result.rows.map((r) => mapView(r as unknown as Record<string, unknown>));
    return NextResponse.json({ views });
  } catch (err) {
    console.error('[cpa] GET /views error:', err);
    return NextResponse.json({ error: 'שגיאה בטעינת תצוגות שמורות' }, { status: 500 });
  }
}

// POST /api/cpa/views
// Body: { name, payload, isDefault? }
//   or: { views: [{ name, payload, isDefault? }, ...] }  ← batch import
// - `name` length 1..80
// - `payload` may be a JSON-serializable value (object/array/etc.) or a JSON string
// - When `isDefault: true`, atomically clears any other default for this user.
// - Batch mode returns `{ views: CpaUserViewRecord[] }`. Names that collide with
//   existing rows are skipped (one-shot localStorage import is idempotent).
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'גוף הבקשה לא תקין' }, { status: 400 });
  }

  const db = getTurso();
  const userId = auth.session.userId;

  // Batch import path — used by the one-shot localStorage migration.
  if (Array.isArray((body as { views?: unknown }).views)) {
    const items = (body as { views: unknown[] }).views;
    const created: CpaUserViewRecord[] = [];
    for (const raw of items) {
      if (!raw || typeof raw !== 'object') continue;
      const item = raw as { name?: unknown; payload?: unknown; isDefault?: unknown };
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      if (name.length < 1 || name.length > 80) continue;

      let payloadJson: string;
      try {
        payloadJson =
          typeof item.payload === 'string'
            ? JSON.stringify(JSON.parse(item.payload))
            : JSON.stringify(item.payload ?? null);
      } catch {
        continue;
      }

      try {
        await db.execute({
          sql: `INSERT INTO cpa_user_views (user_id, name, payload, payload_version, is_default)
                VALUES (?, ?, ?, ?, ?)`,
          args: [
            userId,
            name,
            payloadJson,
            CPA_VIEWS_CURRENT_VERSION,
            item.isDefault === true ? 1 : 0,
          ],
        });
        const row = await db.execute({
          sql: `SELECT * FROM cpa_user_views WHERE user_id = ? AND name = ? LIMIT 1`,
          args: [userId, name],
        });
        if (row.rows.length > 0) {
          created.push(mapView(row.rows[0] as unknown as Record<string, unknown>));
        }
      } catch (err) {
        // UNIQUE collision → skip silently so the migration is re-run safe.
        const msg = err instanceof Error ? err.message : '';
        if (!/UNIQUE/i.test(msg)) {
          console.error('[cpa] POST /views batch insert error:', err);
        }
      }
    }
    return NextResponse.json({ views: created }, { status: 201 });
  }

  // Single-create path.
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const isDefault = Boolean(body.isDefault);

  if (name.length < 1 || name.length > 80) {
    return NextResponse.json({ error: 'שם התצוגה חייב להיות בין 1 ל־80 תווים' }, { status: 400 });
  }

  let payloadJson: string;
  try {
    if (typeof body.payload === 'string') {
      const parsed = JSON.parse(body.payload);
      payloadJson = JSON.stringify(parsed);
    } else if (body.payload === undefined) {
      payloadJson = JSON.stringify(null);
    } else {
      payloadJson = JSON.stringify(body.payload);
    }
  } catch {
    return NextResponse.json({ error: 'payload חייב להיות JSON תקין' }, { status: 400 });
  }

  try {
    if (isDefault) {
      // Clear other defaults first, then insert as default — one batch.
      await db.batch([
        {
          sql: `UPDATE cpa_user_views SET is_default = 0, updated_at = datetime('now')
                WHERE user_id = ? AND is_default = 1`,
          args: [userId],
        },
        {
          sql: `INSERT INTO cpa_user_views (user_id, name, payload, payload_version, is_default)
                VALUES (?, ?, ?, ?, 1)`,
          args: [userId, name, payloadJson, CPA_VIEWS_CURRENT_VERSION],
        },
      ]);
    } else {
      await db.execute({
        sql: `INSERT INTO cpa_user_views (user_id, name, payload, payload_version, is_default)
              VALUES (?, ?, ?, ?, 0)`,
        args: [userId, name, payloadJson, CPA_VIEWS_CURRENT_VERSION],
      });
    }

    const created = await db.execute({
      sql: `SELECT * FROM cpa_user_views WHERE user_id = ? AND name = ? LIMIT 1`,
      args: [userId, name],
    });
    if (created.rows.length === 0) {
      return NextResponse.json({ error: 'יצירת התצוגה נכשלה' }, { status: 500 });
    }
    return NextResponse.json(
      { view: mapView(created.rows[0] as unknown as Record<string, unknown>) },
      { status: 201 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    if (/UNIQUE/i.test(msg)) {
      return NextResponse.json(
        { error: 'כבר קיימת תצוגה בשם זה' },
        { status: 409 },
      );
    }
    console.error('[cpa] POST /views error:', err);
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 });
  }
}
