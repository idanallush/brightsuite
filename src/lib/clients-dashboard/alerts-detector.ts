// Clients Dashboard — alerts detector engine.
//
// Pure functions that read from `ah_*` tables and write to `cd_alerts` /
// `cd_campaign_changes`. Each detector run is idempotent: existing open
// alerts with the same (client_id, campaign_id, kind) tuple are NOT
// duplicated, open alerts that no longer match the threshold are
// auto-resolved, and acknowledged alerts that re-trigger are re-opened
// in place (preserving the original created_at and bumping reopened_count).
//
// Detectors implemented:
//   - spend_spike     (warning):  yesterday's spend > 2× rolling 14-day avg
//   - conversion_drop (critical): yesterday's conversions = 0 AND spend > daily avg,
//                                  when prior 7 days had conversions > 0
//   - roas_drop       (warning):  ecom only — yesterday's ROAS < 0.5× 14-day avg AND spend > 100
//   - cpl_spike       (warning):  leads only — yesterday's CPL > 2× rolling 14-day avg
//   - no_data         (info):     client connected to a platform but 0 rows for last 3 days
//   - campaign_paused (info):     campaign was ACTIVE previously and is now non-active
//
// In addition to alerts, every run diffs the current `ah_campaigns`
// (status / objective / name) snapshot against the prior known values
// and writes change rows to `cd_campaign_changes` with `source='sync'`.

import { getTurso } from '@/lib/db/turso';
import type { Client as TursoClient } from '@libsql/client';

// ---------- threshold constants ----------
// All thresholds in one place so they're easy to tune.
export const THRESHOLDS = {
  spendSpikeMultiplier: 2.0,        // yesterday > 2× rolling 14-day avg
  cplSpikeMultiplier: 2.0,
  roasDropMultiplier: 0.5,          // yesterday < 0.5× 14-day avg
  roasMinSpend: 100,                // ignore tiny budgets
  conversionDropPriorDays: 7,
  noDataDays: 3,
  rollingAvgDays: 14,
} as const;

// ---------- types ----------
export interface DetectorRunSummary {
  clientsProcessed: number;
  alertsOpened: number;
  alertsResolved: number;
  changesDetected: number;
}

interface ClientRow {
  id: number;
  name: string;
  metric_type: 'leads' | 'ecommerce' | null;
  meta_account_id: string | null;
  google_customer_id: string | null;
  ga4_property_id: string | null;
  is_active: number;
}

type Severity = 'info' | 'warning' | 'critical';

interface PendingAlert {
  clientId: number;
  campaignId: number | null;
  platform: string | null;
  severity: Severity;
  kind: string;
  title: string;
  detail: string | null;
  metricValue: number | null;
  thresholdValue: number | null;
}

// ---------- date helpers ----------
function ymd(d: Date): string {
  return d.toISOString().split('T')[0];
}

function shiftDays(base: string, days: number): string {
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return ymd(d);
}

function getYesterday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return ymd(d);
}

// ---------- public entrypoint ----------

/**
 * Run all detectors across all active clients. Used by the cron route.
 * Returns aggregate counts so the caller can log them.
 */
export async function runAllDetectors(): Promise<DetectorRunSummary> {
  const db = getTurso();
  const clientsResult = await db.execute({
    sql: 'SELECT id, name, metric_type, meta_account_id, google_customer_id, ga4_property_id, is_active FROM ah_clients WHERE is_active = 1',
    args: [],
  });

  const clients = clientsResult.rows as unknown as ClientRow[];
  const summary: DetectorRunSummary = {
    clientsProcessed: 0,
    alertsOpened: 0,
    alertsResolved: 0,
    changesDetected: 0,
  };

  for (const client of clients) {
    try {
      const perClient = await runDetectorsForClient(db, client);
      summary.alertsOpened += perClient.alertsOpened;
      summary.alertsResolved += perClient.alertsResolved;
      summary.changesDetected += perClient.changesDetected;
      summary.clientsProcessed += 1;
    } catch (err) {
      console.error(`[alerts-detector] client ${client.id} failed:`, err);
    }
  }

  return summary;
}

interface PerClientCounts {
  alertsOpened: number;
  alertsResolved: number;
  changesDetected: number;
}

