'use client';

import { useOverview } from '@/hooks/ads-hub/use-overview';
import { useDashboardStore } from '@/stores/ads-hub/dashboard-store';
import { KpiCards } from '@/components/ads-hub/kpi-cards';
import { ClientGrid } from '@/components/ads-hub/client-grid';
import { DateRangePicker } from '@/components/ads-hub/date-range-picker';
import type { AdsHubClientRow } from '@/components/ads-hub/client-card';

export default function AdsHubOverview() {
  const { startDate, endDate } = useDashboardStore();
  const { data, isLoading } = useOverview(startDate, endDate);

  const clients: AdsHubClientRow[] = data?.clients || [];

  // Aggregate KPIs across all clients
  const totals = clients.reduce(
    (acc, c) => ({
      spend: acc.spend + Number(c.total_spend || 0),
      impressions: acc.impressions + Number(c.total_impressions || 0),
      clicks: acc.clicks + Number(c.total_clicks || 0),
      conversions: acc.conversions + Number(c.total_conversions || 0),
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
  );

  const cpl = totals.conversions > 0 ? totals.spend / totals.conversions : null;
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : null;

  return (
    <div className="px-6 pb-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          סקירת פרסום
        </h2>
        <DateRangePicker />
      </div>

      <KpiCards
        spend={totals.spend}
        impressions={totals.impressions}
        clicks={totals.clicks}
        conversions={totals.conversions}
        cpl={cpl}
        ctr={ctr}
        loading={isLoading}
      />

      <ClientGrid clients={clients} loading={isLoading} />
    </div>
  );
}
