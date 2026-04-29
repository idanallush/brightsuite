import type { Client as TursoClient } from '@libsql/client';

const META_API_VERSION = 'v21.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export interface MetaSyncResult {
  success: true;
  ad_account_id: string;
  total_meta_campaigns: number;
  created: number;
  updated: number;
  synced_at: string;
  message?: string;
}

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  start_time?: string;
  stop_time?: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

interface MetaAdSet {
  id: string;
  status: string;
  daily_budget?: string;
}

interface MetaInsight {
  campaign_id: string;
  campaign_name: string;
  spend: string;
  impressions: string;
  date_start: string;
  date_stop: string;
}

async function fetchMonthlyInsights(adAccountId: string, accessToken: string): Promise<MetaInsight[]> {
  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = now.toISOString().split('T')[0];

  const url = `${META_BASE_URL}/${adAccountId}/insights?fields=campaign_id,campaign_name,spend,impressions&level=campaign&time_range={"since":"${firstDay}","until":"${today}"}&limit=500&access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Meta Insights API error: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return data.data ?? [];
}

async function fetchCampaignDetails(campaignIds: string[], accessToken: string): Promise<MetaCampaign[]> {
  const results: MetaCampaign[] = [];

  for (let i = 0; i < campaignIds.length; i += 50) {
    const chunk = campaignIds.slice(i, i + 50);
    const ids = chunk.join(',');
    const url = `${META_BASE_URL}/?ids=${ids}&fields=id,name,status,objective,start_time,stop_time,daily_budget,lifetime_budget&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Meta API error: ${JSON.stringify(err)}`);
    }
    const data = await res.json() as Record<string, MetaCampaign>;
    for (const id of chunk) {
      if (data[id]) results.push(data[id]);
    }
  }

  return results;
}

/**
 * Returns campaign_id → daily budget in major currency units (₪, $, €).
 * Meta returns budgets as integer strings in the smallest unit (agorot/cents);
 * we divide by 100 since every currency BudgetFlow targets has 2 decimals.
 *
 * Source order:
 *   1. campaign.daily_budget (CBO — campaign-level budget)
 *   2. sum of ACTIVE adsets' daily_budget (ABO — adset-level budgets)
 *   3. 0 (campaign uses lifetime budget or has none — user can edit manually)
 */
async function computeDailyBudgets(
  campaigns: MetaCampaign[],
  accessToken: string,
): Promise<Map<string, number>> {
  const budgetMap = new Map<string, number>();
  const needAdsets: string[] = [];

  for (const c of campaigns) {
    const cbo = Number(c.daily_budget ?? 0);
    if (cbo > 0) {
      budgetMap.set(c.id, cbo / 100);
    } else {
      needAdsets.push(c.id);
    }
  }

  // Fetch adsets in parallel for campaigns without CBO. Meta tolerates ~50
  // concurrent calls per token; chunk just in case.
  for (let i = 0; i < needAdsets.length; i += 25) {
    const chunk = needAdsets.slice(i, i + 25);
    await Promise.all(
      chunk.map(async (campaignId) => {
        try {
          const url = `${META_BASE_URL}/${campaignId}/adsets?fields=id,status,daily_budget&limit=200&access_token=${accessToken}`;
          const res = await fetch(url);
          if (!res.ok) {
            budgetMap.set(campaignId, 0);
            return;
          }
          const data = await res.json() as { data?: MetaAdSet[] };
          const adsets = data.data ?? [];
          const sum = adsets
            .filter((a) => a.status === 'ACTIVE')
            .reduce((acc, a) => acc + (Number(a.daily_budget) || 0), 0);
          budgetMap.set(campaignId, sum / 100);
        } catch {
          budgetMap.set(campaignId, 0);
        }
      }),
    );
  }

  return budgetMap;
}

async function fetchTopAdLink(
  campaignId: string,
  adAccountId: string,
  accessToken: string,
  monthStart: string,
  today: string,
): Promise<string> {
  const accountNum = adAccountId.replace('act_', '');

  try {
    const insightsUrl = `${META_BASE_URL}/${campaignId}/insights?fields=ad_id&level=ad&time_range={"since":"${monthStart}","until":"${today}"}&sort=spend_descending&limit=1&access_token=${accessToken}`;
    const insightsRes = await fetch(insightsUrl);

    if (!insightsRes.ok) {
      return `https://www.facebook.com/adsmanager/manage/ads?act=${accountNum}&campaign_ids=${campaignId}`;
    }

    const insightsData = await insightsRes.json();
    const topAdId = insightsData.data?.[0]?.ad_id;

    if (!topAdId) {
      return `https://www.facebook.com/adsmanager/manage/ads?act=${accountNum}&campaign_ids=${campaignId}`;
    }

    const adUrl = `${META_BASE_URL}/${topAdId}?fields=preview_shareable_link&access_token=${accessToken}`;
    const adRes = await fetch(adUrl);

    if (!adRes.ok) {
      return `https://www.facebook.com/adsmanager/manage/ads?act=${accountNum}&selected_ad_ids=${topAdId}`;
    }

    const adData = await adRes.json();

    if (adData.preview_shareable_link) {
      return adData.preview_shareable_link;
    }

    return `https://www.facebook.com/adsmanager/manage/ads?act=${accountNum}&selected_ad_ids=${topAdId}`;
  } catch {
    return `https://www.facebook.com/adsmanager/manage/ads?act=${accountNum}&campaign_ids=${campaignId}`;
  }
}

