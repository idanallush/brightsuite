'use client';

// Campaigns tab — sortable, filterable, searchable table of all campaigns
// for one client across Meta / Google / GA4. Click a row to expand and view a
// daily breakdown chart fetched on-demand. CSV export downloads in-browser;
// PDF export uses the browser's print pipeline (window.print() against a
// print-only stylesheet block).
//
// Adapts visible/primary columns to client.metricType:
//   - 'leads'     → spend, conversions (leads), CPL, CPC primary
//   - 'ecommerce' → spend, revenue, ROAS, conversions (purchases) primary

import { useMemo, useState, useCallback } from 'react';
import useSWR from 'swr';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { ClientSummary, Platform } from '@/lib/clients-dashboard/types';
import type { CampaignRow, CampaignsApiResponse } from '@/lib/clients-dashboard/campaigns';
import DailyChart from './daily-chart';

// =====================================================
// Helpers
// =====================================================

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

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

function formatRatio(value: number | null, suffix = ''): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toFixed(2) + suffix;
}

function formatCurrencyOrDash(value: number | null, currency: string): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return formatCurrency(value, currency);
}

const PLATFORM_LABEL: Record<Platform, string> = {
  meta: 'Meta',
  google: 'Google',
  ga4: 'GA4',
};

const PLATFORM_DOT_CLASS: Record<Platform, string> = {
  meta: 'cd-platform-dot--meta',
  google: 'cd-platform-dot--google',
  ga4: 'cd-platform-dot--ga4',
};

// Numeric columns that can be sorted
type SortKey =
  | 'name'
  | 'platform'
  | 'status'
  | 'spend'
  | 'impressions'
  | 'clicks'
  | 'conversions'
  | 'revenue'
  | 'ctr'
  | 'cpc'
  | 'cpl'
  | 'roas';

type SortDir = 'asc' | 'desc';

type PlatformFilter = 'all' | Platform;

// =====================================================
// Column definitions (metric-type aware)
// =====================================================

interface Column {
  key: SortKey;
  label: string;
  numeric: boolean;
  // Render the cell value as a string
  render: (row: CampaignRow, currency: string) => string;
  // Used for CSV export (raw value as string, no formatting)
  raw: (row: CampaignRow) => string;
  // Whether this column is part of the "primary" set for the client metric type
  primary: boolean;
}

function buildColumns(metricType: 'leads' | 'ecommerce'): Column[] {
  const isEcom = metricType === 'ecommerce';
  // Order: name, platform, status, then primary metrics first, then secondary.
  const cols: Column[] = [
    {
      key: 'name',
      label: 'שם קמפיין',
      numeric: false,
      render: (r) => r.name,
      raw: (r) => r.name,
      primary: true,
    },
    {
      key: 'platform',
      label: 'פלטפורמה',
      numeric: false,
      render: (r) => PLATFORM_LABEL[r.platform],
      raw: (r) => r.platform,
      primary: true,
    },
    {
      key: 'status',
      label: 'סטטוס',
      numeric: false,
      render: (r) => r.status ?? '—',
      raw: (r) => r.status ?? '',
      primary: false,
    },
    {
      key: 'spend',
      label: 'הוצאה',
      numeric: true,
      render: (r, c) => formatCurrency(r.spend, c),
      raw: (r) => r.spend.toFixed(2),
      primary: true,
    },
  ];

  if (isEcom) {
    cols.push(
      {
        key: 'revenue',
        label: 'הכנסה',
        numeric: true,
        render: (r, c) => formatCurrency(r.revenue, c),
        raw: (r) => r.revenue.toFixed(2),
        primary: true,
      },
      {
        key: 'roas',
        label: 'ROAS',
        numeric: true,
        render: (r) => formatRatio(r.roas, 'x'),
        raw: (r) => (r.roas == null ? '' : r.roas.toFixed(2)),
        primary: true,
      },
      {
        key: 'conversions',
        label: 'רכישות',
        numeric: true,
        render: (r) => formatNumber(r.conversions),
        raw: (r) => r.conversions.toFixed(2),
        primary: true,
      },
    );
  } else {
    cols.push(
      {
        key: 'conversions',
        label: 'לידים',
        numeric: true,
        render: (r) => formatNumber(r.conversions),
        raw: (r) => r.conversions.toFixed(2),
        primary: true,
      },
      {
        key: 'cpl',
        label: 'CPL',
        numeric: true,
        render: (r, c) => formatCurrencyOrDash(r.cpl, c),
        raw: (r) => (r.cpl == null ? '' : r.cpl.toFixed(2)),
        primary: true,
      },
      {
        key: 'cpc',
        label: 'CPC',
        numeric: true,
        render: (r, c) => formatCurrencyOrDash(r.cpc, c),
        raw: (r) => (r.cpc == null ? '' : r.cpc.toFixed(2)),
        primary: true,
      },
    );
  }

  // Secondary metrics — always present, just visually muted via class on
  // the column header cell.
  cols.push(
    {
      key: 'impressions',
      label: 'חשיפות',
      numeric: true,
      render: (r) => formatNumber(r.impressions),
      raw: (r) => String(r.impressions),
      primary: false,
    },
    {
      key: 'clicks',
      label: 'קליקים',
      numeric: true,
      render: (r) => formatNumber(r.clicks),
      raw: (r) => String(r.clicks),
      primary: false,
    },
    {
      key: 'ctr',
      label: 'CTR',
      numeric: true,
      render: (r) => formatRatio(r.ctr, '%'),
      raw: (r) => (r.ctr == null ? '' : r.ctr.toFixed(2)),
      primary: false,
    },
  );

  // For leads tables, expose revenue/roas as secondary too if data exists.
  if (!isEcom) {
    cols.push(
      {
        key: 'revenue',
        label: 'הכנסה',
        numeric: true,
        render: (r, c) => formatCurrency(r.revenue, c),
        raw: (r) => r.revenue.toFixed(2),
        primary: false,
      },
      {
        key: 'roas',
        label: 'ROAS',
        numeric: true,
        render: (r) => formatRatio(r.roas, 'x'),
        raw: (r) => (r.roas == null ? '' : r.roas.toFixed(2)),
        primary: false,
      },
    );
  } else {
    cols.push({
      key: 'cpc',
      label: 'CPC',
      numeric: true,
      render: (r, c) => formatCurrencyOrDash(r.cpc, c),
      raw: (r) => (r.cpc == null ? '' : r.cpc.toFixed(2)),
      primary: false,
    });
  }

  return cols;
}

