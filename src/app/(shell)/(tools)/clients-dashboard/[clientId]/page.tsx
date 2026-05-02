'use client';

import '../styles.css';
import { useState, use } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ChevronRight, BarChart3, Image as ImageIcon, History, Bell, LayoutGrid, Archive } from 'lucide-react';
import { toast } from 'sonner';
import type { ClientSummary, MetricType } from '@/lib/clients-dashboard/types';
import CampaignsTab from '@/components/clients-dashboard/campaigns/campaigns-tab';
import CreativeTab from '@/components/clients-dashboard/creative/creative-tab';
import HistoryTab from '@/components/clients-dashboard/history/history-tab';
import AlertsTab from '@/components/clients-dashboard/alerts/alerts-tab';
import ViewsTab from '@/components/clients-dashboard/views/views-tab';
import { useAuth } from '@/hooks/use-auth';

type ApiResponse = {
  client: ClientSummary;
  range: { startDate: string; endDate: string };
};

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

type Tab = 'campaigns' | 'creative' | 'history' | 'alerts' | 'views';

const TABS: Array<{ id: Tab; label: string; icon: typeof BarChart3 }> = [
  { id: 'campaigns', label: 'קמפיינים', icon: BarChart3 },
  { id: 'creative', label: 'קראייטיב', icon: ImageIcon },
  { id: 'history', label: 'היסטוריה', icon: History },
  { id: 'alerts', label: 'התראות', icon: Bell },
  { id: 'views', label: 'תצוגות', icon: LayoutGrid },
];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function isoToday(): string {
  return new Date().toISOString().split('T')[0];
}

function formatCurrency(value: number, currency: string): string {
  const symbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : currency + ' ';
  return symbol + Math.round(value).toLocaleString('he-IL');
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('he-IL');
}

