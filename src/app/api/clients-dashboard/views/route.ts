import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';
import type { UserViewRecord } from '@/lib/clients-dashboard/types';

// Map a raw cd_user_views row into a typed UserViewRecord, parsing the JSON payload.
function mapView(row: Record<string, unknown>): UserViewRecord {
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
    scope: String(row.scope),
    name: String(row.name),
    payload,
    isDefault: Number(row.is_default ?? 0) === 1,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

// GET /api/clients-dashboard/views?scope=X
// List the current user's saved views. Omit `scope` to list across all scopes.
// Returns `UserViewRecord[]` with `payload` already parsed from JSON.
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const scope = request.nextUrl.searchParams.get('scope');

  const db = getTurso();
  const sql = scope
    ? `SELECT * FROM cd_user_views WHERE user_id = ? AND scope = ? ORDER BY is_default DESC, updated_at DESC, name ASC`
    : `SELECT * FROM cd_user_views WHERE user_id = ? ORDER BY scope ASC, is_default DESC, updated_at DESC, name ASC`;
  const args: (string | number)[] = scope
    ? [auth.session.userId, scope]
    : [auth.session.userId];

  const result = await db.execute({ sql, args });
  const views = result.rows.map((r) => mapView(r as unknown as Record<string, unknown>));
  return NextResponse.json({ views });
}

// POST /api/clients-dashboard/views
// Body: { scope, name, payload, isDefault? }
// - `name` length 1..80
// - `payload` may be a JSON-serializable value (object/array/etc.) or a JSON string
// - When `isDefault: true`, atomically clears any other default in the same scope.
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const scope = typeof body.scope === 'string' ? body.scope.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const isDefault = Boolean(body.isDefault);

  if (!scope) return NextResponse.json({ error: 'scope is required' }, { status: 400 });
  if (name.length < 1 || name.length > 80) {
    return NextResponse.json({ error: 'name must be 1..80 chars' }, { status: 400 });
  }

  // Accept either a JSON string or any serializable value.
  let payloadJson: string;
  try {
    if (typeof body.payload === 'string') {
      // Validate the string parses as JSON, then re-stringify to canonical form.
      const parsed = JSON.parse(body.payload);
      payloadJson = JSON.stringify(parsed);
    } else if (body.payload === undefined) {
      payloadJson = JSON.stringify(null);
    } else {
      payloadJson = JSON.stringify(body.payload);
    }
  } catch {
    return NextResponse.json({ error: 'payload must be valid JSON' }, { status: 400 });
  }

  const db = getTurso();
  const userId = auth.session.userId;

  try {
    if (isDefault) {
      // Clear other defaults in this scope first, then insert as default — one batch.
      await db.batch([
        {
          sql: `UPDATE cd_user_views SET is_default = 0, updated_at = datetime('now')
                WHERE user_id = ? AND scope = ? AND is_default = 1`,
          args: [userId, scope],
        },
        {
          sql: `INSERT INTO cd_user_views (user_id, scope, name, payload, is_default)
                VALUES (?, ?, ?, ?, 1)`,
          args: [userId, scope, name, payloadJson],
        },
      ]);
    } else {
      await db.execute({
        sql: `INSERT INTO cd_user_views (user_id, scope, name, payload, is_default)
              VALUES (?, ?, ?, ?, 0)`,
        args: [userId, scope, name, payloadJson],
      });
    }

    const created = await db.execute({
      sql: `SELECT * FROM cd_user_views WHERE user_id = ? AND scope = ? AND name = ? LIMIT 1`,
      args: [userId, scope, name],
    });
    if (created.rows.length === 0) {
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 });
    }
    return NextResponse.json(
      { view: mapView(created.rows[0] as unknown as Record<string, unknown>) },
      { status: 201 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    // SQLite UNIQUE(user_id, scope, name) violation → friendly 409.
    if (/UNIQUE/i.test(msg)) {
      return NextResponse.json(
        { error: 'A view with this name already exists in this scope' },
        { status: 409 },
      );
    }
    console.error('[clients-dashboard] POST /views error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
