'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, AlertTriangle, Check, Info, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import type {
  AlertRecord,
  AlertSeverity,
  AlertStatus,
  ClientSummary,
} from '@/lib/clients-dashboard/types';

interface AlertsTabProps {
  client: ClientSummary;
}

interface AlertsResponse {
  alerts: AlertRecord[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const SEVERITY_ORDER: AlertSeverity[] = ['critical', 'warning', 'info'];

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  critical: 'קריטי',
  warning: 'אזהרה',
  info: 'מידע',
};

const STATUS_LABEL: Record<AlertStatus | 'all', string> = {
  open: 'פתוח',
  acknowledged: 'אושר',
  resolved: 'פתור',
  all: 'הכל',
};

type SeverityFilter = AlertSeverity | 'all';
type StatusFilter = AlertStatus | 'all';

export default function AlertsTab({ client }: AlertsTabProps) {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  const url = useMemo(() => {
    const params = new URLSearchParams({ clientId: String(client.id) });
    params.set('status', statusFilter);
    if (severityFilter !== 'all') params.set('severity', severityFilter);
    return `/api/clients-dashboard/alerts?${params.toString()}`;
  }, [client.id, severityFilter, statusFilter]);

  const { data, isLoading, mutate } = useSWR<AlertsResponse>(url, fetcher);
  const alerts = data?.alerts ?? [];

  const handlePatch = async (alertId: number, status: AlertStatus) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.add(alertId);
      return next;
    });
    try {
      const res = await fetch(`/api/clients-dashboard/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `שגיאה בעדכון סטטוס ההתראה (${res.status})`);
      }
      toast.success('סטטוס ההתראה עודכן');
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בעדכון סטטוס ההתראה');
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  };

  return (
    <div className="cd-alert-tab">
      <div className="cd-alert-filters">
        <div className="cd-alert-filter-group">
          <span className="cd-alert-filter-label">חומרה:</span>
          <button
            className={`cd-pill ${severityFilter === 'all' ? 'cd-pill--active' : ''}`}
            onClick={() => setSeverityFilter('all')}
            type="button"
          >
            הכל
          </button>
          {SEVERITY_ORDER.map((s) => (
            <button
              key={s}
              className={`cd-pill ${severityFilter === s ? 'cd-pill--active' : ''}`}
              onClick={() => setSeverityFilter(s)}
              type="button"
            >
              {SEVERITY_LABEL[s]}
            </button>
          ))}
        </div>
        <div className="cd-alert-filter-group">
          <span className="cd-alert-filter-label">סטטוס:</span>
          {(['open', 'acknowledged', 'resolved', 'all'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              className={`cd-pill ${statusFilter === s ? 'cd-pill--active' : ''}`}
              onClick={() => setStatusFilter(s)}
              type="button"
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="cd-alert-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="cd-alert-card cd-alert-card--skeleton" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="cd-empty">
          <strong>אין התראות</strong>
          <div>לא נמצאו התראות התואמות לסינון הנוכחי.</div>
        </div>
      ) : (
        <div className="cd-alert-list">
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              currency={client.currency}
              pending={pendingIds.has(alert.id)}
              onPatch={handlePatch}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface AlertCardProps {
  alert: AlertRecord;
  currency: string;
  pending: boolean;
  onPatch: (id: number, status: AlertStatus) => Promise<void>;
}

function AlertCard({ alert, currency, pending, onPatch }: AlertCardProps) {
  const Icon =
    alert.severity === 'critical'
      ? AlertCircle
      : alert.severity === 'warning'
      ? AlertTriangle
      : Info;

  const handle = (status: AlertStatus) => {
    void onPatch(alert.id, status);
  };

  return (
    <div className={`cd-alert-card cd-alert-card--${alert.severity}`}>
      <div className="cd-alert-card__icon">
        <Icon size={18} />
      </div>
      <div className="cd-alert-card__body">
        <div className="cd-alert-card__head">
          <h4 className="cd-alert-card__title">{alert.title}</h4>
          <span className={`cd-alert-card__sev cd-alert-card__sev--${alert.severity}`}>
            {SEVERITY_LABEL[alert.severity]}
          </span>
        </div>
        {alert.detail && <p className="cd-alert-card__detail">{alert.detail}</p>}
        <MetricBar
          metric={alert.metricValue}
          threshold={alert.thresholdValue}
          severity={alert.severity}
          kind={alert.kind}
        />
        <div className="cd-alert-card__meta">
          <span>{formatDate(alert.createdAt)}</span>
          {alert.platform && <span>· {alert.platform}</span>}
          {alert.status !== 'open' && (
            <span>· {STATUS_LABEL[alert.status]}</span>
          )}
          {currency ? <span className="cd-alert-card__hidden-currency">{currency}</span> : null}
        </div>
      </div>
      <div className="cd-alert-card__actions">
        {alert.status === 'open' && (
          <>
            <button
              className="cd-alert-btn"
              type="button"
              disabled={pending}
              onClick={() => handle('acknowledged')}
            >
              {pending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}{' '}
              אישור
            </button>
            <button
              className="cd-alert-btn cd-alert-btn--primary"
              type="button"
              disabled={pending}
              onClick={() => handle('resolved')}
            >
              {pending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : null}{' '}
              פתור
            </button>
          </>
        )}
        {alert.status === 'acknowledged' && (
          <button
            className="cd-alert-btn cd-alert-btn--primary"
            type="button"
            disabled={pending}
            onClick={() => handle('resolved')}
          >
            {pending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : null}{' '}
            פתור
          </button>
        )}
        {alert.status === 'resolved' && (
          <button
            className="cd-alert-btn"
            type="button"
            disabled={pending}
            onClick={() => handle('open')}
          >
            {pending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RotateCcw size={14} />
            )}{' '}
            פתוח שוב
          </button>
        )}
      </div>
    </div>
  );
}

function MetricBar({
  metric,
  threshold,
  severity,
  kind,
}: {
  metric: number | null;
  threshold: number | null;
  severity: AlertSeverity;
  kind: string;
}) {
  if (metric == null || threshold == null || threshold <= 0) return null;
  // For "drop" alerts the metric is below threshold, so flip the visualization.
  const isDrop = kind.includes('drop');
  const ratio = isDrop ? metric / threshold : metric / threshold;
  const pct = Math.min(200, Math.max(0, ratio * 100));
  return (
    <div className="cd-alert-bar">
      <div className="cd-alert-bar__track">
        <div
          className={`cd-alert-bar__fill cd-alert-bar__fill--${severity}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <div className="cd-alert-bar__legend">
        <span>נוכחי: {formatNum(metric)}</span>
        <span>סף: {formatNum(threshold)}</span>
      </div>
    </div>
  );
}

function formatNum(n: number): string {
  if (Math.abs(n) >= 1000) return n.toFixed(0);
  if (Math.abs(n) >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

function formatDate(iso: string): string {
  return new Date(iso.includes('T') ? iso : `${iso}Z`).toLocaleString('he-IL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
