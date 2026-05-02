import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';
import type { AlertRecord, AlertSeverity, AlertStatus, Platform } from '@/lib/clients-dashboard/types';

// GET /api/clients-dashboard/alerts?clientId=X&status=open&severity=critical|warning|info
// Lists alerts for a client. Default: status='open', sorted by severity desc
// (critical → warning → info), then created_at desc.
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const search = request.nextUrl.searchParams;
  const clientId = search.get('clientId');
  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  const status = (search.get('status') as AlertStatus | 'all' | null) ?? 'open';
  const severity = search.get('severity') as AlertSeverity | null;

  const where: string[] = ['client_id = ?'];
  const args: (string | number)[] = [clientId];

  if (status !== 'all') {
    where.push('status = ?');
    args.push(status);
  }
  if (severity && (severity === 'critical' || severity === 'warning' || severity === 'info')) {
    where.push('severity = ?');
    args.push(severity);
  }

  const db = getTurso();
  const result = await db.execute({
    sql: `
      SELECT id, client_id, campaign_id, platform, severity, kind, title, detail,
             metric_value, threshold_value, status, acknowledged_by, acknowledged_at,
             resolved_at, reopened_count, created_at
      FROM cd_alerts
      WHERE ${where.join(' AND ')}
      ORDER BY
        CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
        created_at DESC
    `,
    args,
  });

  const alerts: AlertRecord[] = result.rows.map((row) => ({
    id: Number(row.id),
    clientId: Number(row.client_id),
    campaignId: row.campaign_id != null ? Number(row.campaign_id) : null,
    platform: (row.platform as Platform | null) ?? null,
    severity: row.severity as AlertSeverity,
    kind: String(row.kind),
    title: String(row.title),
    detail: (row.detail as string | null) ?? null,
    metricValue: row.metric_value != null ? Number(row.metric_value) : null,
    thresholdValue: row.threshold_value != null ? Number(row.threshold_value) : null,
    status: row.status as AlertStatus,
    acknowledgedBy: row.acknowledged_by != null ? Number(row.acknowledged_by) : null,
    acknowledgedAt: (row.acknowledged_at as string | null) ?? null,
    resolvedAt: (row.resolved_at as string | null) ?? null,
    reopenedCount: row.reopened_count != null ? Number(row.reopened_count) : 0,
    createdAt: String(row.created_at),
  }));

  return NextResponse.json({ alerts });
}
