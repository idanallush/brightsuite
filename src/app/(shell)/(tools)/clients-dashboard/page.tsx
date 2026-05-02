'use client';

import './styles.css';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Search, AlertTriangle, Settings, Archive, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { ClientSummary, MetricType } from '@/lib/clients-dashboard/types';

type ApiResponse = {
  clients: ClientSummary[];
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

const RANGE_PRESETS: Array<{ id: string; label: string; days: number }> = [
  { id: '7d', label: '7 ימים', days: 7 },
  { id: '14d', label: '14 ימים', days: 14 },
  { id: '30d', label: '30 ימים', days: 30 },
  { id: '90d', label: '90 ימים', days: 90 },
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

export default function ClientsDashboardPage() {
  const [rangeId, setRangeId] = useState<string>('30d');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | MetricType>('all');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const range = RANGE_PRESETS.find((r) => r.id === rangeId) ?? RANGE_PRESETS[2];
  const startDate = isoDaysAgo(range.days);
  const endDate = isoToday();

  const apiUrl = `/api/clients-dashboard/clients?startDate=${startDate}&endDate=${endDate}`;
  const { data, error, isLoading, mutate: mutateActive } = useSWR<ApiResponse>(apiUrl, fetcher);

  // Lazy-load archived clients only when the user expands the section.
  const archivedUrl = `/api/clients-dashboard/clients?startDate=${startDate}&endDate=${endDate}&includeArchived=1`;
  const {
    data: archivedData,
    isLoading: archivedLoading,
    mutate: mutateArchived,
  } = useSWR<ApiResponse>(archiveOpen ? archivedUrl : null, fetcher);

  const filteredClients = useMemo(() => {
    const all = data?.clients ?? [];
    return all.filter((c) => {
      if (typeFilter !== 'all' && c.metricType !== typeFilter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [data, search, typeFilter]);

  const totals = useMemo(() => {
    const list = filteredClients;
    return {
      clients: list.length,
      spend: list.reduce((s, c) => s + c.totalSpend, 0),
      revenue: list.reduce((s, c) => s + c.totalRevenue, 0),
      conversions: list.reduce((s, c) => s + c.totalConversions, 0),
      alerts: list.reduce((s, c) => s + c.openAlerts, 0),
    };
  }, [filteredClients]);

  return (
    <div className="cd-root">
      <div className="cd-page-head">
        <div>
          <h1 className="cd-page-head__title">Clients Dashboard</h1>
          <p className="cd-page-head__lede">
            תצוגת-על על כל הלקוחות — Meta, Google, GA4 — לפי הפרדה של איקומרס מול לידים.
          </p>
        </div>
        <div className="cd-toolbar">
          <div className="cd-toolbar__group">
            {RANGE_PRESETS.map((r) => (
              <button
                key={r.id}
                className={`cd-pill${rangeId === r.id ? ' cd-pill--active' : ''}`}
                onClick={() => setRangeId(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Link
            href="/clients-dashboard/settings"
            className="cd-pill"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Settings size={13} />
            הגדרות
          </Link>
        </div>
      </div>

      <div className="cd-toolbar">
        <div className="cd-toolbar__group" style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              insetInlineStart: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)',
              pointerEvents: 'none',
            }}
          />
          <input
            className="cd-input"
            placeholder="חיפוש לקוח…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingInlineStart: 32, width: '100%' }}
          />
        </div>
        <div className="cd-toolbar__group">
          <button
            className={`cd-pill${typeFilter === 'all' ? ' cd-pill--active' : ''}`}
            onClick={() => setTypeFilter('all')}
          >
            הכל
          </button>
          <button
            className={`cd-pill${typeFilter === 'leads' ? ' cd-pill--active' : ''}`}
            onClick={() => setTypeFilter('leads')}
          >
            לידים
          </button>
          <button
            className={`cd-pill${typeFilter === 'ecommerce' ? ' cd-pill--active' : ''}`}
            onClick={() => setTypeFilter('ecommerce')}
          >
            איקומרס
          </button>
        </div>
      </div>

      <div className="cd-kpi-row">
        <Kpi label="לקוחות פעילים" value={String(totals.clients)} />
        <Kpi label="הוצאה כוללת" value={formatCurrency(totals.spend, 'ILS')} />
        <Kpi label="הכנסה כוללת (איקומרס)" value={formatCurrency(totals.revenue, 'ILS')} />
        <Kpi label="המרות" value={formatNumber(totals.conversions)} />
        <Kpi
          label="התראות פתוחות"
          value={String(totals.alerts)}
          tone={totals.alerts > 0 ? 'danger' : undefined}
        />
      </div>

      {error && (
        <div className="cd-card" style={{ borderColor: '#b91c1c' }}>
          <strong style={{ color: '#b91c1c' }}>שגיאה בטעינת הנתונים: </strong>
          {error instanceof Error ? error.message : 'נסה לרענן'}
        </div>
      )}

      <div className="cd-card cd-card--flush">
        <table className="cd-table">
          <thead>
            <tr>
              <th>לקוח</th>
              <th>סוג</th>
              <th>פלטפורמות</th>
              <th className="cd-num">הוצאה</th>
              <th className="cd-num">המרות</th>
              <th className="cd-num">CPL / ROAS</th>
              <th className="cd-num">CTR</th>
              <th className="cd-num">CPC</th>
              <th>התראות</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={9} className="cd-empty">
                  טוען לקוחות…
                </td>
              </tr>
            )}
            {!isLoading && filteredClients.length === 0 && (
              <tr>
                <td colSpan={9} className="cd-empty">
                  אין לקוחות תואמים לסינון
                </td>
              </tr>
            )}
            {filteredClients.map((c) => (
              <ClientRow key={c.id} client={c} />
            ))}
          </tbody>
        </table>
      </div>

      <ArchiveSection
        open={archiveOpen}
        onToggle={() => setArchiveOpen((v) => !v)}
        clients={archivedData?.clients ?? []}
        isLoading={archivedLoading}
        isAdmin={isAdmin}
        onRestored={() => {
          // Refresh both lists — archived row leaves, active row arrives.
          void mutateArchived();
          void mutateActive();
        }}
      />
    </div>
  );
}

function ArchiveSection({
  open,
  onToggle,
  clients,
  isLoading,
  isAdmin,
  onRestored,
}: {
  open: boolean;
  onToggle: () => void;
  clients: ClientSummary[];
  isLoading: boolean;
  isAdmin: boolean;
  onRestored: () => void;
}) {
  const [busyId, setBusyId] = useState<number | null>(null);

  const handleRestore = async (id: number) => {
    if (busyId !== null) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/clients-dashboard/clients/${id}/restore`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed: ${res.status}`);
      }
      toast.success('הלקוח שוחזר');
      onRestored();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בשחזור');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="cd-archive-section">
      <button
        type="button"
        className="cd-archive-section__toggle"
        onClick={onToggle}
        aria-expanded={open}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRightIcon size={14} />}
        <Archive size={14} />
        <span>ארכיון</span>
        {open && clients.length > 0 && (
          <span className="cd-archive-section__count">{clients.length}</span>
        )}
      </button>
      {open && (
        <div className="cd-card cd-card--flush" style={{ marginTop: 8 }}>
          <table className="cd-table">
            <thead>
              <tr>
                <th>לקוח</th>
                <th>סוג</th>
                <th>פלטפורמות</th>
                <th className="cd-num">הוצאה</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="cd-empty">
                    טוען לקוחות בארכיון…
                  </td>
                </tr>
              )}
              {!isLoading && clients.length === 0 && (
                <tr>
                  <td colSpan={5} className="cd-empty">
                    אין לקוחות בארכיון
                  </td>
                </tr>
              )}
              {clients.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link
                      href={`/clients-dashboard/${c.id}`}
                      style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}
                    >
                      {c.name}
                    </Link>
                    <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{c.slug}</div>
                  </td>
                  <td>
                    <span className={`cd-tag cd-pill--${c.metricType}`}>
                      {c.metricType === 'ecommerce' ? 'איקומרס' : 'לידים'}
                    </span>
                  </td>
                  <td>
                    <span className="cd-platforms">
                      <span
                        className={`cd-platform-dot ${c.hasMeta ? 'cd-platform-dot--meta' : 'cd-platform-dot--off'}`}
                        title="Meta"
                      />
                      <span
                        className={`cd-platform-dot ${c.hasGoogle ? 'cd-platform-dot--google' : 'cd-platform-dot--off'}`}
                        title="Google Ads"
                      />
                      <span
                        className={`cd-platform-dot ${c.hasGa4 ? 'cd-platform-dot--ga4' : 'cd-platform-dot--off'}`}
                        title="GA4"
                      />
                    </span>
                  </td>
                  <td className="cd-mono cd-num">{formatCurrency(c.totalSpend, c.currency)}</td>
                  <td>
                    {isAdmin ? (
                      <button
                        type="button"
                        className="cd-pill cd-pill--active"
                        onClick={() => handleRestore(c.id)}
                        disabled={busyId === c.id}
                      >
                        {busyId === c.id ? 'משחזר…' : 'שחזר'}
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
                        נדרשת הרשאת אדמין
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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

function ClientRow({ client }: { client: ClientSummary }) {
  const isEcom = client.metricType === 'ecommerce';
  const primaryMetric = isEcom
    ? client.roas != null
      ? client.roas.toFixed(2) + 'x'
      : '—'
    : client.cpl != null
      ? formatCurrency(client.cpl, client.currency)
      : '—';

  return (
    <tr
      onClick={() => {
        // Navigate via Link wrapper around row would require structural change;
        // use programmatic nav for the row click.
        window.location.href = `/clients-dashboard/${client.id}`;
      }}
    >
      <td>
        <Link
          href={`/clients-dashboard/${client.id}`}
          style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}
          onClick={(e) => e.stopPropagation()}
        >
          {client.name}
        </Link>
        <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{client.slug}</div>
      </td>
      <td>
        <span className={`cd-tag cd-pill--${client.metricType}`}>
          {isEcom ? 'איקומרס' : 'לידים'}
        </span>
      </td>
      <td>
        <span className="cd-platforms" title="Meta · Google · GA4">
          <span
            className={`cd-platform-dot ${
              client.hasMeta ? 'cd-platform-dot--meta' : 'cd-platform-dot--off'
            }`}
            title="Meta"
          />
          <span
            className={`cd-platform-dot ${
              client.hasGoogle ? 'cd-platform-dot--google' : 'cd-platform-dot--off'
            }`}
            title="Google Ads"
          />
          <span
            className={`cd-platform-dot ${
              client.hasGa4 ? 'cd-platform-dot--ga4' : 'cd-platform-dot--off'
            }`}
            title="GA4"
          />
        </span>
      </td>
      <td className="cd-mono cd-num">{formatCurrency(client.totalSpend, client.currency)}</td>
      <td className="cd-mono cd-num">{formatNumber(client.totalConversions)}</td>
      <td className="cd-mono cd-num">{primaryMetric}</td>
      <td className="cd-mono cd-num">{client.ctr != null ? client.ctr.toFixed(2) + '%' : '—'}</td>
      <td className="cd-mono cd-num">
        {client.cpc != null ? formatCurrency(client.cpc, client.currency) : '—'}
      </td>
      <td>
        {client.openAlerts > 0 ? (
          <span className="cd-alert-pill" title={`${client.openAlerts} התראות פתוחות`}>
            <AlertTriangle size={11} />
            {client.openAlerts}
          </span>
        ) : (
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>—</span>
        )}
      </td>
    </tr>
  );
}
