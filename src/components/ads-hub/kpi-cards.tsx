'use client';

interface KpiCardsProps {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpl: number | null;
  ctr: number | null;
  loading?: boolean;
}

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('he-IL');
};

const formatCurrency = (n: number): string => {
  return `₪${n.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`;
};

type Variant = 'default' | 'green' | 'red' | 'amber' | 'blue' | 'purple';

const variantStyles: Record<Variant, string> = {
  default: 'bg-white border-[#e5e5e0]',
  green: 'bg-[#e8f5ee] border-[#c6e7d3]',
  red: 'bg-[#fceaea] border-[#f5cbcb]',
  amber: 'bg-[#fef6e0] border-[#f5e4b0]',
  blue: 'bg-[#e8f0fa] border-[#c8d8ee]',
  purple: 'bg-[#f0eaf8] border-[#dccbed]',
};

const variantValueStyles: Record<Variant, string> = {
  default: 'text-[#1a1a1a]',
  green: 'text-[#1a7a4c]',
  red: 'text-[#c0392b]',
  amber: 'text-[#b45309]',
  blue: 'text-[#2563a0]',
  purple: 'text-[#6d4c9e]',
};

interface MetricCardProps {
  label: string;
  value: string;
  variant?: Variant;
  loading?: boolean;
}

const MetricCard = ({ label, value, variant = 'default', loading }: MetricCardProps) => (
  <div className={`rounded-xl border px-4 py-3 ${variantStyles[variant]}`}>
    <p className="text-[11px] text-[#8a877f] leading-tight mb-1">{label}</p>
    {loading ? (
      <div className="h-7 w-20 rounded bg-black/5 animate-pulse" />
    ) : (
      <p className={`text-[22px] font-bold leading-tight tabular-nums ${variantValueStyles[variant]}`}>
        {value}
      </p>
    )}
  </div>
);

export const KpiCards = ({
  spend,
  impressions,
  clicks,
  conversions,
  cpl,
  ctr,
  loading,
}: KpiCardsProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <MetricCard label="הוצאה כוללת" value={formatCurrency(spend)} variant="red" loading={loading} />
      <MetricCard label="חשיפות" value={formatNumber(impressions)} variant="blue" loading={loading} />
      <MetricCard label="קליקים" value={formatNumber(clicks)} variant="default" loading={loading} />
      <MetricCard label="המרות" value={formatNumber(conversions)} variant="green" loading={loading} />
      <MetricCard label="CPL" value={cpl !== null ? `₪${cpl.toFixed(1)}` : '—'} variant="purple" loading={loading} />
      <MetricCard label="CTR" value={ctr !== null ? `${ctr.toFixed(2)}%` : '—'} variant="amber" loading={loading} />
    </div>
  );
};