async function runDetectorsForClient(
  db: TursoClient,
  client: ClientRow
): Promise<PerClientCounts> {
  const yesterday = getYesterday();
  const counts: PerClientCounts = {
    alertsOpened: 0,
    alertsResolved: 0,
    changesDetected: 0,
  };

  // Detectors gather pending alerts; we then reconcile against open alerts.
  const pending: PendingAlert[] = [];

  pending.push(...(await detectSpendSpikes(db, client.id, yesterday)));
  pending.push(...(await detectConversionDrops(db, client.id, yesterday)));
  if (client.metric_type === 'ecommerce') {
    pending.push(...(await detectRoasDrops(db, client.id, yesterday)));
  } else {
    pending.push(...(await detectCplSpikes(db, client.id, yesterday)));
  }
  pending.push(...(await detectNoData(db, client)));
  pending.push(...(await detectCampaignPaused(db, client.id)));

  // Detect campaign changes (status / objective / name) — independent of alerts.
  counts.changesDetected += await detectCampaignChanges(db, client.id);

  // Reconcile pending alerts against existing open alerts.
  const reconcile = await reconcileAlerts(db, client.id, pending);
  counts.alertsOpened += reconcile.opened;
  counts.alertsResolved += reconcile.resolved;

  return counts;
}

// ============================================================
// Detectors
// ============================================================

async function detectSpendSpikes(
  db: TursoClient,
  clientId: number,
  yesterday: string
): Promise<PendingAlert[]> {
  const windowStart = shiftDays(yesterday, -THRESHOLDS.rollingAvgDays);
  const windowEnd = shiftDays(yesterday, -1);

  const result = await db.execute({
    sql: `
      SELECT
        p.platform,
        p.campaign_id AS platform_campaign_id,
        SUM(CASE WHEN p.date = ? THEN p.spend ELSE 0 END) AS yesterday_spend,
        AVG(CASE WHEN p.date BETWEEN ? AND ? THEN p.spend END) AS avg_spend
      FROM ah_performance_daily p
      WHERE p.client_id = ?
        AND p.date BETWEEN ? AND ?
      GROUP BY p.platform, p.campaign_id
      HAVING yesterday_spend > 0
    `,
    args: [yesterday, windowStart, windowEnd, clientId, windowStart, yesterday],
  });

  const out: PendingAlert[] = [];
  for (const row of result.rows) {
    const yesterdaySpend = Number(row.yesterday_spend ?? 0);
    const avgSpend = Number(row.avg_spend ?? 0);
    if (avgSpend <= 0) continue;
    const threshold = avgSpend * THRESHOLDS.spendSpikeMultiplier;
    if (yesterdaySpend <= threshold) continue;

    const platform = String(row.platform);
    const platformCampaignId = String(row.platform_campaign_id);
    const campaignId = await resolveCampaignId(db, platform, platformCampaignId);

    out.push({
      clientId,
      campaignId,
      platform,
      severity: 'warning',
      kind: 'spend_spike',
      title: 'זינוק חריג בהוצאה',
      detail: `הוצאה אתמול ₪${yesterdaySpend.toFixed(0)} לעומת ממוצע 14 יום ₪${avgSpend.toFixed(0)}`,
      metricValue: yesterdaySpend,
      thresholdValue: threshold,
    });
  }
  return out;
}

