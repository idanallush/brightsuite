import { getTurso } from '@/lib/db/turso';
import {
  getGoogleAdsAccessToken,
  queryGoogleAds,
  isGoogleAdsAvailable,
} from '@/lib/google/ads-api';
import type { SyncResult } from './types';

export function isServiceAvailable(): boolean {
  return isGoogleAdsAvailable();
}

export async function syncDailyMetrics(
  clientId: number,
  customerId: string,
  mccId: string,
  startDate: string,
  endDate: string
): Promise<SyncResult> {
  const started = new Date().toISOString();
  const db = getTurso();

  try {
    const accessToken = await getGoogleAdsAccessToken();

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        segments.date
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND metrics.impressions > 0
    `;

    const rows = await queryGoogleAds(customerId, accessToken, query, mccId);
    let recordsSynced = 0;

    for (const row of rows) {
      const c = row.campaign as Record<string, string>;
      const m = row.metrics as Record<string, string>;
      const s = row.segments as Record<string, string>;

      const spend = Number(m.costMicros || 0) / 1_000_000;
      const impressions = Number(m.impressions || 0);
      const clicks = Number(m.clicks || 0);
      const conversions = Number(m.conversions || 0);
      const cpc = clicks > 0 ? spend / clicks : null;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : null;
      const cpl = conversions > 0 ? spend / conversions : null;

      // Upsert campaign
      await db.execute({
        sql: `INSERT INTO ah_campaigns (client_id, platform, platform_campaign_id, name, status)
              VALUES (?, 'google', ?, ?, ?)
              ON CONFLICT(platform, platform_campaign_id) DO UPDATE SET
                name = excluded.name,
                status = excluded.status,
                updated_at = datetime('now')`,
        args: [clientId, c.id, c.name, c.status],
      });

      // Upsert daily metrics
      await db.execute({
        sql: `INSERT INTO ah_performance_daily (client_id, platform, campaign_id, date, impressions, clicks, conversions, spend, cpc, ctr, cpl)
              VALUES (?, 'google', ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(platform, campaign_id, date) DO UPDATE SET
                impressions = excluded.impressions,
                clicks = excluded.clicks,
                conversions = excluded.conversions,
                spend = excluded.spend,
                cpc = excluded.cpc,
                ctr = excluded.ctr,
                cpl = excluded.cpl`,
        args: [clientId, c.id, s.date, impressions, clicks, conversions, spend, cpc, ctr, cpl],
      });

      recordsSynced++;
    }

    // Log success
    await db.execute({
      sql: `INSERT INTO ah_sync_log (client_id, platform, sync_type, status, records_synced, started_at, completed_at)
            VALUES (?, 'google', 'daily', 'success', ?, ?, datetime('now'))`,
      args: [clientId, recordsSynced, started],
    });

    return { platform: 'google', status: 'success', recordsSynced };
  } catch (err) {
    const errorMessage = (err as Error).message;

    await db.execute({
      sql: `INSERT INTO ah_sync_log (client_id, platform, sync_type, status, records_synced, error_message, started_at, completed_at)
            VALUES (?, 'google', 'daily', 'error', 0, ?, ?, datetime('now'))`,
      args: [clientId, errorMessage, started],
    });

    return { platform: 'google', status: 'error', recordsSynced: 0, error: errorMessage };
  }
}
