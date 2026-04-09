import { getTurso } from '@/lib/db/turso';
import * as googleAdsService from './google-ads-service';
import * as metaAdsService from './meta-ads-service';
import * as ga4Service from './ga4-service';
import type { SyncResult, Platform } from './types';

interface ClientMapping {
  id: number;
  name: string;
  meta_account_id: string | null;
  google_customer_id: string | null;
  google_mcc_id: string | null;
  ga4_property_id: string | null;
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export async function runDailySync(): Promise<{
  clients: number;
  results: Array<{ clientName: string; syncs: SyncResult[] }>;
}> {
  const db = getTurso();
  const clientsResult = await db.execute({
    sql: 'SELECT * FROM ah_clients WHERE is_active = 1',
    args: [],
  });

  const clients = clientsResult.rows as unknown as ClientMapping[];
  const yesterday = getYesterday();
  const allResults: Array<{ clientName: string; syncs: SyncResult[] }> = [];

  for (const client of clients) {
    const syncs: SyncResult[] = [];

    // Google Ads
    if (client.google_customer_id && googleAdsService.isServiceAvailable()) {
      const mccId = client.google_mcc_id || process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '';
      const result = await googleAdsService.syncDailyMetrics(
        client.id,
        client.google_customer_id,
        mccId,
        yesterday,
        yesterday
      );
      syncs.push(result);
    }

    // Meta Ads
    if (client.meta_account_id) {
      const metaAvailable = await metaAdsService.isServiceAvailable();
      if (metaAvailable) {
        const accessToken = await metaAdsService.getActiveAccessToken();
        if (accessToken) {
          const result = await metaAdsService.syncDailyMetrics(
            client.id,
            client.meta_account_id,
            accessToken,
            yesterday,
            yesterday
          );
          syncs.push(result);

          // Discover new video ads
          const videoResult = await metaAdsService.discoverVideoAds(
            client.id,
            client.meta_account_id,
            accessToken
          );
          syncs.push(videoResult);
        }
      }
    }

    // GA4
    if (client.ga4_property_id && ga4Service.isServiceAvailable()) {
      const result = await ga4Service.syncDailyMetrics(
        client.id,
        client.ga4_property_id,
        yesterday,
        yesterday
      );
      syncs.push(result);
    }

    allResults.push({ clientName: client.name, syncs });
  }

  return { clients: clients.length, results: allResults };
}

export async function runBackfill(
  clientId: number,
  platform: Platform,
  startDate: string,
  endDate: string
): Promise<SyncResult[]> {
  const db = getTurso();
  const clientResult = await db.execute({
    sql: 'SELECT * FROM ah_clients WHERE id = ?',
    args: [clientId],
  });

  if (clientResult.rows.length === 0) {
    return [{ platform, status: 'error', recordsSynced: 0, error: 'Client not found' }];
  }

  const client = clientResult.rows[0] as unknown as ClientMapping;
  const results: SyncResult[] = [];

  // Process in 7-day chunks
  const start = new Date(startDate);
  const end = new Date(endDate);

  while (start <= end) {
    const chunkEnd = new Date(start);
    chunkEnd.setDate(chunkEnd.getDate() + 6);
    if (chunkEnd > end) chunkEnd.setTime(end.getTime());

    const chunkStart = start.toISOString().split('T')[0];
    const chunkEndStr = chunkEnd.toISOString().split('T')[0];

    let result: SyncResult;

    switch (platform) {
      case 'google': {
        if (!client.google_customer_id) {
          result = { platform, status: 'skipped', recordsSynced: 0, error: 'No Google Customer ID' };
        } else {
          const mccId = client.google_mcc_id || process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '';
          result = await googleAdsService.syncDailyMetrics(
            clientId,
            client.google_customer_id,
            mccId,
            chunkStart,
            chunkEndStr
          );
        }
        break;
      }
      case 'meta': {
        if (!client.meta_account_id) {
          result = { platform, status: 'skipped', recordsSynced: 0, error: 'No Meta Account ID' };
        } else {
          const accessToken = await metaAdsService.getActiveAccessToken();
          if (!accessToken) {
            result = { platform, status: 'error', recordsSynced: 0, error: 'No active FB token' };
          } else {
            result = await metaAdsService.syncDailyMetrics(
              clientId,
              client.meta_account_id,
              accessToken,
              chunkStart,
              chunkEndStr
            );
          }
        }
        break;
      }
      case 'ga4': {
        if (!client.ga4_property_id) {
          result = { platform, status: 'skipped', recordsSynced: 0, error: 'No GA4 Property ID' };
        } else {
          result = await ga4Service.syncDailyMetrics(
            clientId,
            client.ga4_property_id,
            chunkStart,
            chunkEndStr
          );
        }
        break;
      }
    }

    results.push(result);
    start.setDate(start.getDate() + 7);
  }

  return results;
}