async function detectConversionDrops(
  db: TursoClient,
  clientId: number,
  yesterday: string
): Promise<PendingAlert[]> {
  const priorStart = shiftDays(yesterday, -THRESHOLDS.conversionDropPriorDays);
  const priorEnd = shiftDays(yesterday, -1);

  const result = await db.execute({
    sql: `
      SELECT
        p.platform,
        p.campaign_id AS platform_campaign_id,
        SUM(CASE WHEN p.date = ? THEN p.spend ELSE 0 END) AS yesterday_spend,
        SUM(CASE WHEN p.date = ? THEN p.conversions ELSE 0 END) AS yesterday_conv,
        SUM(CASE WHEN p.date BETWEEN ? AND ? THEN p.conversions ELSE 0 END) AS prior_conv,
        AVG(CASE WHEN p.date BETWEEN ? AND ? THEN p.spend END) AS avg_spend
      FROM ah_performance_daily p
      WHERE p.client_id = ?
        AND p.date BETWEEN ? AND ?
      GROUP BY p.platform, p.campaign_id
      HAVING yesterday_conv = 0
         AND prior_conv > 0
         AND yesterday_spend > 0
         AND yesterday_spend > avg_spend
    `,
    args: [
      yesterday, yesterday,
      priorStart, priorEnd,
      priorStart, priorEnd,
      clientId,
      priorStart, yesterday,
    ],
  });

  const out: PendingAlert[] = [];
  for (const row of result.rows) {
    const yesterdaySpend = Number(row.yesterday_spend ?? 0);
    const avgSpend = Number(row.avg_spend ?? 0);
    const platform = String(row.platform);
    const platformCampaignId = String(row.platform_campaign_id);
    const campaignId = await resolveCampaignId(db, platform, platformCampaignId);

    out.push({
      clientId,
      campaignId,
      platform,
      severity: 'critical',
      kind: 'conversion_drop',
      title: 'אין המרות אתמול',
      detail: `הוצאה ₪${yesterdaySpend.toFixed(0)} ללא המרות (ממוצע יומי ₪${avgSpend.toFixed(0)})`,
      metricValue: 0,
      thresholdValue: Number(row.prior_conv ?? 0),
    });
  }
  return out;
}

async function detectRoasDrops(
  db: TursoClient,
  clientId: number,
  yesterday: string
): Promise<PendingAlert[]> {
  const windowStart = shiftDays(yesterday, -THRESHOLDS.rollingAvgDays);
  const windowEnd = shiftDays(yesterday, -1);

  const result = await db.execute({
    sql: `
      SELECT
        p.platform,
        p.campaign_id AS platform_campaign_id,
        SUM(CASE WHEN p.date = ? THEN p.spend ELSE 0 END) AS yesterday_spend,
        SUM(CASE WHEN p.date = ? THEN p.revenue ELSE 0 END) AS yesterday_revenue,
        SUM(CASE WHEN p.date BETWEEN ? AND ? THEN p.spend ELSE 0 END) AS window_spend,
        SUM(CASE WHEN p.date BETWEEN ? AND ? THEN p.revenue ELSE 0 END) AS window_revenue
      FROM ah_performance_daily p
      WHERE p.client_id = ?
        AND p.date BETWEEN ? AND ?
      GROUP BY p.platform, p.campaign_id
      HAVING yesterday_spend > ?
    `,
    args: [
      yesterday, yesterday,
      windowStart, windowEnd,
      windowStart, windowEnd,
      clientId,
      windowStart, yesterday,
      THRESHOLDS.roasMinSpend,
    ],
  });

  const out: PendingAlert[] = [];
  for (const row of result.rows) {
    const yesterdaySpend = Number(row.yesterday_spend ?? 0);
    const yesterdayRevenue = Number(row.yesterday_revenue ?? 0);
    const windowSpend = Number(row.window_spend ?? 0);
    const windowRevenue = Number(row.window_revenue ?? 0);
    if (windowSpend <= 0 || yesterdaySpend <= 0) continue;
    const yesterdayRoas = yesterdayRevenue / yesterdaySpend;
    const avgRoas = windowRevenue / windowSpend;
    if (avgRoas <= 0) continue;
    const threshold = avgRoas * THRESHOLDS.roasDropMultiplier;
    if (yesterdayRoas >= threshold) continue;

    const platform = String(row.platform);
    const platformCampaignId = String(row.platform_campaign_id);
    const campaignId = await resolveCampaignId(db, platform, platformCampaignId);

    out.push({
      clientId,
      campaignId,
      platform,
      severity: 'warning',
      kind: 'roas_drop',
      title: 'נפילת ROAS',
      detail: `ROAS אתמול ${yesterdayRoas.toFixed(2)} לעומת ממוצע 14 יום ${avgRoas.toFixed(2)}`,
      metricValue: yesterdayRoas,
      thresholdValue: threshold,
    });
  }
  return out;
}

