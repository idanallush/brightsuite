import { getTurso } from '@/lib/db/turso';
import { getGoogleAdsAccessToken } from '@/lib/google/ads-api';
import type { SyncResult } from './types';

interface GA4ReportRow {
  dimensionValues: Array<{ value: string }>;
  metricValues: Array<{ value: string }>;
}

interface GA4ReportResponse {
  rows?: GA4ReportRow[];
  rowCount?: number;
}

export function isServiceAvailable(): boolean {
  return !!(
    process.env.GOOGLE_ADS_CLIENT_ID &&
    process.env.GOOGLE_ADS_CLIENT_SECRET &&
    process.env.GOOGLE_ADS_REFRESH_TOKEN
  );
}

export async function syncDailyMetrics(
  clientId: number,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<SyncResult> {
  const started = new Date().toISOString();
  const db = getTurso();

  try {
    // Reuse Google OAuth token (same refresh token, GA4 scope required)
    const accessToken = await getGoogleAdsAccessToken();

    const body = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'date' },
        { name: 'sessionCampaignName' },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'conversions' },
        { name: 'totalRevenue' },
      ],
    };

    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`GA4 API error: ${err}`);
    }

    const data = (await res.json()) as GA4ReportResponse;
    const rows = data.rows || [];
    let recordsSynced = 0;

    for (const row of rows) {
      // date format from GA4: YYYYMMDD → YYYY-MM-DD
      const rawDate = row.dimensionValues[0].value;
      const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
      const campaignName = row.dimensionValues[1].value || '(not set)';

      const sessions = Number(row.metricValues[0].value || 0);
      const conversions = Number(row.metricValues[1].value || 0);
      // GA4 doesn't have spend — we use sessions as impressions proxy
      const spend = 0;

      // Upsert campaign
      await db.execute({
        sql: `INSERT INTO ah_campaigns (client_id, platform, platform_campaign_id, name, status)
              VALUES (?, 'ga4', ?, ?, 'ACTIVE')
              ON CONFLICT(platform, platform_campaign_id) DO UPDATE SET
                name = excluded.name,
                updated_at = datetime('now')`,
        args: [clientId, `ga4_${campaignName}`, campaignName],
      });

      // Upsert daily metrics
      await db.execute({
        sql: `INSERT INTO ah_performance_daily (client_id, platform, campaign_id, date, impressions, clicks, conversions, spend, cpc, ctr, cpl)
              VALUES (?, 'ga4', ?, ?, ?, 0, ?, ?, NULL, NULL, NULL)
              ON CONFLICT(platform, campaign_id, date) DO UPDATE SET
                impressions = excluded.impressions,
                conversions = excluded.conversions,
                spend = excluded.spend`,
        args: [clientId, `ga4_${campaignName}`, date, sessions, conversions, spend],
      });

      recordsSynced++;
    }

    await db.execute({
      sql: `INSERT INTO ah_sync_log (client_id, platform, sync_type, status, records_synced, started_at, completed_at)
            VALUES (?, 'ga4', 'daily', 'success', ?, ?, datetime('now'))`,
      args: [clientId, recordsSynced, started],
    });

    return { platform: 'ga4', status: 'success', recordsSynced };
  } catch (err) {
    const errorMessage = (err as Error).message;

    await db.execute({
      sql: `INSERT INTO ah_sync_log (client_id, platform, sync_type, status, records_synced, error_message, started_at, completed_at)
            VALUES (?, 'ga4', 'daily', 'error', 0, ?, ?, datetime('now'))`,
      args: [clientId, errorMessage, started],
    });

    return { platform: 'ga4', status: 'error', recordsSynced: 0, error: errorMessage };
  }
}