async function fetchActiveCampaigns(adAccountId: string, accessToken: string): Promise<MetaCampaign[]> {
  const url = `${META_BASE_URL}/${adAccountId}/campaigns?fields=id,name,status,objective,start_time,stop_time,daily_budget,lifetime_budget&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&limit=500&access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn('Failed to fetch active campaigns:', await res.text());
    return [];
  }
  const data = await res.json();
  return data.data ?? [];
}

function mapMetaStatus(metaStatus: string, startTime?: string): 'active' | 'paused' | 'stopped' | 'scheduled' {
  switch (metaStatus) {
    case 'ACTIVE':
      if (startTime && new Date(startTime) > new Date()) return 'scheduled';
      return 'active';
    case 'PAUSED': return 'paused';
    case 'SCHEDULED': return 'scheduled';
    default: return 'stopped';
  }
}

/**
 * Core Meta sync logic — usable from HTTP endpoint or cron.
 * Pass an already-formatted ad_account_id (with act_ prefix) when known;
 * otherwise pass null and the client's stored value will be used.
 */
export async function syncMetaForClient(
  db: TursoClient,
  clientId: string,
  adAccountIdOverride: string | null,
  accessToken: string,
): Promise<MetaSyncResult> {
  const clientResult = await db.execute({
    sql: 'SELECT * FROM bf_clients WHERE id = ? LIMIT 1',
    args: [clientId],
  });
  if (clientResult.rows.length === 0) throw new Error('Client not found');
  const client = clientResult.rows[0];

  let accountId = client.meta_ad_account_id as string | null;
  if (adAccountIdOverride) {
    const formatted = adAccountIdOverride.startsWith('act_') ? adAccountIdOverride : `act_${adAccountIdOverride}`;
    await db.execute({
      sql: 'UPDATE bf_clients SET meta_ad_account_id = ? WHERE id = ?',
      args: [formatted, clientId],
    });
    accountId = formatted;
  }
  if (!accountId) throw new Error('No Meta Ad Account ID configured for this client');

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const todayStr = now.toISOString().split('T')[0];

  const monthlyInsights = await fetchMonthlyInsights(accountId, accessToken);

  const activeInsights = monthlyInsights.filter(
    (i) => Number(i.spend) > 0 || Number(i.impressions) > 0,
  );

  const spendMap = new Map<string, number>();
  for (const insight of activeInsights) {
    spendMap.set(insight.campaign_id, Number(insight.spend) || 0);
  }

  const activeCampaignIds = activeInsights.map((i) => i.campaign_id);
  let metaCampaigns: MetaCampaign[] = [];
  if (activeCampaignIds.length > 0) {
    metaCampaigns = await fetchCampaignDetails(activeCampaignIds, accessToken);
  }

  const activeCampaigns = await fetchActiveCampaigns(accountId, accessToken);
  const existingIds = new Set(metaCampaigns.map((c) => c.id));
  for (const ac of activeCampaigns) {
    if (!existingIds.has(ac.id)) {
      metaCampaigns.push(ac);
    }
  }

  if (metaCampaigns.length === 0) {
    return {
      success: true,
      ad_account_id: accountId,
      total_meta_campaigns: 0,
      created: 0,
      updated: 0,
      synced_at: now.toISOString(),
      message: 'No campaigns with activity or active/scheduled this month',
    };
  }

  const dailyBudgetMap = await computeDailyBudgets(metaCampaigns, accessToken);

  const existingResult = await db.execute({
    sql: 'SELECT * FROM bf_campaigns WHERE client_id = ?',
    args: [clientId],
  });
  const metaIdMap = new Map(
    existingResult.rows
      .filter((c) => c.meta_campaign_id)
      .map((c) => [c.meta_campaign_id as string, c]),
  );

  // Look up which existing campaigns already have an open budget period
  // (end_date IS NULL). If they do, the user has either accepted Meta's
  // initial value or edited manually — leave their budget alone. If not,
  // we'll seed one from the Meta value below.
  const openPeriodResult = await db.execute({
    sql: `SELECT campaign_id FROM bf_budget_periods
          WHERE end_date IS NULL AND campaign_id IN (
            SELECT id FROM bf_campaigns WHERE client_id = ?
          )`,
    args: [clientId],
  });
  const hasOpenPeriod = new Set(openPeriodResult.rows.map((r) => r.campaign_id as string));

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
            VALUES (?, ?, ?, 'Meta Sync')`,
      args: [campaignId, dailyBudget, startDate],
    });
    await db.execute({
      sql: `INSERT INTO bf_changelog (campaign_id, action, description, new_value, performed_by)
            VALUES (?, 'budget_change', ?, ?, 'Meta Sync')`,
      args: [
        campaignId,
        `תקציב יומי סונכרן מ-Meta: ₪${dailyBudget} — ${campaignName}`,
        String(dailyBudget),
      ],
    });
  };

  // Close current open period and open a new one with the Meta value.
  // Used when Meta's daily budget has changed since we last looked.
  const propagateMetaBudgetChange = async (
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
            VALUES (?, ?, ?, 'Meta Sync')`,
      args: [campaignId, newBudget, todayStr],
    });
    await db.execute({
      sql: `INSERT INTO bf_changelog (campaign_id, action, description, old_value, new_value, performed_by)
            VALUES (?, 'budget_change', ?, ?, ?, 'Meta Sync')`,
      args: [
        campaignId,
        `תקציב סונכרן מ-Meta: ₪${oldBudget} → ₪${newBudget} — ${campaignName}`,
        String(oldBudget),
        String(newBudget),
      ],
    });
  };

  for (const mc of metaCampaigns) {
    const spend = spendMap.get(mc.id) ?? 0;
    const status = mapMetaStatus(mc.status, mc.start_time);
    const existing = metaIdMap.get(mc.id);
    const dailyBudget = dailyBudgetMap.get(mc.id) ?? 0;

    // Dismissal handling. The dismissal exists to keep stale Meta entries
    // (PAUSED months ago, but Meta still reports them) from re-appearing.
    // If a dismissed campaign has current-month spend, it's a real active
    // campaign the user (or their bulk-delete) removed by mistake — bring
    // it back automatically. Otherwise honor the dismissal and skip.
    if (existing && existing.dismissed_at) {
      if (spend <= 0) continue;
      await db.execute({
        sql: 'UPDATE bf_campaigns SET dismissed_at = NULL WHERE id = ?',
        args: [existing.id as string],
      });
      existing.dismissed_at = null;
    }

    const adLink = await fetchTopAdLink(mc.id, accountId, accessToken, monthStart, todayStr);

    if (existing) {
      const existingId = existing.id as string;
      await db.execute({
        sql: `UPDATE bf_campaigns SET actual_spend = ?, actual_spend_month = ?, status = ?, ad_link = ?, last_synced_at = ? WHERE id = ?`,
        args: [spend, currentMonth, status, adLink, now.toISOString(), existingId],
      });

      // Budget reconciliation against Meta.
      //
      // We track the *last Meta-reported* daily budget on the campaign row
      // (meta_daily_budget). On each sync:
      //   - If Meta reports a budget for the first time → seed a period
      //     (when none exists) and record the baseline.
      //   - If Meta's value changed since last sync → close the open period
      //     and create a new one at Meta's value. This means Meta-side
      //     changes flow through even if the user previously edited
      //     manually — manual edits are a stopgap, Meta is the source of
      //     truth when it moves.
      //   - If Meta hasn't moved → leave everything alone (manual edits
      //     stick).
      // dailyBudget=0 means Meta returned no daily budget (e.g. lifetime
      // budget) — we don't propagate zero, leave whatever the user has.
      if (dailyBudget > 0) {
        const lastMetaBudget =
          existing.meta_daily_budget !== null && existing.meta_daily_budget !== undefined
            ? Number(existing.meta_daily_budget)
            : null;

        if (lastMetaBudget === null) {
          if (!hasOpenPeriod.has(existingId)) {
            const seedStart = (existing.start_date as string | null) || todayStr;
            await seedBudgetPeriod(existingId, mc.name, dailyBudget, seedStart);
          }
          await db.execute({
            sql: 'UPDATE bf_campaigns SET meta_daily_budget = ? WHERE id = ?',
            args: [dailyBudget, existingId],
          });
        } else if (dailyBudget !== lastMetaBudget) {
          await propagateMetaBudgetChange(existingId, mc.name, lastMetaBudget, dailyBudget);
          await db.execute({
            sql: 'UPDATE bf_campaigns SET meta_daily_budget = ? WHERE id = ?',
            args: [dailyBudget, existingId],
          });
        }
      }

      updated++;
    } else {
      const startDate = mc.start_time ? mc.start_time.split('T')[0] : todayStr;
      const endDate = mc.stop_time ? mc.stop_time.split('T')[0] : null;

      const newCampaignResult = await db.execute({
        sql: `INSERT INTO bf_campaigns (client_id, name, technical_name, platform, campaign_type, meta_campaign_id, actual_spend, actual_spend_month, ad_link, status, start_date, end_date, last_synced_at, meta_daily_budget)
              VALUES (?, ?, ?, 'facebook', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
        args: [
          clientId,
          mc.name,
          mc.name,
          mc.objective || null,
          mc.id,
          spend,
          currentMonth,
          adLink,
          status,
          startDate,
          endDate,
          now.toISOString(),
          dailyBudget > 0 ? dailyBudget : null,
        ],
      });

      const newCampaign = newCampaignResult.rows[0];
      const newCampaignId = newCampaign.id as string;

      await db.execute({
        sql: `INSERT INTO bf_changelog (campaign_id, action, description, performed_by)
              VALUES (?, 'campaign_added', ?, 'Meta Sync')`,
        args: [newCampaignId, `קמפיין סונכרן מ-Meta: ${mc.name}`],
      });

      await seedBudgetPeriod(newCampaignId, mc.name, dailyBudget, startDate);

      created++;
    }
  }

  return {
    success: true,
    ad_account_id: accountId,
    total_meta_campaigns: metaCampaigns.length,
    created,
    updated,
    synced_at: now.toISOString(),
  };
}
