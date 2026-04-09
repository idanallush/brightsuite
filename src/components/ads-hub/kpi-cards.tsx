'use client';

import { DollarSign, Eye, MousePointerClick, Target } from 'lucide-react';

interface KpiCardsProps {
  spend: number;
  impressions: number;
  conversions: number;
  cpl: number | null;
  loading?: boolean;
}

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('he-IL');
};

const formatCurrency = (n: number): string => {
  return `${n.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const cards = [
  {
    key: 'spend',
    label: 'הוצאה כוללת',
    icon: DollarSign,
    color: '#c0392b',
    format: (v: number) => `₪${formatCurrency(v)}`,
  },
  {
    key: 'impressions',
    label: 'חשיפות',
    icon: Eye,
    color: '#2563a0',
    format: formatNumber,
  },
  {
    key: 'conversions',
    label: 'המרות',
    icon: MousePointerClick,
    color: '#1a7a4c',
    format: (v: number) => v.toLocaleString('he-IL', { maximumFractionDigits: 0 }),
  },
  {
    key: 'cpl',
    label: 'עלות להמרה',
    icon: Target,
    color: '#6d4c9e',
    format: (v: number | null) => (v !== null ? `₪${v.toFixed(1)}` : '—'),
  },
] as const;

export const KpiCards = ({ spend, impressions, conversions, cpl, loading }: KpiCardsProps) => {
  const values: Record<string, number | null> = { spend, impressions, conversions, cpl };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const value = values[card.key];

        return (
          <div
            key={card.key}
            className="glass-card rounded-xl py-4 px-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${card.color}14` }}
              >
                <Icon size={16} style={{ color: card.color }} />
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                {card.label}
              </span>
            </div>
            <div
              className="text-xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {loading ? (
                <div className="h-7 w-24 rounded bg-gray-200 animate-pulse" />
              ) : (
                card.format(value as number & null)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
