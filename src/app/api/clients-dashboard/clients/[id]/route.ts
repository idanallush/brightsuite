import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';
import {
  buildClientChangeStatements,
  diffClientFields,
  type ClientChangeUserId,
} from '@/lib/clients-dashboard/client-audit';
import type { ClientSummary, MetricType } from '@/lib/clients-dashboard/types';

// GET /api/clients-dashboard/clients/[id]?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Returns a single client (active or archived) enriched with KPIs, open-alerts,
// and last-sync — same row shape as the list endpoint at
// /api/clients-dashboard/clients. Archived clients (is_active=0) are still
// returned so the detail page can render a read-only banner.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return NextResponse.json({ error: 'מזהה לקוח לא תקין' }, { status: 400 });
  }

  const search = request.nextUrl.searchParams;
  const startDate = search.get('startDate') || getMonthStart();
  const endDate = search.get('endDate') || getToday();

  const db = getTurso();

  const result = await db.execute({
    sql: `
      SELECT
        c.id,
        c.name,
        c.slug,
        c.metric_type,
        c.currency,
        c.is_active,
        c.meta_account_id,
        c.google_customer_id,
        c.ga4_property_id,
        COALESCE(p.spend, 0) AS total_spend,
        COALESCE(p.impressions, 0) AS total_impressions,
        COALESCE(p.clicks, 0) AS total_clicks,
        COALESCE(p.conversions, 0) AS total_conversions,
        COALESCE(p.revenue, 0) AS total_revenue,
        COALESCE(a.open_alerts, 0) AS open_alerts,
        s.last_sync_at
      FROM ah_clients c
      LEFT JOIN (
        SELECT client_id,
               SUM(spend) AS spend,
               SUM(impressions) AS impressions,
               SUM(clicks) AS clicks,
               SUM(conversions) AS conversions,
               SUM(revenue) AS revenue
        FROM ah_performance_daily
        WHERE date BETWEEN ? AND ? AND client_id = ?
        GROUP BY client_id
      ) p ON p.client_id = c.id
      LEFT JOIN (
        SELECT client_id, COUNT(*) AS open_alerts
        FROM cd_alerts
        WHERE status = 'open' AND client_id = ?
        GROUP BY client_id
      ) a ON a.client_id = c.id
      LEFT JOIN (
        SELECT client_id, MAX(completed_at) AS last_sync_at
        FROM ah_sync_log
        WHERE status = 'success' AND client_id = ?
        GROUP BY client_id
      ) s ON s.client_id = c.id
      WHERE c.id = ?
      LIMIT 1
    `,
    args: [startDate, endDate, numericId, numericId, numericId, numericId],
  });

  const row = result.rows[0];
  if (!row) {
    return NextResponse.json({ error: 'לא נמצא לקוח עם המזהה הזה' }, { status: 404 });
  }

  const spend = Number(row.total_spend ?? 0);
  const clicks = Number(row.total_clicks ?? 0);
  const impressions = Number(row.total_impressions ?? 0);
  const conversions = Number(row.total_conversions ?? 0);
  const revenue = Number(row.total_revenue ?? 0);
  const metricType = (row.metric_type as 'leads' | 'ecommerce' | null) ?? 'leads';

  const client: ClientSummary = {
    id: Number(row.id),
    name: String(row.name),
    slug: String(row.slug),
    metricType,
    currency: (row.currency as string) ?? 'ILS',
    isActive: Number(row.is_active ?? 0) === 1,
    hasMeta: Boolean(row.meta_account_id),
    hasGoogle: Boolean(row.google_customer_id),
    hasGa4: Boolean(row.ga4_property_id),
    totalSpend: spend,
    totalImpressions: impressions,
    totalClicks: clicks,
    totalConversions: conversions,
    totalRevenue: revenue,
    cpl: conversions > 0 ? spend / conversions : null,
    roas: spend > 0 ? revenue / spend : null,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
    cpc: clicks > 0 ? spend / clicks : null,
    openAlerts: Number(row.open_alerts ?? 0),
    lastSyncAt: (row.last_sync_at as string | null) ?? null,
  };

  return NextResponse.json({ client, range: { startDate, endDate } });
}

function getMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

