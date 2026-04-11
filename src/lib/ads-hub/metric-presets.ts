export type MetricType = 'ecommerce' | 'leads';
export type MetricFormat = 'currency' | 'number' | 'percent' | 'decimal';
export type MetricVariant = 'default' | 'green' | 'red' | 'amber' | 'blue' | 'purple';

export interface MetricDefinition {
  key: string;
  label: string;
  format: MetricFormat;
  variant: MetricVariant;
}

export interface MetricPreset {
  label: string;
  description: string;
  metrics: MetricDefinition[];
}

// Two categories — user picks one per client. The dashboard renders only
// the preset matching the selected client's metric_type.
export const METRIC_PRESETS: Record<MetricType, MetricPreset> = {
  ecommerce: {
    label: 'איקומרס',
    description: 'מטריקות לקמפיינים המבוססים רכישה באתר',
    metrics: [
      { key: 'spend', label: 'הוצאה', format: 'currency', variant: 'red' },
      { key: 'purchases', label: 'רכישות', format: 'number', variant: 'green' },
      { key: 'revenue', label: 'הכנסות', format: 'currency', variant: 'green' },
      { key: 'roas', label: 'ROAS', format: 'decimal', variant: 'purple' },
      { key: 'cpa', label: 'עלות לרכישה', format: 'currency', variant: 'amber' },
      { key: 'aov', label: 'ממוצע הזמנה', format: 'currency', variant: 'blue' },
    ],
  },
  leads: {
    label: 'לידים',
    description: 'מטריקות לקמפיינים של גיוס לידים והמרה',
    metrics: [
      { key: 'spend', label: 'הוצאה', format: 'currency', variant: 'red' },
      { key: 'leads', label: 'לידים', format: 'number', variant: 'green' },
      { key: 'cpl', label: 'עלות לליד', format: 'currency', variant: 'purple' },
      { key: 'impressions', label: 'חשיפות', format: 'number', variant: 'blue' },
      { key: 'clicks', label: 'קליקים', format: 'number', variant: 'default' },
      { key: 'ctr', label: 'CTR', format: 'percent', variant: 'amber' },
    ],
  },
};

export interface RawMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number; // generic: purchases for ecommerce, leads for leads
  revenue?: number;
}

export function deriveMetricValue(
  key: string,
  raw: RawMetrics
): number | null {
  switch (key) {
    case 'spend':
      return raw.spend;
    case 'impressions':
      return raw.impressions;
    case 'clicks':
      return raw.clicks;
    case 'purchases':
    case 'leads':
      return raw.conversions;
    case 'revenue':
      return raw.revenue ?? 0;
    case 'roas':
      return raw.revenue && raw.spend > 0 ? raw.revenue / raw.spend : null;
    case 'cpa':
    case 'cpl':
      return raw.conversions > 0 ? raw.spend / raw.conversions : null;
    case 'aov':
      return raw.conversions > 0 && raw.revenue
        ? raw.revenue / raw.conversions
        : null;
    case 'ctr':
      return raw.impressions > 0 ? (raw.clicks / raw.impressions) * 100 : null;
    default:
      return null;
  }
}

export function formatMetric(
  value: number | null,
  format: MetricFormat
): string {
  if (value === null || Number.isNaN(value)) return '—';

  switch (format) {
    case 'currency':
      return `₪${value.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`;
    case 'number':
      if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
      if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
      return value.toLocaleString('he-IL', { maximumFractionDigits: 0 });
    case 'percent':
      return `${value.toFixed(2)}%`;
    case 'decimal':
      return value.toFixed(2);
    default:
      return String(value);
  }
}