export default function ClientDetailPage({
  params,
}: {
  // Next.js 16 App Router: params is a Promise. Unwrap with React.use().
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = use(params);
  const id = Number(clientId);

  const startDate = isoDaysAgo(30);
  const endDate = isoToday();

  const { data, error, isLoading, mutate } = useSWR<ApiResponse>(
    `/api/clients-dashboard/clients/${id}?startDate=${startDate}&endDate=${endDate}`,
    fetcher,
  );

  const client = data?.client ?? null;
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [tab, setTab] = useState<Tab>('campaigns');
  const [savingType, setSavingType] = useState(false);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  async function handleRestore() {
    if (!client || restoring) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/clients-dashboard/clients/${client.id}/restore`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed: ${res.status}`);
      }
      toast.success('הלקוח שוחזר');
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בשחזור');
    } finally {
      setRestoring(false);
    }
  }

  async function handleMetricTypeChange(next: MetricType) {
    if (!client || client.metricType === next || savingType) return;
    setSavingType(true);
    setTypeError(null);
    mutate(
      (current) =>
        current
          ? { ...current, client: { ...current.client, metricType: next } }
          : current,
      { revalidate: false },
    );
    try {
      const res = await fetch(`/api/clients-dashboard/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metricType: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed: ${res.status}`);
      }
      await mutate();
    } catch (err) {
      setTypeError((err as Error).message);
      await mutate();
    } finally {
      setSavingType(false);
    }
  }

  if (isLoading) {
    return <div className="cd-empty">טוען…</div>;
  }

  if (error || !client) {
    return (
      <div className="cd-card" style={{ borderColor: '#b91c1c' }}>
        <strong style={{ color: '#b91c1c' }}>לא נמצא לקוח עם המזהה {id}</strong>
        <div style={{ marginTop: 8 }}>
          <Link href="/clients-dashboard" className="cd-back-link">
            ← חזרה לרשימה
          </Link>
        </div>
      </div>
    );
  }

  const isEcom = client.metricType === 'ecommerce';
  const isArchived = !client.isActive;

  return (
    <div className="cd-root">
      <Link href="/clients-dashboard" className="cd-back-link">
        <ChevronRight size={14} />
        חזרה לרשימת לקוחות
      </Link>

      {isArchived && (
        <div className="cd-archived-banner">
          <Archive size={14} />
          <span>לקוח בארכיון — שחזר כדי לערוך</span>
          {isAdmin && (
            <button
              type="button"
              className="cd-pill cd-pill--active"
              onClick={handleRestore}
              disabled={restoring}
              style={{ marginInlineStart: 'auto' }}
            >
              {restoring ? 'משחזר…' : 'שחזר'}
            </button>
          )}
        </div>
      )}

      <div className="cd-detail-head">
        <div>
          <h1 className="cd-detail-name">{client.name}</h1>
          <div className="cd-detail-meta">
            {isAdmin && !isArchived ? (
              <div className="cd-metric-toggle" role="group" aria-label="סוג מדידה">
                <button
                  type="button"
                  className={`cd-metric-toggle__btn cd-metric-toggle__btn--leads${
                    client.metricType === 'leads' ? ' cd-metric-toggle__btn--active' : ''
                  }`}
                  onClick={() => handleMetricTypeChange('leads')}
                  disabled={savingType}
                  aria-pressed={client.metricType === 'leads'}
                >
                  לידים
                </button>
                <button
                  type="button"
                  className={`cd-metric-toggle__btn cd-metric-toggle__btn--ecommerce${
                    client.metricType === 'ecommerce' ? ' cd-metric-toggle__btn--active' : ''
                  }`}
                  onClick={() => handleMetricTypeChange('ecommerce')}
                  disabled={savingType}
                  aria-pressed={client.metricType === 'ecommerce'}
                >
                  איקומרס
                </button>
              </div>
            ) : (
              <span className={`cd-tag cd-pill--${client.metricType}`}>
                {isEcom ? 'איקומרס' : 'לידים'}
              </span>
            )}
            <span>·</span>
            <span>{client.slug}</span>
            <span>·</span>
            <span>
              {[client.hasMeta && 'Meta', client.hasGoogle && 'Google', client.hasGa4 && 'GA4']
                .filter(Boolean)
                .join(' · ') || 'אין חיבורים פעילים'}
            </span>
          </div>
          {typeError && (
            <div style={{ marginTop: 6, color: '#b91c1c', fontSize: 12 }}>
              שמירה נכשלה: {typeError}
            </div>
          )}
        </div>
      </div>

      <div className="cd-kpi-row">
        <Kpi label="הוצאה (30 ימים)" value={formatCurrency(client.totalSpend, client.currency)} />
        {isEcom ? (
          <>
            <Kpi label="הכנסה" value={formatCurrency(client.totalRevenue, client.currency)} />
            <Kpi label="ROAS" value={client.roas != null ? client.roas.toFixed(2) + 'x' : '—'} />
            <Kpi label="רכישות" value={formatNumber(client.totalConversions)} />
          </>
        ) : (
          <>
            <Kpi label="לידים" value={formatNumber(client.totalConversions)} />
            <Kpi
              label="CPL"
              value={client.cpl != null ? formatCurrency(client.cpl, client.currency) : '—'}
            />
            <Kpi label="קליקים" value={formatNumber(client.totalClicks)} />
          </>
        )}
        <Kpi label="CTR" value={client.ctr != null ? client.ctr.toFixed(2) + '%' : '—'} />
        <Kpi
          label="התראות פתוחות"
          value={String(client.openAlerts)}
          tone={client.openAlerts > 0 ? 'danger' : undefined}
        />
      </div>

      <div className="cd-tabs">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={`cd-tab${tab === t.id ? ' cd-tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'campaigns' && <CampaignsTab client={client} />}
      {tab === 'creative' && <CreativeTab client={client} />}
      {tab === 'history' && <HistoryTab client={client} />}
      {tab === 'alerts' && <AlertsTab client={client} />}
      {tab === 'views' && <ViewsTab client={client} />}
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'danger';
}) {
  return (
    <div className="cd-kpi">
      <div className="cd-kpi__label">{label}</div>
      <div
        className="cd-kpi__value cd-mono"
        style={tone === 'danger' ? { color: '#b91c1c' } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