// PATCH /api/clients-dashboard/clients/[id]
// Body: { metricType: 'leads' | 'ecommerce' }
// Admin-only. Updates the client's metric_type so the dashboard surfaces
// the correct primary KPI (CPL for leads, ROAS for ecommerce). Logs the
// change to cd_client_changes in the same db.batch so a failed audit insert
// rolls back the metric_type update.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;
  if (auth.session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return NextResponse.json({ error: 'מזהה לקוח לא תקין' }, { status: 400 });
  }
  const body = (await request.json().catch(() => ({}))) as { metricType?: MetricType };
  const next = body.metricType;
  if (next !== 'leads' && next !== 'ecommerce') {
    return NextResponse.json(
      { error: "metricType must be 'leads' or 'ecommerce'" },
      { status: 400 },
    );
  }

  const db = getTurso();

  // Read current row first so we can diff and log.
  const current = await db.execute({
    sql: 'SELECT * FROM ah_clients WHERE id = ?',
    args: [numericId],
  });
  if (current.rows.length === 0) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }
  const before = current.rows[0] as unknown as Record<string, unknown>;

  const diffs = diffClientFields(before, { metric_type: next });
  const auditStmts = buildClientChangeStatements({
    clientId: numericId,
    diffs,
    userId: auth.session.userId as ClientChangeUserId,
    source: 'user',
  });

  await db.batch([
    {
      sql: `UPDATE ah_clients
            SET metric_type = ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [next, numericId],
    },
    ...auditStmts,
  ]);

  return NextResponse.json({ id: numericId, metricType: next });
}

// PUT /api/clients-dashboard/clients/[id] — full client update from settings UI
// Diffs every editable field against the existing row and writes one
// cd_client_changes row per change. The UPDATE + audit inserts run in a
// single db.batch so an audit failure rolls back the user-facing update.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;
  if (auth.session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return NextResponse.json({ error: 'מזהה לקוח לא תקין' }, { status: 400 });
  }
  const body = await request.json();
  const { name, metaAccountId, googleCustomerId, googleMccId, ga4PropertyId, currency, isActive, metricType } = body;

  const db = getTurso();
  const current = await db.execute({
    sql: 'SELECT * FROM ah_clients WHERE id = ?',
    args: [numericId],
  });
  if (current.rows.length === 0) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }
  const before = current.rows[0] as unknown as Record<string, unknown>;

  // The UPDATE below uses COALESCE(?, field) so a null arg leaves the field
  // unchanged. We mirror that semantics here: only fields that will actually
  // change are included in `proposed`. That keeps the audit log consistent
  // with what the row actually becomes.
  const proposed: Record<string, unknown> = {};
  if (name) proposed.name = name;
  if (metaAccountId) proposed.meta_account_id = metaAccountId;
  if (googleCustomerId) {
    proposed.google_customer_id = String(googleCustomerId).replace(/-/g, '');
  }
  if (googleMccId) proposed.google_mcc_id = String(googleMccId).replace(/-/g, '');
  if (ga4PropertyId) proposed.ga4_property_id = ga4PropertyId;
  if (currency) proposed.currency = currency;
  if (metricType === 'ecommerce' || metricType === 'leads') proposed.metric_type = metricType;
  if (isActive !== undefined) proposed.is_active = isActive ? 1 : 0;

  const diffs = diffClientFields(before, proposed);
  const auditStmts = buildClientChangeStatements({
    clientId: numericId,
    diffs,
    userId: auth.session.userId as ClientChangeUserId,
    source: 'user',
  });

  await db.batch([
    {
      sql: `UPDATE ah_clients SET
              name = COALESCE(?, name),
              meta_account_id = COALESCE(?, meta_account_id),
              google_customer_id = COALESCE(?, google_customer_id),
              google_mcc_id = COALESCE(?, google_mcc_id),
              ga4_property_id = COALESCE(?, ga4_property_id),
              currency = COALESCE(?, currency),
              metric_type = COALESCE(?, metric_type),
              is_active = COALESCE(?, is_active),
              updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        name || null,
        metaAccountId || null,
        googleCustomerId ? String(googleCustomerId).replace(/-/g, '') : null,
        googleMccId ? String(googleMccId).replace(/-/g, '') : null,
        ga4PropertyId || null,
        currency || null,
        metricType === 'ecommerce' || metricType === 'leads' ? metricType : null,
        isActive !== undefined ? (isActive ? 1 : 0) : null,
        numericId,
      ],
    },
    ...auditStmts,
  ]);

  const updated = await db.execute({
    sql: 'SELECT * FROM ah_clients WHERE id = ?',
    args: [numericId],
  });

  return NextResponse.json({ client: updated.rows[0] });
}

// DELETE /api/clients-dashboard/clients/[id] — soft-delete client
// Flips is_active=0 instead of hard-deleting, preserving historical
// performance / change / alert data. Logs a cd_client_changes row with
// field='is_active', old_value='1', new_value='0' in the same batch.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;
  if (auth.session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return NextResponse.json({ error: 'מזהה לקוח לא תקין' }, { status: 400 });
  }

  const db = getTurso();
  const current = await db.execute({
    sql: 'SELECT id, is_active FROM ah_clients WHERE id = ?',
    args: [numericId],
  });
  if (current.rows.length === 0) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }
  const wasActive = Number(current.rows[0].is_active ?? 0) === 1;
  if (!wasActive) {
    // Already archived — return success without re-logging.
    return NextResponse.json({ success: true, alreadyArchived: true });
  }

  await db.batch([
    {
      sql: `UPDATE ah_clients
            SET is_active = 0, updated_at = datetime('now')
            WHERE id = ?`,
      args: [numericId],
    },
    {
      sql: `INSERT INTO cd_client_changes
            (client_id, field, old_value, new_value, user_id, source, note)
            VALUES (?, 'is_active', '1', '0', ?, 'user', NULL)`,
      args: [numericId, auth.session.userId ?? null],
    },
  ]);

  return NextResponse.json({ success: true });
}
