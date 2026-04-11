'use client';

import { METRIC_PRESETS, deriveMetricValue, formatMetric, type MetricType, type RawMetrics, type MetricVariant } from '@/lib/ads-hub/metric-presets';

interface CategoryMetricsProps {
  metricType: MetricType;
  raw: RawMetrics;
  loading?: boolean;
}

const variantStyles: Record<MetricVariant, string> = {
  default: 'bg-white border-[#e5e5e0]',
  green: 'bg-[#e8f5ee] border-[#c6e7d3]',
  red: 'bg-[#fceaea] border-[#f5cbcb]',
  amber: 'bg-[#fef6e0] border-[#f5e4b0]',
  blue: 'bg-[#e8f0fa] border-[#c8d8ee]',
  purple: 'bg-[#f0eaf8] border-[#dccbed]',
};

const variantValueStyles: Record<MetricVariant, string> = {
  default: 'text-[#1a1a1a]',
  green: 'text-[#1a7a4c]',
  red: 'text-[#c0392b]',
  amber: 'text-[#b45309]',
  blue: 'text-[#2563a0]',
  purple: 'text-[#6d4c9e]',
};

export const CategoryMetrics = ({ metricType, raw, loading }: CategoryMetricsProps) => {
  const preset = METRIC_PRESETS[metricType];

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {preset.label}
        </h3>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {preset.description}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {preset.metrics.map((metric) => {
          const value = deriveMetricValue(metric.key, raw);
          return (
            <div key={metric.key} className={`rounded-xl border px-4 py-3 ${variantStyles[metric.variant]}`}>
              <p className="text-[11px] text-[#8a877f] leading-tight mb-1">{metric.label}</p>
              {loading ? (
                <div className="h-7 w-20 rounded bg-black/5 animate-pulse" />
              ) : (
                <p className={`text-[22px] font-bold leading-tight tabular-nums ${variantValueStyles[metric.variant]}`}>
                  {formatMetric(value, metric.format)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
