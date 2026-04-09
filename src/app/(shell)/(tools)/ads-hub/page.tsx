'use client';

import { useOverview } from '@/hooks/ads-hub/use-overview';
import { useDashboardStore } from '@/stores/ads-hub/dashboard-store';
import { KpiCards } from '@/components/ads-hub/kpi-cards';
import { ClientTable } from '@/components/ads-hub/client-table';
import { DateRangeFilter } from '@/components/ads-hub/date-range-filter';

export default function AdsHubOverview() {
  const { startDate, endDate } = useDashboardStore();
  const { data, isLoading } = useOverview(startDate, endDate);

  const clients = data?.clients || [];

  // Aggregate KPIs across all clients
  const totals = clients.reduce(
    (acc: { spend: number; impressions: number; clicks: number; conversions: number }, c: Record<string, unknown>) => ({
      spend: acc.spend + Number(c.total_spend || 0),
      impressions: acc.impressions + Number(c.total_impressions || 0),
      clicks: acc.clicks + Number(c.total_clicks || 0),
      conversions: acc.conversions + Number(c.total_conversions || 0),
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
  );

  const cpl = totals.conversions > 0 ? totals.spend / totals.conversions : null;

  return (
    <div className="px-6 pb-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          סקירת פרסום
        </h2>
        <DateRangeFilter />
      </div>

      <KpiCards
        spend={totals.spend}
        impressions={totals.impressions}
        conversions={totals.conversions}
        cpl={cpl}
        loading={isLoading}
      />

      <ClientTable clients={clients} loading={isLoading} />
    </div>
  );
}
