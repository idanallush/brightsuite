import type { Client as TursoClient } from '@libsql/client';
import { getGoogleAdsAccessToken, queryGoogleAds } from '@/lib/google/ads-api';

export interface GoogleSyncResult {
  success: true;
  google_customer_id: string;
  total_campaigns: number;
  created: number;
  updated: number;
  synced_at: string;
}

function mapGoogleStatus(status: string): 'active' | 'paused' | 'stopped' {
  switch (status) {
    case 'ENABLED': return 'active';
    case 'PAUSED': return 'paused';
    default: return 'stopped';
  }
}

/**
 * Core Google Ads sync logic — usable from HTTP endpoint or cron.
 * Customer ID and MCC ID can be overridden per call (will also persist
 * to client row) or left null to use client's stored values.
 */
export async function syncGoogleForClient(
  db: TursoClient,
  clientId: string,
  googleCustomerIdOverride: string | null,
  googleMccIdOverride: string | null,
): Promise<GoogleSyncResult> {
  const requiredEnvVars = [
    'GOOGLE_ADS_DEVELOPER_TOKEN',
    'GOOGLE_ADS_CLIENT_ID',
    'GOOGLE_ADS_CLIENT_SECRET',
    'GOOGLE_ADS_REFRESH_TOKEN',
  ];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`${envVar} not configured`);
    }
  }

  const clientResult = await db.execute({
    sql: 'SELECT * FROM bf_clients WHERE id = ? LIMIT 1',
    args: [clientId],
  });
  if (clientResult.rows.length === 0) throw new Error('Client not found');
  const client = clientResult.rows[0];

  let customerId = client.google_customer_id as string | null;
  if (googleCustomerIdOverride) {
    const cleaned = googleCustomerIdOverride.replace(/-/g, '');
    await db.execute({
      sql: 'UPDATE bf_clients SET google_customer_id = ? WHERE id = ?',
      args: [cleaned, clientId],
    });
    customerId = cleaned;
  }
  if (!customerId) throw new Error('No Google Ads Customer ID configured for this client');

  let mccId = client.google_mcc_id as string | null;
  if (googleMccIdOverride) {
    const cleanedMcc = googleMccIdOverride.replace(/-/g, '');
    await db.execute({
      sql: 'UPDATE bf_clients SET google_mcc_id = ? WHERE id = ?',
      args: [cleanedMcc, clientId],
    });
    mccId = cleanedMcc;
  }
  if (!mccId) {
    mccId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || null;
  }
  if (!mccId) throw new Error('No Google MCC ID configured for this client');

  const accessToken = await getGoogleAdsAccessToken();

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = now.toISOString().split('T')[0];

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.cost_micros,
      metrics.impressions
    FROM campaign
    WHERE segments.date BETWEEN '${monthStart}' AND '${today}'
      AND metrics.impressions > 0
  `;

  const rows = await queryGoogleAds(customerId, accessToken, query, mccId);

  const campaignMap = new Map<string, {
    id: string;
    name: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    totalCostMicros: number;
    totalImpressions: number;
  }>();

  for (const row of rows) {
    const c = row.campaign as Record<string, string>;
    const m = row.metrics as Record<string, string>;
    const cId = c.id;

    const existing = campaignMap.get(cId);
    if (existing) {
      existing.totalCostMicros += Number(m.costMicros || 0);
      existing.totalImpressions += Number(m.impressions || 0);
    } else {
      campaignMap.set(cId, {
        id: cId,
        name: c.name,
        status: c.status,
        startDate: null,
        endDate: null,
        totalCostMicros: Number(m.costMicros || 0),
        totalImpressions: Number(m.impressions || 0),
      });
    }
  }

  const existingResult = await db.execute({
    sql: 'SELECT * FROM bf_campaigns WHERE client_id = ?',
    args: [clientId],
  });
  const googleIdMap = new Map(
    existingResult.rows
      .filter((c) => c.meta_campaign_id && c.platform === 'google')
      .map((c) => [c.meta_campaign_id as string, c]),
  );

  let created = 0;
  let updated = 0;

  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  for (const [, gc] of campaignMap) {
    const spend = Math.round((gc.totalCostMicros / 1_000_000) * 100) / 100;
    const status = mapGoogleStatus(gc.status);
    const googleAdLink = `https://ads.google.com/aw/campaigns?campaignId=${gc.id}&ocid=${customerId}`;

    const existing = googleIdMap.get(gc.id);

    // Skip campaigns the user manually dismissed.
    if (existing && existing.dismissed_at) {
      continue;
    }

    if (existing) {
      await db.execute({
        sql: `UPDATE bf_campaigns SET actual_spend = ?, actual_spend_month = ?, status = ?, ad_link = ?, last_synced_at = ? WHERE id = ?`,
        args: [spend, currentMonth, status, googleAdLink, now.toISOString(), existing.id as string],
      });
      updated++;
    } else {
      const startDate = today;

      const newCampaignResult = await db.execute({
        sql: `INSERT INTO bf_campaigns (client_id, name, technical_name, platform, campaign_type, meta_campaign_id, actual_spend, actual_spend_month, status, start_date, end_date, ad_link, last_synced_at)
              VALUES (?, ?, ?, 'google', ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
        args: [
          clientId,
          gc.name,
          gc.name,
          null,
          gc.id,
          spend,
          currentMonth,
          status,
          startDate,
          gc.endDate,
          googleAdLink,
          now.toISOString(),
        ],
      });

      const newCampaign = newCampaignResult.rows[0];

      await db.execute({
        sql: `INSERT INTO bf_changelog (campaign_id, action, description, performed_by)
              VALUES (?, 'campaign_added', ?, 'Google Sync')`,
        args: [newCampaign.id as string, `קמפיין סונכרן מ-Google Ads: ${gc.name}`],
      });

      created++;
    }
  }

  return {
    success: true,
    google_customer_id: customerId,
    total_campaigns: campaignMap.size,
    created,
    updated,
    synced_at: now.toISOString(),
  };
}
