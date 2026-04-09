'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface CampaignRow {
  id: number;
  name: string;
  platform: string;
  status: string | null;
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  cpl: number | null;
}

interface CampaignTableProps {
  campaigns: CampaignRow[];
  loading?: boolean;
}

type SortKey = 'name' | 'total_spend' | 'total_impressions' | 'total_clicks' | 'total_conversions' | 'cpl';

const platformLabels: Record<string, string> = {
  meta: 'Meta',
  google: 'Google',
  ga4: 'GA4',
};

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('he-IL');
};

export const CampaignTable = ({ campaigns, loading }: CampaignTableProps) => {
  const [sortKey, setSortKey] = useState<SortKey>('total_spend');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = [...campaigns].sort((a, b) => {
    const aVal = a[sortKey] ?? 0;
    const bVal = b[sortKey] ?? 0;
    const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal as string) : Number(aVal) - Number(bVal);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 rounded bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return null;
    return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const columns: { key: SortKey; label: string; hideOnMobile?: boolean }[] = [
    { key: 'name', label: 'קמפיין' },
    { key: 'total_spend', label: 'הוצאה' },
    { key: 'total_impressions', label: 'חשיפות', hideOnMobile: true },
    { key: 'total_clicks', label: 'קליקים', hideOnMobile: true },
    { key: 'total_conversions', label: 'המרות' },
    { key: 'cpl', label: 'CPL' },
  ];

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          קמפיינים ({campaigns.length})
        </h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-right py-2.5 px-4 font-medium cursor-pointer select-none ${col.hideOnMobile ? 'hidden md:table-cell' : ''}`}
                style={{ color: 'var(--text-tertiary)' }}
                onClick={() => handleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  <SortIcon column={col.key} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => (
            <tr
              key={c.id}
              className="transition-colors hover:bg-[var(--accent-subtle)]"
              style={{ borderBottom: '1px solid var(--glass-border)' }}
            >
              <td className="py-2.5 px-4">
                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</div>
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--accent-subtle)', color: 'var(--text-tertiary)' }}
                >
                  {platformLabels[c.platform] || c.platform}
                </span>
              </td>
              <td className="py-2.5 px-4 font-mono" style={{ color: 'var(--text-primary)' }}>
                ₪{formatNumber(Number(c.total_spend))}
              </td>
              <td className="py-2.5 px-4 hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                {formatNumber(Number(c.total_impressions))}
              </td>
              <td className="py-2.5 px-4 hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                {formatNumber(Number(c.total_clicks))}
              </td>
              <td className="py-2.5 px-4" style={{ color: 'var(--text-primary)' }}>
                {Number(c.total_conversions).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
              </td>
              <td className="py-2.5 px-4 font-mono" style={{ color: 'var(--text-primary)' }}>
                {c.cpl ? `₪${Number(c.cpl).toFixed(1)}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
