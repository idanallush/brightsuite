import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/db/turso';
import { initBudgetFlowTables } from '@/lib/budget/schema-init';
import { syncMetaForClient } from '@/lib/budget/meta-sync-core';
import { syncGoogleForClient } from '@/lib/budget/google-sync-core';
import { getActiveAccessToken } from '@/lib/ads-hub/meta-ads-service';

export const maxDuration = 300;

interface PlatformResult {
  success: boolean;
  created?: number;
  updated?: number;
  error?: string;
  duration_ms: number;
}

interface SyncResult {
  client_id: string;
  client_name: string;
  meta?: PlatformResult;
  google?: PlatformResult;
}

// GET /api/budget/cron/daily-sync — Vercel Cron daily sync for all active clients.
// Authenticated via CRON_SECRET when set (Vercel Cron sends Bearer token automatically).
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await initBudgetFlowTables();
  const db = getTurso();
  const runStartedAt = Date.now();

  try {
    const activeClientsResult = await db.execute({
      sql: 'SELECT * FROM bf_clients WHERE is_active = 1',
      args: [],
    });
    const activeClients = activeClientsResult.rows;

    const results: SyncResult[] = [];
    // OAuth token from bs_fb_connections — same source as Ads Hub / Clients Dashboard.
    const accessToken = await getActiveAccessToken();
    const noTokenError = 'No active Meta access token (connect Facebook in Settings → Connections)';

    for (const client of activeClients) {
      const clientId = client.id as string;
      const clientName = client.name as string;
      const result: SyncResult = {
        client_id: clientId,
        client_name: clientName,
      };

      if (client.meta_ad_account_id) {
        const startedAt = Date.now();
        if (!accessToken) {
          result.meta = {
            success: false,
            error: noTokenError,
            duration_ms: 0,
          };
          await db.execute({
            sql: `INSERT INTO bf_sync_logs (client_id, platform, status, error, duration_ms, triggered_by)
                  VALUES (?, 'meta', 'error', ?, 0, 'cron')`,
            args: [clientId, noTokenError],
          });
        } else {
          try {
            const r = await syncMetaForClient(db, clientId, null, accessToken);
            const duration_ms = Date.now() - startedAt;
            result.meta = {
              success: true,
              created: r.created,
              updated: r.updated,
              duration_ms,
            };
            await db.execute({
              sql: `INSERT INTO bf_sync_logs (client_id, platform, status, created_count, updated_count, duration_ms, triggered_by)
                    VALUES (?, 'meta', 'success', ?, ?, ?, 'cron')`,
              args: [clientId, r.created, r.updated, duration_ms],
            });
          } catch (err) {
            const duration_ms = Date.now() - startedAt;
            const message = (err as Error).message;
            console.error(`[cron] Meta sync failed for ${clientName}:`, err);
            result.meta = { success: false, error: message, duration_ms };
            try {
              await db.execute({
                sql: `INSERT INTO bf_sync_logs (client_id, platform, status, error, duration_ms, triggered_by)
                      VALUES (?, 'meta', 'error', ?, ?, 'cron')`,
                args: [clientId, message, duration_ms],
              });
            } catch (logErr) {
              console.error('Failed to write sync log:', logErr);
            }
          }
        }
      }

      if (client.google_customer_id) {
        const startedAt = Date.now();
        try {
          const r = await syncGoogleForClient(db, clientId, null, null);
          const duration_ms = Date.now() - startedAt;
          result.google = {
            success: true,
            created: r.created,
            updated: r.updated,
            duration_ms,
          };
          await db.execute({
            sql: `INSERT INTO bf_sync_logs (client_id, platform, status, created_count, updated_count, duration_ms, triggered_by)
                  VALUES (?, 'google', 'success', ?, ?, ?, 'cron')`,
            args: [clientId, r.created, r.updated, duration_ms],
          });
        } catch (err) {
          const duration_ms = Date.now() - startedAt;
          const message = (err as Error).message;
          console.error(`[cron] Google sync failed for ${clientName}:`, err);
          result.google = { success: false, error: message, duration_ms };
          try {
            await db.execute({
              sql: `INSERT INTO bf_sync_logs (client_id, platform, status, error, duration_ms, triggered_by)
                    VALUES (?, 'google', 'error', ?, ?, 'cron')`,
              args: [clientId, message, duration_ms],
            });
          } catch (logErr) {
            console.error('Failed to write sync log:', logErr);
          }
        }
      }

      results.push(result);
    }

    const metaSynced = results.filter((r) => r.meta?.success).length;
    const googleSynced = results.filter((r) => r.google?.success).length;
    const failed = results.filter(
      (r) => (r.meta && !r.meta.success) || (r.google && !r.google.success),
    ).length;

    return NextResponse.json({
      success: true,
      total_clients: activeClients.length,
      meta_synced: metaSynced,
      google_synced: googleSynced,
      failed,
      total_duration_ms: Date.now() - runStartedAt,
      results,
      synced_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Daily sync cron error:', err);
    return NextResponse.json(
      { error: `Cron sync failed: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