async function detectCplSpikes(
  db: TursoClient,
  clientId: number,
  yesterday: string
): Promise<PendingAlert[]> {
  const windowStart = shiftDays(yesterday, -THRESHOLDS.rollingAvgDays);
  const windowEnd = shiftDays(yesterday, -1);

  const result = await db.execute({
    sql: `
      SELECT
        p.platform,
        p.campaign_id AS platform_campaign_id,
        SUM(CASE WHEN p.date = ? THEN p.spend ELSE 0 END) AS yesterday_spend,
        SUM(CASE WHEN p.date = ? THEN p.conversions ELSE 0 END) AS yesterday_conv,
        SUM(CASE WHEN p.date BETWEEN ? AND ? THEN p.spend ELSE 0 END) AS window_spend,
        SUM(CASE WHEN p.date BETWEEN ? AND ? THEN p.conversions ELSE 0 END) AS window_conv
      FROM ah_performance_daily p
      WHERE p.client_id = ?
        AND p.date BETWEEN ? AND ?
      GROUP BY p.platform, p.campaign_id
      HAVING yesterday_conv > 0 AND window_conv > 0
    `,
    args: [
      yesterday, yesterday,
      windowStart, windowEnd,
      windowStart, windowEnd,
      clientId,
      windowStart, yesterday,
    ],
  });

  const out: PendingAlert[] = [];
  for (const row of result.rows) {
    const yesterdaySpend = Number(row.yesterday_spend ?? 0);
    const yesterdayConv = Number(row.yesterday_conv ?? 0);
    const windowSpend = Number(row.window_spend ?? 0);
    const windowConv = Number(row.window_conv ?? 0);
    if (yesterdayConv <= 0 || windowConv <= 0) continue;
    const yesterdayCpl = yesterdaySpend / yesterdayConv;
    const avgCpl = windowSpend / windowConv;
    if (avgCpl <= 0) continue;
    const threshold = avgCpl * THRESHOLDS.cplSpikeMultiplier;
    if (yesterdayCpl <= threshold) continue;

    const platform = String(row.platform);
    const platformCampaignId = String(row.platform_campaign_id);
    const campaignId = await resolveCampaignId(db, platform, platformCampaignId);

    out.push({
      clientId,
      campaignId,
      platform,
      severity: 'warning',
      kind: 'cpl_spike',
      title: 'עליה חדה ב-CPL',
      detail: `CPL אתמול ₪${yesterdayCpl.toFixed(1)} לעומת ממוצע 14 יום ₪${avgCpl.toFixed(1)}`,
      metricValue: yesterdayCpl,
      thresholdValue: threshold,
    });
  }
  return out;
}

async function detectNoData(
  db: TursoClient,
  client: ClientRow
): Promise<PendingAlert[]> {
  const out: PendingAlert[] = [];
  const cutoff = shiftDays(getYesterday(), -(THRESHOLDS.noDataDays - 1));

  const platforms: Array<{ key: 'meta' | 'google' | 'ga4'; configured: boolean }> = [
    { key: 'meta', configured: Boolean(client.meta_account_id) },
    { key: 'google', configured: Boolean(client.google_customer_id) },
    { key: 'ga4', configured: Boolean(client.ga4_property_id) },
  ];

  for (const platform of platforms) {
    if (!platform.configured) continue;
    const r = await db.execute({
      sql: `SELECT COUNT(*) AS n FROM ah_performance_daily WHERE client_id = ? AND platform = ? AND date >= ?`,
      args: [client.id, platform.key, cutoff],
    });
    const n = Number(r.rows[0]?.n ?? 0);
    if (n > 0) continue;

    out.push({
      clientId: client.id,
      campaignId: null,
      platform: platform.key,
      severity: 'info',
      kind: `no_data:${platform.key}`,
      title: 'לא התקבלו נתונים',
      detail: `לא נראו רשומות ב-${THRESHOLDS.noDataDays} הימים האחרונים מפלטפורמת ${platformLabel(platform.key)}`,
      metricValue: 0,
      thresholdValue: THRESHOLDS.noDataDays,
    });
  }

  return out;
}

