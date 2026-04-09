import { getTurso } from '@/lib/db/turso';
import { fbFetch, fbFetchAll } from '@/lib/facebook/client';
import { generateUtm } from './utm';
import type { SyncResult } from './types';

interface MetaInsightRow {
  campaign_id: string;
  campaign_name: string;
  impressions: string;
  clicks: string;
  spend: string;
  cpc: string;
  ctr: string;
  date_start: string;
  date_stop: string;
  actions?: Array<{ action_type: string; value: string }>;
}

interface MetaInsightsResponse {
  data: MetaInsightRow[];
  paging?: { next?: string };
}

interface MetaAdCreative {
  id: string;
  name: string;
  campaign_id: string;
  creative?: {
    id: string;
    video_id?: string;
    thumbnail_url?: string;
  };
}

interface MetaAdsResponse {
  data: MetaAdCreative[];
  paging?: { next?: string };
}

export async function isServiceAvailable(): Promise<boolean> {
  const db = getTurso();
  const result = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM bs_fb_connections WHERE is_active = 1',
    args: [],
  });
  return Number(result.rows[0]?.count ?? 0) > 0;
}

export async function getActiveAccessToken(): Promise<string | null> {
  const db = getTurso();
  const result = await db.execute({
    sql: 'SELECT access_token FROM bs_fb_connections WHERE is_active = 1 ORDER BY updated_at DESC LIMIT 1',
    args: [],
  });
  return (result.rows[0]?.access_token as string) ?? null;
}

function extractConversions(actions?: Array<{ action_type: string; value: string }>): number {
  if (!actions) return 0;
  const conversionTypes = ['lead', 'purchase', 'complete_registration', 'contact', 'submit_application'];
  let total = 0;
  for (const action of actions) {
    if (conversionTypes.includes(action.action_type)) {
      total += Number(action.value || 0);
    }
  }
  return total;
}

export async function syncDailyMetrics(
  clientId: number,
  accountId: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<SyncResult> {
  const started = new Date().toISOString();
  const db = getTurso();

  try {
    const fields = 'campaign_id,campaign_name,impressions,clicks,spend,cpc,ctr,actions';
    const path = `/${accountId}/insights?fields=${fields}&level=campaign&time_increment=1&time_range={"since":"${startDate}","until":"${endDate}"}&limit=500`;

    const response = await fbFetch<MetaInsightsResponse>(path, accessToken);
    const rows = response.data || [];

    // Fetch additional pages if available
    let allRows = [...rows];
    if (response.paging?.next) {
      const moreRows = await fbFetchAll<MetaInsightRow>(
        response.paging.next,
        accessToken,
        20
      );
      allRows = [...allRows, ...moreRows];
    }

    let recordsSynced = 0;

    for (const row of allRows) {
      const impressions = Number(row.impressions || 0);
      const clicks = Number(row.clicks || 0);
      const spend = Number(row.spend || 0);
      const conversions = extractConversions(row.actions);
      const cpc = clicks > 0 ? spend / clicks : null;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : null;
      const cpl = conversions > 0 ? spend / conversions : null;
      const date = row.date_start;

      // Upsert campaign
      await db.execute({
        sql: `INSERT INTO ah_campaigns (client_id, platform, platform_campaign_id, name, status)
              VALUES (?, 'meta', ?, ?, 'ACTIVE')
              ON CONFLICT(platform, platform_campaign_id) DO UPDATE SET
                name = excluded.name,
                updated_at = datetime('now')`,
        args: [clientId, row.campaign_id, row.campaign_name],
      });

      // Upsert daily metrics
      await db.execute({
        sql: `INSERT INTO ah_performance_daily (client_id, platform, campaign_id, date, impressions, clicks, conversions, spend, cpc, ctr, cpl)
              VALUES (?, 'meta', ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(platform, campaign_id, date) DO UPDATE SET
                impressions = excluded.impressions,
                clicks = excluded.clicks,
                conversions = excluded.conversions,
                spend = excluded.spend,
                cpc = excluded.cpc,
                ctr = excluded.ctr,
                cpl = excluded.cpl`,
        args: [clientId, row.campaign_id, date, impressions, clicks, conversions, spend, cpc, ctr, cpl],
      });

      recordsSynced++;
    }

    await db.execute({
      sql: `INSERT INTO ah_sync_log (client_id, platform, sync_type, status, records_synced, started_at, completed_at)
            VALUES (?, 'meta', 'daily', 'success', ?, ?, datetime('now'))`,
      args: [clientId, recordsSynced, started],
    });

    return { platform: 'meta', status: 'success', recordsSynced };
  } catch (err) {
    const errorMessage = (err as Error).message;

    await db.execute({
      sql: `INSERT INTO ah_sync_log (client_id, platform, sync_type, status, records_synced, error_message, started_at, completed_at)
            VALUES (?, 'meta', 'daily', 'error', 0, ?, ?, datetime('now'))`,
      args: [clientId, errorMessage, started],
    });

    return { platform: 'meta', status: 'error', recordsSynced: 0, error: errorMessage };
  }
}

export async function discoverVideoAds(
  clientId: number,
  accountId: string,
  accessToken: string
): Promise<SyncResult> {
  const started = new Date().toISOString();
  const db = getTurso();

  try {
    const fields = 'id,name,campaign_id,creative{id,video_id,thumbnail_url}';
    const path = `/${accountId}/ads?fields=${fields}&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE","PAUSED"]}]&limit=500`;

    const ads = await fbFetchAll<MetaAdCreative>(path, accessToken, 10);
    let recordsSynced = 0;

    for (const ad of ads) {
      if (!ad.creative?.video_id) continue;

      const utm = generateUtm(ad.campaign_id || 'unknown', ad.name || ad.id);

      await db.execute({
        sql: `INSERT OR IGNORE INTO ah_video_ads (client_id, meta_ad_id, meta_campaign_id, ad_name, video_id, thumbnail_url, utm_source, utm_medium, utm_campaign, utm_content)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          clientId,
          ad.id,
          ad.campaign_id || null,
          ad.name || null,
          ad.creative.video_id,
          ad.creative.thumbnail_url || null,
          utm.utm_source,
          utm.utm_medium,
          utm.utm_campaign,
          utm.utm_content,
        ],
      });

      recordsSynced++;
    }

    await db.execute({
      sql: `INSERT INTO ah_sync_log (client_id, platform, sync_type, status, records_synced, started_at, completed_at)
            VALUES (?, 'meta', 'video_discovery', 'success', ?, ?, datetime('now'))`,
      args: [clientId, recordsSynced, started],
    });

    return { platform: 'meta', status: 'success', recordsSynced };
  } catch (err) {
    const errorMessage = (err as Error).message;

    await db.execute({
      sql: `INSERT INTO ah_sync_log (client_id, platform, sync_type, status, records_synced, error_message, started_at, completed_at)
            VALUES (?, 'meta', 'video_discovery', 'error', 0, ?, ?, datetime('now'))`,
      args: [clientId, errorMessage, started],
    });

    return { platform: 'meta', status: 'error', recordsSynced: 0, error: errorMessage };
  }
}
