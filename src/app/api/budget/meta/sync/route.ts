import { NextRequest } from 'next/server';
import { getTurso } from '@/lib/db/turso';
import { json, error } from '@/lib/budget/api-helpers';
import { syncMetaForClient } from '@/lib/budget/meta-sync-core';
import { getActiveAccessToken } from '@/lib/ads-hub/meta-ads-service';

// POST /api/budget/meta/sync — sync campaigns from Meta Ads
export async function POST(request: NextRequest) {
  // Pull the active OAuth access token from bs_fb_connections (same source
  // that Ads Hub and Clients Dashboard use). The legacy FACEBOOK_ACCESS_TOKEN
  // env var was stale and unset — moving everything to OAuth.
  const accessToken = await getActiveAccessToken();
  if (!accessToken) {
    return error(
      'No active Meta access token. Connect Facebook in Settings → Connections.',
      503,
    );
  }

  const body = await request.json().catch(() => null);
  const { client_id, ad_account_id } = body ?? {};
  if (!client_id) return error('client_id is required');

  const db = getTurso();
  const startedAt = Date.now();

  try {
    const result = await syncMetaForClient(db, client_id, ad_account_id ?? null, accessToken);
    const duration_ms = Date.now() - startedAt;
    try {
      await db.execute({
        sql: `INSERT INTO bf_sync_logs (client_id, platform, status, created_count, updated_count, duration_ms, triggered_by)
              VALUES (?, 'meta', 'success', ?, ?, ?, 'manual')`,
        args: [client_id, result.created, result.updated, duration_ms],
      });
    } catch (logErr) {
      console.error('Failed to write sync log:', logErr);
    }
    return json(result);
  } catch (err) {
    const duration_ms = Date.now() - startedAt;
    const message = (err as Error).message;
    console.error('Meta sync error:', err);
    try {
      await db.execute({
        sql: `INSERT INTO bf_sync_logs (client_id, platform, status, error, duration_ms, triggered_by)
              VALUES (?, 'meta', 'error', ?, ?, 'manual')`,
        args: [client_id, message, duration_ms],
      });
    } catch (logErr) {
      console.error('Failed to write sync log:', logErr);
    }
    return error(`Sync failed: ${message}`, 500);
  }
}
