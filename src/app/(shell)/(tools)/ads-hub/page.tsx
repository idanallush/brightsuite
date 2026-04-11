'use client';

import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { useOverview } from '@/hooks/ads-hub/use-overview';
import { useDashboardStore } from '@/stores/ads-hub/dashboard-store';
import { CategoryMetrics } from '@/components/ads-hub/category-metrics';
import { DateRangePicker } from '@/components/ads-hub/date-range-picker';
import { ClientDropdown } from '@/components/ads-hub/client-dropdown';
import type { AdsHubClientRow } from '@/components/ads-hub/client-card';
import type { MetricType } from '@/lib/ads-hub/metric-presets';

interface ClientWithMetricType extends AdsHubClientRow {
  metric_type?: string;
  total_revenue?: number;
}

export default function AdsHubOverview() {
  const { startDate, endDate, selectedClientId } = useDashboardStore();
  const { data, isLoading } = useOverview(startDate, endDate);

  const clients: ClientWithMetricType[] = data?.clients || [];
  const selectedClient = selectedClientId
    ? clients.find((c) => c.id === selectedClientId)
    : null;

  const metricType: MetricType =
    (selectedClient?.metric_type as MetricType) === 'ecommerce' ? 'ecommerce' : 'leads';

  const raw = useMemo(() => {
    if (!selectedClient) {
      return { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 };
    }
    return {
      spend: Number(selectedClient.total_spend || 0),
      impressions: Number(selectedClient.total_impressions || 0),
      clicks: Number(selectedClient.total_clicks || 0),
      conversions: Number(selectedClient.total_conversions || 0),
      revenue: Number(selectedClient.total_revenue || 0),
    };
  }, [selectedClient]);

  return (
    <div className="px-6 pb-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            סקירת פרסום
          </h2>
          {selectedClient && (
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{
                background: metricType === 'ecommerce' ? '#e8f5ee' : '#e8f0fa',
                color: metricType === 'ecommerce' ? '#1a7a4c' : '#2563a0',
              }}
            >
              {metricType === 'ecommerce' ? 'איקומרס' : 'לידים'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ClientDropdown clients={clients} loading={isLoading} />
          <DateRangePicker />
        </div>
      </div>

      {/* Empty state / content */}
      {!selectedClient ? (
        <div
          className="rounded-xl p-16 flex flex-col items-center justify-center gap-5 text-center"
          style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
        >
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--accent-subtle)' }}
          >
            <BarChart3 className="h-7 w-7" style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div className="space-y-1 max-w-sm">
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              בחר לקוח כדי להתחיל
            </p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {clients.length === 0
                ? 'אין לקוחות עדיין. עבור להגדרות כדי להוסיף לקוח חדש.'
                : 'בחר לקוח מהרשימה הנפתחת למעלה כדי להציג את נתוני הפרסום שלו.'}
            </p>
          </div>
        </div>
      ) : (
        <CategoryMetrics metricType={metricType} raw={raw} loading={isLoading} />
      )}
    </div>
  );
}
