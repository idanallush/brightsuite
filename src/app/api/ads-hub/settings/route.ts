import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';
import { isGoogleAdsAvailableAsync } from '@/lib/google/ads-api';
import { isServiceAvailable as isMetaAvailable } from '@/lib/ads-hub/meta-ads-service';
import { isServiceAvailableAsync as isGa4AvailableAsync } from '@/lib/ads-hub/ga4-service';
import type { PlatformConnectionStatus } from '@/lib/ads-hub/types';

type Platform = 'google' | 'meta' | 'ga4';

interface PlatformQueryResult {
  lastSync: string | null;
  accountCount: number;
  lastError: string | null;
}

// Returns platform status where `lastError` is cleared once a newer successful
// sync exists — so stale failures don't stick around after recovery.
async function getPlatformQueryResult(
  platform: Platform,
  accountField: string
): Promise<PlatformQueryResult> {
  const db = getTurso();

  const lastSyncResult = await db.execute({
    sql: `SELECT started_at FROM ah_sync_log
          WHERE platform = ? AND status = 'success'
          ORDER BY started_at DESC LIMIT 1`,
    args: [platform],
  });
  const lastSync = (lastSyncResult.rows[0]?.started_at as string) || null;

  const lastErrorResult = await db.execute({
    sql: `SELECT started_at, error_message FROM ah_sync_log
          WHERE platform = ? AND status = 'error'
          ORDER BY started_at DESC LIMIT 1`,
    args: [platform],
  });
  const errorStartedAt = (lastErrorResult.rows[0]?.started_at as string) || null;
  const errorMessage = (lastErrorResult.rows[0]?.error_message as string) || null;

  // Only surface the error if it's newer than the last successful sync.
  const lastError =
    errorMessage && (!lastSync || (errorStartedAt && errorStartedAt > lastSync))
      ? errorMessage
      : null;

  const accountsResult = await db.execute({
    sql: `SELECT COUNT(*) as count FROM ah_clients
          WHERE ${accountField} IS NOT NULL AND is_active = 1`,
    args: [],
  });
  const accountCount = Number(accountsResult.rows[0]?.count || 0);

  return { lastSync, accountCount, lastError };
}

// GET /api/ads-hub/settings — connection status per platform
export async function GET() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const platforms: PlatformConnectionStatus[] = [];

  const google = await getPlatformQueryResult('google', 'google_customer_id');
  platforms.push({
    platform: 'google',
    connected: await isGoogleAdsAvailableAsync(),
    ...google,
  });

  const meta = await getPlatformQueryResult('meta', 'meta_account_id');
  platforms.push({
    platform: 'meta',
    connected: await isMetaAvailable(),
    ...meta,
  });

  const ga4 = await getPlatformQueryResult('ga4', 'ga4_property_id');
  platforms.push({
    platform: 'ga4',
    connected: await isGa4AvailableAsync(),
    ...ga4,
  });

  return NextResponse.json({ platforms });
}
