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
      campaign_budget.amount_micros,
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
    dailyBudgetMicros: number;
  }>();

  for (const row of rows) {
    const c = row.campaign as Record<string, string>;
    const m = row.metrics as Record<string, string>;
    const b = row.campaignBudget as Record<string, string> | undefined;
    const cId = c.id;
    const budgetMicros = Number(b?.amountMicros || 0);

    const existing = campaignMap.get(cId);
    if (existing) {
      existing.totalCostMicros += Number(m.costMicros || 0);
      existing.totalImpressions += Number(m.impressions || 0);
      // budget is constant across rows; keep the first non-zero we saw
      if (existing.dailyBudgetMicros === 0 && budgetMicros > 0) {
        existing.dailyBudgetMicros = budgetMicros;
      }
    } else {
      campaignMap.set(cId, {
        id: cId,
        name: c.name,
        status: c.status,
        startDate: null,
        endDate: null,
        totalCostMicros: Number(m.costMicros || 0),
        totalImpressions: Number(m.impressions || 0),
        dailyBudgetMicros: budgetMicros,
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

  // Open budget period per campaign — used to detect Google-side budget
  // changes and propagate them. Same pattern as the Meta sync.
  const openPeriodResult = await db.execute({
    sql: `SELECT campaign_id, daily_budget FROM bf_budget_periods
          WHERE end_date IS NULL AND campaign_id IN (
            SELECT id FROM bf_campaigns WHERE client_id = ?
          )`,
    args: [clientId],
  });
  const openPeriodMap = new Map<string, number>(
    openPeriodResult.rows.map((r) => [r.campaign_id as string, Number(r.daily_budget)]),
  );

  let created = 0;
  let updated = 0;

  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const seedBudgetPeriod = async (
    campaignId: string,
    campaignName: string,
    dailyBudget: number,
    startDate: string,
  ) => {
    if (dailyBudget <= 0) return;
    await db.execute({
      sql: `INSERT INTO bf_budget_periods (campaign_id, daily_budget, start_date, created_by)
            VALUES (?, ?, ?, 'Google Sync')`,
      args: [campaignId, dailyBudget, startDate],
    });
    await db.execute({
      sql: `INSERT INTO bf_changelog (campaign_id, action, description, new_value, performed_by)
            VALUES (?, 'budget_change', ?, ?, 'Google Sync')`,
      args: [
        campaignId,
        `תקציב יומי סונכרן מ-Google Ads: ₪${dailyBudget} — ${campaignName}`,
        String(dailyBudget),
      ],
    });
  };

  const propagateGoogleBudgetChange = async (
    campaignId: string,
    campaignName: string,
    oldBudget: number,
    newBudget: number,
  ) => {
    await db.execute({
      sql: `UPDATE bf_budget_periods SET end_date = ?
            WHERE campaign_id = ? AND end_date IS NULL`,
      args: [yesterdayStr, campaignId],
    });
    await db.execute({
      sql: `INSERT INTO bf_budget_periods (campaign_id, daily_budget, start_date, created_by)
            VALUES (?, ?, ?, 'Google Sync')`,
      args: [campaignId, newBudget, today],
    });
    await db.execute({
      sql: `INSERT INTO bf_changelog (campaign_id, action, description, old_value, new_value, performed_by)
            VALUES (?, 'budget_change', ?, ?, ?, 'Google Sync')`,
      args: [
        campaignId,
        `תקציב סונכרן מ-Google Ads: ₪${oldBudget} → ₪${newBudget} — ${campaignName}`,
        String(oldBudget),
        String(newBudget),
      ],
    });
  };

  for (const [, gc] of campaignMap) {
    const spend = Math.round((gc.totalCostMicros / 1_000_000) * 100) / 100;
    const dailyBudget = gc.dailyBudgetMicros > 0
      ? Math.round((gc.dailyBudgetMicros / 1_000_000) * 100) / 100
      : 0;
    const status = mapGoogleStatus(gc.status);
    const googleAdLink = `https://ads.google.com/aw/campaigns?campaignId=${gc.id}&ocid=${customerId}`;

    const existing = googleIdMap.get(gc.id);

    // Same dismissal handling as Meta: stale/old campaigns stay dismissed,
    // but a dismissed campaign that has actual current-month spend gets
    // un-dismissed (the user removed a live campaign by mistake).
    if (existing && existing.dismissed_at) {
      if (spend <= 0) continue;
      await db.execute({
        sql: 'UPDATE bf_campaigns SET dismissed_at = NULL WHERE id = ?',
        args: [existing.id as string],
      });
      existing.dismissed_at = null;
    }

    if (existing) {
      const existingId = existing.id as string;
      await db.execute({
        sql: `UPDATE bf_campaigns SET actual_spend = ?, actual_spend_month = ?, status = ?, ad_link = ?, last_synced_at = ? WHERE id = ?`,
        args: [spend, currentMonth, status, googleAdLink, now.toISOString(), existingId],
      });

      // Budget reconciliation — Google is the source of truth, mirror the
      // Meta sync logic. See meta-sync-core for the full rationale.
      if (dailyBudget > 0) {
        const currentOpenBudget = openPeriodMap.get(existingId);
        if (currentOpenBudget === undefined) {
          const seedStart = (existing.start_date as string | null) || today;
          await seedBudgetPeriod(existingId, gc.name, dailyBudget, seedStart);
        } else if (currentOpenBudget !== dailyBudget) {
          await propagateGoogleBudgetChange(existingId, gc.name, currentOpenBudget, dailyBudget);
        }
        await db.execute({
          sql: 'UPDATE bf_campaigns SET meta_daily_budget = ? WHERE id = ?',
          args: [dailyBudget, existingId],
        });
      }

      updated++;
    } else {
      const startDate = today;

      const newCampaignResult = await db.execute({
        sql: `INSERT INTO bf_campaigns (client_id, name, technical_name, platform, campaign_type, meta_campaign_id, actual_spend, actual_spend_month, status, start_date, end_date, ad_link, last_synced_at, meta_daily_budget)
              VALUES (?, ?, ?, 'google', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
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
          dailyBudget > 0 ? dailyBudget : null,
        ],
      });

      const newCampaign = newCampaignResult.rows[0];
      const newCampaignId = newCampaign.id as string;

      await db.execute({
        sql: `INSERT INTO bf_changelog (campaign_id, action, description, performed_by)
              VALUES (?, 'campaign_added', ?, 'Google Sync')`,
        args: [newCampaignId, `קמפיין סונכרן מ-Google Ads: ${gc.name}`],
      });

      await seedBudgetPeriod(newCampaignId, gc.name, dailyBudget, startDate);

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
