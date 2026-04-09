import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';
import { isGoogleAdsAvailable } from '@/lib/google/ads-api';
import { isServiceAvailable as isMetaAvailable } from '@/lib/ads-hub/meta-ads-service';
import { isServiceAvailable as isGa4Available } from '@/lib/ads-hub/ga4-service';
import type { PlatformConnectionStatus } from '@/lib/ads-hub/types';

// GET /api/ads-hub/settings — connection status per platform
export async function GET() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const db = getTurso();

  const platforms: PlatformConnectionStatus[] = [];

  // Google Ads
  const googleConnected = isGoogleAdsAvailable();
  const googleLastSync = await db.execute({
    sql: `SELECT started_at, error_message FROM ah_sync_log WHERE platform = 'google' AND status = 'success' ORDER BY started_at DESC LIMIT 1`,
    args: [],
  });
  const googleAccounts = await db.execute({
    sql: `SELECT COUNT(*) as count FROM ah_clients WHERE google_customer_id IS NOT NULL AND is_active = 1`,
    args: [],
  });
  const googleLastError = await db.execute({
    sql: `SELECT error_message FROM ah_sync_log WHERE platform = 'google' AND status = 'error' ORDER BY started_at DESC LIMIT 1`,
    args: [],
  });

  platforms.push({
    platform: 'google',
    connected: googleConnected,
    lastSync: (googleLastSync.rows[0]?.started_at as string) || null,
    accountCount: Number(googleAccounts.rows[0]?.count || 0),
    lastError: (googleLastError.rows[0]?.error_message as string) || null,
  });

  // Meta
  const metaConnected = await isMetaAvailable();
  const metaLastSync = await db.execute({
    sql: `SELECT started_at FROM ah_sync_log WHERE platform = 'meta' AND status = 'success' ORDER BY started_at DESC LIMIT 1`,
    args: [],
  });
  const metaAccounts = await db.execute({
    sql: `SELECT COUNT(*) as count FROM ah_clients WHERE meta_account_id IS NOT NULL AND is_active = 1`,
    args: [],
  });
  const metaLastError = await db.execute({
    sql: `SELECT error_message FROM ah_sync_log WHERE platform = 'meta' AND status = 'error' ORDER BY started_at DESC LIMIT 1`,
    args: [],
  });

  platforms.push({
    platform: 'meta',
    connected: metaConnected,
    lastSync: (metaLastSync.rows[0]?.started_at as string) || null,
    accountCount: Number(metaAccounts.rows[0]?.count || 0),
    lastError: (metaLastError.rows[0]?.error_message as string) || null,
  });

  // GA4
  const ga4Connected = isGa4Available();
  const ga4LastSync = await db.execute({
    sql: `SELECT started_at FROM ah_sync_log WHERE platform = 'ga4' AND status = 'success' ORDER BY started_at DESC LIMIT 1`,
    args: [],
  });
  const ga4Accounts = await db.execute({
    sql: `SELECT COUNT(*) as count FROM ah_clients WHERE ga4_property_id IS NOT NULL AND is_active = 1`,
    args: [],
  });
  const ga4LastError = await db.execute({
    sql: `SELECT error_message FROM ah_sync_log WHERE platform = 'ga4' AND status = 'error' ORDER BY started_at DESC LIMIT 1`,
    args: [],
  });

  platforms.push({
    platform: 'ga4',
    connected: ga4Connected,
    lastSync: (ga4LastSync.rows[0]?.started_at as string) || null,
    accountCount: Number(ga4Accounts.rows[0]?.count || 0),
    lastError: (ga4LastError.rows[0]?.error_message as string) || null,
  });

  return NextResponse.json({ platforms });
}