async function detectCampaignPaused(
  db: TursoClient,
  clientId: number
): Promise<PendingAlert[]> {
  // We compare each campaign's current status against its prior status as
  // captured in cd_campaign_changes (most recent status row). If we have no
  // prior status row the campaign was just synced for the first time and we
  // skip — the change-tracker below will create the baseline row.
  const result = await db.execute({
    sql: `
      SELECT c.id AS campaign_id, c.platform, c.platform_campaign_id, c.name, c.status,
             (
               SELECT new_value FROM cd_campaign_changes ch
               WHERE ch.campaign_id = c.id AND ch.field = 'status'
               ORDER BY ch.detected_at DESC LIMIT 1
             ) AS last_known_status
      FROM ah_campaigns c
      WHERE c.client_id = ?
    `,
    args: [clientId],
  });

  const out: PendingAlert[] = [];
  for (const row of result.rows) {
    const status = (row.status as string | null) ?? '';
    const last = (row.last_known_status as string | null) ?? null;
    const isActiveNow = status.toUpperCase() === 'ACTIVE' || status.toUpperCase() === 'ENABLED';
    const wasActive = last !== null && (last.toUpperCase() === 'ACTIVE' || last.toUpperCase() === 'ENABLED');
    if (wasActive && !isActiveNow) {
      out.push({
        clientId,
        campaignId: Number(row.campaign_id),
        platform: String(row.platform),
        severity: 'info',
        kind: 'campaign_paused',
        title: 'קמפיין הושהה',
        detail: `${String(row.name ?? '')} עבר מ-${last} ל-${status || 'לא ידוע'}`,
        metricValue: null,
        thresholdValue: null,
      });
    }
  }
  return out;
}

// ============================================================
// Campaign change tracker (writes to cd_campaign_changes)
// ============================================================

async function detectCampaignChanges(db: TursoClient, clientId: number): Promise<number> {
  const campaigns = await db.execute({
    sql: `SELECT id, platform, platform_campaign_id, name, status, objective FROM ah_campaigns WHERE client_id = ?`,
    args: [clientId],
  });

  let inserted = 0;
  for (const row of campaigns.rows) {
    const campaignId = Number(row.id);
    const platform = String(row.platform);
    const platformCampaignId = String(row.platform_campaign_id);
    const fields: Array<'name' | 'status' | 'objective'> = ['name', 'status', 'objective'];

    for (const field of fields) {
      const current = (row[field] as string | null) ?? null;
      // Fetch most recent change for this field; if none, treat first row as
      // baseline (insert as 'system' source so subsequent diffs work).
      const last = await db.execute({
        sql: `SELECT new_value FROM cd_campaign_changes
              WHERE campaign_id = ? AND field = ?
              ORDER BY detected_at DESC LIMIT 1`,
        args: [campaignId, field],
      });

      if (last.rows.length === 0) {
        // Baseline insert — only if we have a value to record.
        if (current !== null && current !== '') {
          await db.execute({
            sql: `INSERT INTO cd_campaign_changes
                  (client_id, campaign_id, platform, platform_campaign_id, change_type, field, old_value, new_value, source, detected_at)
                  VALUES (?, ?, ?, ?, 'baseline', ?, NULL, ?, 'system', datetime('now'))`,
            args: [clientId, campaignId, platform, platformCampaignId, field, current],
          });
          inserted += 1;
        }
        continue;
      }

      const prev = (last.rows[0].new_value as string | null) ?? null;
      if ((prev ?? '') !== (current ?? '')) {
        await db.execute({
          sql: `INSERT INTO cd_campaign_changes
                (client_id, campaign_id, platform, platform_campaign_id, change_type, field, old_value, new_value, source, detected_at)
                VALUES (?, ?, ?, ?, 'updated', ?, ?, ?, 'sync', datetime('now'))`,
          args: [clientId, campaignId, platform, platformCampaignId, field, prev, current],
        });
        inserted += 1;
      }
    }
  }

  return inserted;
}

// ============================================================
// Reconciliation: open new alerts, auto-resolve stale ones
// ============================================================