// =====================================================
// CSV export
// =====================================================

function rowsToCsv(columns: Column[], rows: CampaignRow[]): string {
  const head = columns.map((c) => csvCell(c.label)).join(',');
  const lines = rows.map((r) => columns.map((c) => csvCell(c.raw(r))).join(','));
  return [head, ...lines].join('\n');
}

function csvCell(v: string): string {
  if (/[",\n]/.test(v)) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

function downloadCsv(filename: string, csv: string): void {
  // Prepend BOM so Excel renders Hebrew correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// =====================================================
// Main component
// =====================================================

interface CampaignsTabProps {
  client: ClientSummary;
}

export default function CampaignsTab({ client }: CampaignsTabProps) {
  // Date range from URL params if present, else last 30 days.
  const [range, setRange] = useState(() => readRangeFromUrl());

  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState<PlatformFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const isEcom = client.metricType === 'ecommerce';
  const columns = useMemo(() => buildColumns(client.metricType), [client.metricType]);
  const primaryMetric: 'revenue' | 'conversions' = isEcom ? 'revenue' : 'conversions';

  const listKey = `/api/clients-dashboard/campaigns?clientId=${client.id}&startDate=${range.startDate}&endDate=${range.endDate}`;
  const { data, error, isLoading } = useSWR<CampaignsApiResponse>(listKey, fetcher);

  const dailyKey = expandedKey
    ? `/api/clients-dashboard/campaigns?clientId=${client.id}&campaignKey=${encodeURIComponent(expandedKey)}&startDate=${range.startDate}&endDate=${range.endDate}`
    : null;
  const { data: dailyData, isLoading: dailyLoading } = useSWR<CampaignsApiResponse>(
    dailyKey,
    fetcher,
  );

  const filtered = useMemo(() => {
    const raw = data?.campaigns ?? [];
    const q = search.trim().toLowerCase();
    return raw.filter((r) => {
      if (platform !== 'all' && r.platform !== platform) return false;
      if (q && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, platform, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => compareRows(a, b, sortKey, sortDir));
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totals = useMemo(() => aggregateTotals(sorted), [sorted]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        // Numeric → desc default. Text → asc default.
        const col = columns.find((c) => c.key === key);
        setSortDir(col?.numeric ? 'desc' : 'asc');
      }
    },
    [sortKey, columns],
  );

  const handleExportCsv = useCallback(() => {
    const csv = rowsToCsv(columns, sorted);
    const fname = `${client.slug}-campaigns-${range.startDate}_${range.endDate}.csv`;
    downloadCsv(fname, csv);
  }, [columns, sorted, client.slug, range]);

  const handlePrintPdf = useCallback(() => {
    // window.print() respects the @media print rules in styles.css and the
    // .cd-camp-print-only / .cd-camp-no-print toggles.
    window.print();
  }, []);

  return (
    <div className="cd-camp-root">
      <div className="cd-camp-toolbar cd-camp-no-print">
        <div className="cd-camp-toolbar__group">
          <div className="cd-camp-search">
            <Search size={14} />
            <input
              type="text"
              className="cd-camp-search__input"
              placeholder="חיפוש לפי שם קמפיין"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="cd-camp-toolbar__group">
          {(['all', 'meta', 'google', 'ga4'] as const).map((p) => (
            <button
              key={p}
              type="button"
              className={`cd-pill${platform === p ? ' cd-pill--active' : ''}`}
              onClick={() => setPlatform(p)}
            >
              {p === 'all' ? 'הכל' : PLATFORM_LABEL[p]}
            </button>
          ))}
        </div>

        <div className="cd-camp-toolbar__group">
          <input
            type="date"
            className="cd-input"
            value={range.startDate}
            onChange={(e) => setRange((r) => ({ ...r, startDate: e.target.value }))}
            max={range.endDate}
          />
          <span className="cd-camp-toolbar__sep">→</span>
          <input
            type="date"
            className="cd-input"
            value={range.endDate}
            onChange={(e) => setRange((r) => ({ ...r, endDate: e.target.value }))}
            min={range.startDate}
            max={isoToday()}
          />
        </div>

        <div className="cd-camp-toolbar__group cd-camp-toolbar__group--end">
          <button type="button" className="cd-pill" onClick={handleExportCsv}>
            <Download size={14} />
            CSV
          </button>
          <button type="button" className="cd-pill" onClick={handlePrintPdf}>
            <Printer size={14} />
            PDF
          </button>
        </div>
      </div>

      {isLoading && <div className="cd-empty">טוען קמפיינים…</div>}

      {error && (
        <div className="cd-card" style={{ borderColor: '#b91c1c' }}>
          <strong style={{ color: '#b91c1c' }}>שגיאה בטעינת הקמפיינים</strong>
          <div style={{ marginTop: 6, fontSize: 12, color: '#b91c1c' }}>
            {(error as Error).message}
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="cd-camp-print-head cd-camp-print-only">
            <h2>{client.name} — קמפיינים</h2>
            <div>
              {range.startDate} → {range.endDate} · {sorted.length} קמפיינים
            </div>
          </div>

          <div className="cd-card cd-card--flush">
            <table className="cd-table cd-camp-table">
              <thead>
                <tr>
                  <th className="cd-camp-th--icon" aria-hidden />
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`${col.numeric ? 'cd-num' : ''} ${col.primary ? 'cd-camp-th--primary' : 'cd-camp-th--secondary'}`}
                      onClick={() => handleSort(col.key)}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                    >
                      <span className="cd-camp-th-inner">
                        {col.label}
                        <SortIcon active={sortKey === col.key} dir={sortDir} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="cd-empty"
                      style={{ padding: '32px 12px' }}
                    >
                      לא נמצאו קמפיינים בטווח שנבחר
                    </td>
                  </tr>
                )}
                {sorted.map((row) => {
                  const expanded = expandedKey === row.key;
                  return (
                    <FragmentRow
                      key={row.key}
                      row={row}
                      columns={columns}
                      currency={client.currency}
                      expanded={expanded}
                      onToggle={() => setExpandedKey(expanded ? null : row.key)}
                      dailyData={
                        expanded ? (dailyData?.daily ?? null) : null
                      }
                      dailyLoading={expanded && dailyLoading}
                      primaryMetric={primaryMetric}
                    />
                  );
                })}
              </tbody>
              {sorted.length > 0 && (
                <tfoot>
                  <tr className="cd-camp-totals">
                    <td aria-hidden />
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={col.numeric ? 'cd-num cd-mono' : ''}
                      >
                        {totalsCell(col, totals, client.currency, sorted.length)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// =====================================================
// Sub-components
// =====================================================

function FragmentRow({
  row,
  columns,
  currency,
  expanded,
  onToggle,
  dailyData,
  dailyLoading,
  primaryMetric,
}: {
  row: CampaignRow;
  columns: Column[];
  currency: string;
  expanded: boolean;
  onToggle: () => void;
  dailyData: import('@/lib/clients-dashboard/campaigns').CampaignDailyPoint[] | null;
  dailyLoading: boolean;
  primaryMetric: 'revenue' | 'conversions';
}) {
  return (
    <>
      <tr onClick={onToggle} className={expanded ? 'cd-camp-row--expanded' : undefined}>
        <td className="cd-camp-td--icon">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </td>
        {columns.map((col) => {
          if (col.key === 'platform') {
            return (
              <td key={col.key}>
                <span className="cd-platforms">
                  <span className={`cd-platform-dot ${PLATFORM_DOT_CLASS[row.platform]}`} />
                  {col.render(row, currency)}
                </span>
              </td>
            );
          }
          if (col.key === 'name') {
            return (
              <td key={col.key} className="cd-camp-td--name">
                {row.name}
              </td>
            );
          }
          return (
            <td
              key={col.key}
              className={`${col.numeric ? 'cd-num cd-mono' : ''} ${col.primary ? '' : 'cd-camp-td--secondary'}`}
            >
              {col.render(row, currency)}
            </td>
          );
        })}
      </tr>
      {expanded && (
        <tr className="cd-camp-detail-row cd-camp-no-print">
          <td colSpan={columns.length + 1}>
            <div className="cd-camp-detail">
              <div className="cd-camp-detail__head">
                <strong>{row.name}</strong>
                <span className="cd-camp-detail__meta">
                  {PLATFORM_LABEL[row.platform]} · {row.platformCampaignId}
                  {row.objective ? ' · ' + row.objective : ''}
                </span>
              </div>
              {dailyLoading && <div className="cd-empty">טוען נתונים יומיים…</div>}
              {!dailyLoading && dailyData && (
                <DailyChart
                  data={dailyData}
                  primaryMetric={primaryMetric}
                  currency={currency}
                />
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown size={11} className="cd-camp-sort-icon" />;
  return dir === 'asc' ? (
    <ArrowUp size={11} className="cd-camp-sort-icon cd-camp-sort-icon--active" />
  ) : (
    <ArrowDown size={11} className="cd-camp-sort-icon cd-camp-sort-icon--active" />
  );
}

// =====================================================
// Sorting + totals
// =====================================================

function compareRows(a: CampaignRow, b: CampaignRow, key: SortKey, dir: SortDir): number {
  const av = a[key as keyof CampaignRow];
  const bv = b[key as keyof CampaignRow];
  let cmp = 0;
  if (av == null && bv == null) cmp = 0;
  else if (av == null) cmp = 1; // nulls last
  else if (bv == null) cmp = -1;
  else if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
  else cmp = String(av).localeCompare(String(bv), 'he');
  return dir === 'asc' ? cmp : -cmp;
}

interface Totals {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

function aggregateTotals(rows: CampaignRow[]): Totals {
  return rows.reduce<Totals>(
    (acc, r) => {
      acc.spend += r.spend;
      acc.impressions += r.impressions;
      acc.clicks += r.clicks;
      acc.conversions += r.conversions;
      acc.revenue += r.revenue;
      return acc;
    },
    { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
  );
}

function totalsCell(col: Column, t: Totals, currency: string, count: number): string {
  switch (col.key) {
    case 'name':
      return `סה"כ ${count}`;
    case 'platform':
    case 'status':
      return '';
    case 'spend':
      return formatCurrency(t.spend, currency);
    case 'revenue':
      return formatCurrency(t.revenue, currency);
    case 'impressions':
      return formatNumber(t.impressions);
    case 'clicks':
      return formatNumber(t.clicks);
    case 'conversions':
      return formatNumber(t.conversions);
    case 'ctr':
      return t.impressions > 0
        ? formatRatio((t.clicks / t.impressions) * 100, '%')
        : '—';
    case 'cpc':
      return t.clicks > 0 ? formatCurrency(t.spend / t.clicks, currency) : '—';
    case 'cpl':
      return t.conversions > 0 ? formatCurrency(t.spend / t.conversions, currency) : '—';
    case 'roas':
      return t.spend > 0 ? formatRatio(t.revenue / t.spend, 'x') : '—';
    default:
      return '';
  }
}

// =====================================================
// URL date-range parsing
// =====================================================

function readRangeFromUrl(): { startDate: string; endDate: string } {
  const fallback = { startDate: isoDaysAgo(29), endDate: isoToday() };
  if (typeof window === 'undefined') return fallback;
  const params = new URLSearchParams(window.location.search);
  const s = params.get('startDate');
  const e = params.get('endDate');
  const valid = (v: string | null) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
  return {
    startDate: valid(s) ? (s as string) : fallback.startDate,
    endDate: valid(e) ? (e as string) : fallback.endDate,
  };
}

