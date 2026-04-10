'use client';

import Link from 'next/link';
import { ChevronDown, ExternalLink, EyeOff } from 'lucide-react';
import { Card, CardContent } from '@/components/cpa/ui/card';

export interface AdsHubClientRow {
  id: number;
  name: string;
  slug: string;
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  cpl: number | null;
  meta_account_id?: string | null;
  google_customer_id?: string | null;
  ga4_property_id?: string | null;
}

interface ClientCardProps {
  client: AdsHubClientRow;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onHide: () => void;
}

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('he-IL');
};

const formatCurrency = (n: number): string => {
  return `₪${n.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`;
};

type HealthStatus = 'green' | 'yellow' | 'red' | 'no_data';

const getHealthStatus = (client: AdsHubClientRow): HealthStatus => {
  const spend = Number(client.total_spend || 0);
  const conversions = Number(client.total_conversions || 0);
  if (spend === 0) return 'no_data';
  if (conversions === 0) return 'red';
  if (client.cpl !== null && client.cpl > 100) return 'yellow';
  return 'green';
};

const statusColors: Record<HealthStatus, string> = {
  green: '#22C55E',
  yellow: '#F59E0B',
  red: '#EF4444',
  no_data: '#E5E7EB',
};

const statusLabels: Record<HealthStatus, string> = {
  green: 'פעיל',
  yellow: 'בתשומת לב',
  red: 'ללא המרות',
  no_data: 'ללא נתונים',
};

const statusBadgeStyles: Record<HealthStatus, string> = {
  green: 'bg-[#e8f5ee] text-[#1a7a4c] border border-[#c6e7d3]',
  yellow: 'bg-[#fef6e0] text-[#b45309] border border-[#f5e4b0]',
  red: 'bg-[#fceaea] text-[#c0392b] border border-[#f5cbcb]',
  no_data: 'bg-gray-100 text-gray-500 border border-gray-200',
};

const platformBadge = (label: string, active: boolean) => (
  <span
    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
      active ? 'bg-[#e8f0fa] text-[#2563a0]' : 'bg-gray-100 text-gray-400'
    }`}
  >
    {label}
  </span>
);

export const ClientCard = ({ client, isCollapsed, onToggleCollapse, onHide }: ClientCardProps) => {
  const status = getHealthStatus(client);
  const spend = Number(client.total_spend || 0);
  const impressions = Number(client.total_impressions || 0);
  const clicks = Number(client.total_clicks || 0);
  const conversions = Number(client.total_conversions || 0);
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : null;

  return (
    <Card className="rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Colored top accent bar */}
      <div className="h-1" style={{ backgroundColor: statusColors[status] }} />

      {/* Clickable header */}
      <div
        className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 cursor-pointer select-none"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm sm:text-base font-bold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
            {client.name}
          </h3>
          <Link
            href={`/ads-hub/${client.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-[var(--text-primary)] transition-colors"
            title="פתח בלקוח מפורט"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isCollapsed && (
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {formatCurrency(spend)}
            </span>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadgeStyles[status]}`}>
            {statusLabels[status]}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onHide();
            }}
            className="text-muted-foreground hover:text-red-500 transition-colors p-0.5"
            title="הסתר לקוח"
          >
            <EyeOff className="h-3.5 w-3.5" />
          </button>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
              isCollapsed ? '' : 'rotate-180'
            }`}
          />
        </div>
      </div>

      {/* Collapsible body */}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
          isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
        }`}
      >
        <div className="overflow-hidden">
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            {/* Platform badges */}
            <div className="flex items-center gap-1.5">
              {platformBadge('Meta', !!client.meta_account_id)}
              {platformBadge('Google', !!client.google_customer_id)}
              {platformBadge('GA4', !!client.ga4_property_id)}
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-3 gap-3">
              <Metric label="הוצאה" value={formatCurrency(spend)} />
              <Metric label="חשיפות" value={formatNumber(impressions)} />
              <Metric label="קליקים" value={formatNumber(clicks)} />
              <Metric label="המרות" value={formatNumber(conversions)} />
              <Metric label="CPL" value={client.cpl !== null ? `₪${Number(client.cpl).toFixed(1)}` : '—'} />
              <Metric label="CTR" value={ctr !== null ? `${ctr.toFixed(2)}%` : '—'} />
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-0.5">
    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
    <p className="text-sm sm:text-base font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
      {value}
    </p>
  </div>
);