async function reconcileAlerts(
  db: TursoClient,
  clientId: number,
  pending: PendingAlert[]
): Promise<{ opened: number; resolved: number }> {
  // Existing open alerts for this client.
  const openResult = await db.execute({
    sql: `SELECT id, campaign_id, kind FROM cd_alerts WHERE client_id = ? AND status = 'open'`,
    args: [clientId],
  });

  type OpenRow = { id: number; campaign_id: number | null; kind: string };
  const openRows = openResult.rows as unknown as OpenRow[];

  // Existing acknowledged alerts — these can be re-opened if the underlying
  // problem persists (or recurs). Keyed by (campaign_id, kind) just like opens.
  const ackResult = await db.execute({
    sql: `SELECT id, campaign_id, kind FROM cd_alerts WHERE client_id = ? AND status = 'acknowledged'`,
    args: [clientId],
  });
  type AckRow = { id: number; campaign_id: number | null; kind: string };
  const ackRows = ackResult.rows as unknown as AckRow[];

  const dedupeKey = (campaignId: number | null, kind: string) =>
    `${campaignId ?? 'null'}|${kind}`;

  const openMap = new Map<string, OpenRow>();
  for (const row of openRows) {
    openMap.set(dedupeKey(row.campaign_id, row.kind), row);
  }
  const ackMap = new Map<string, AckRow>();
  for (const row of ackRows) {
    ackMap.set(dedupeKey(row.campaign_id, row.kind), row);
  }
  const pendingKeys = new Set(pending.map((p) => dedupeKey(p.campaignId, p.kind)));

  let opened = 0;
  let resolved = 0;

  // For each pending detection: if there's already an open row, skip.
  // Otherwise, if there's an acknowledged row with the same (campaign_id, kind),
  // re-open it in place (preserving created_at) and bump reopened_count.
  // Otherwise, insert a brand-new open row.
  for (const p of pending) {
    const key = dedupeKey(p.campaignId, p.kind);
    if (openMap.has(key)) continue;

    const existingAck = ackMap.get(key);
    if (existingAck) {
      await db.execute({
        sql: `UPDATE cd_alerts
              SET status = 'open',
                  acknowledged_by = NULL,
                  acknowledged_at = NULL,
                  resolved_at = NULL,
                  metric_value = ?,
                  threshold_value = ?,
                  detail = ?,
                  reopened_count = COALESCE(reopened_count, 0) + 1
              WHERE id = ?`,
        args: [p.metricValue, p.thresholdValue, p.detail, existingAck.id],
      });
      opened += 1;
      continue;
    }

    await db.execute({
      sql: `INSERT INTO cd_alerts
            (client_id, campaign_id, platform, severity, kind, title, detail, metric_value, threshold_value, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', datetime('now'))`,
      args: [
        p.clientId,
        p.campaignId,
        p.platform,
        p.severity,
        p.kind,
        p.title,
        p.detail,
        p.metricValue,
        p.thresholdValue,
      ],
    });
    opened += 1;
  }

  // Auto-resolve open alerts that no longer match any pending detection.
  for (const row of openRows) {
    const key = dedupeKey(row.campaign_id, row.kind);
    if (pendingKeys.has(key)) continue;
    await db.execute({
      sql: `UPDATE cd_alerts SET status = 'resolved', resolved_at = datetime('now') WHERE id = ?`,
      args: [row.id],
    });
    resolved += 1;
  }

  return { opened, resolved };
}

// ============================================================
// Helpers
// ============================================================

const campaignIdCache = new Map<string, number | null>();

async function resolveCampaignId(
  db: TursoClient,
  platform: string,
  platformCampaignId: string
): Promise<number | null> {
  const key = `${platform}|${platformCampaignId}`;
  if (campaignIdCache.has(key)) return campaignIdCache.get(key) ?? null;
  const r = await db.execute({
    sql: `SELECT id FROM ah_campaigns WHERE platform = ? AND platform_campaign_id = ? LIMIT 1`,
    args: [platform, platformCampaignId],
  });
  const id = r.rows[0]?.id != null ? Number(r.rows[0].id) : null;
  campaignIdCache.set(key, id);
  return id;
}

function platformLabel(platform: 'meta' | 'google' | 'ga4'): string {
  switch (platform) {
    case 'meta':
      return 'Meta';
    case 'google':
      return 'Google Ads';
    case 'ga4':
      return 'GA4';
  }
}
