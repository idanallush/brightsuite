import { NextRequest } from 'next/server';
import { getTurso } from '@/lib/db/turso';
import { json, error } from '@/lib/budget/api-helpers';
import { syncGoogleForClient } from '@/lib/budget/google-sync-core';

// POST /api/budget/google/sync — sync campaigns from Google Ads
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { client_id, google_customer_id, google_mcc_id } = body ?? {};
  if (!client_id) return error('client_id is required');

  const db = getTurso();
  const startedAt = Date.now();

  try {
    const result = await syncGoogleForClient(
      db,
      client_id,
      google_customer_id ?? null,
      google_mcc_id ?? null,
    );
    const duration_ms = Date.now() - startedAt;
    try {
      await db.execute({
        sql: `INSERT INTO bf_sync_logs (client_id, platform, status, created_count, updated_count, duration_ms, triggered_by)
              VALUES (?, 'google', 'success', ?, ?, ?, 'manual')`,
        args: [client_id, result.created, result.updated, duration_ms],
      });
    } catch (logErr) {
      console.error('Failed to write sync log:', logErr);
    }
    return json(result);
  } catch (err) {
    const duration_ms = Date.now() - startedAt;
    const message = (err as Error).message;
    console.error('Google sync error:', err);
    try {
      await db.execute({
        sql: `INSERT INTO bf_sync_logs (client_id, platform, status, error, duration_ms, triggered_by)
              VALUES (?, 'google', 'error', ?, ?, 'manual')`,
        args: [client_id, message, duration_ms],
      });
    } catch (logErr) {
      console.error('Failed to write sync log:', logErr);
    }
    return error(`Sync failed: ${message}`, 500);
  }
}
