'use client';

import { useMemo } from 'react';
import { useOverview } from '@/hooks/ads-hub/use-overview';
import { useDashboardStore } from '@/stores/ads-hub/dashboard-store';
import { KpiCards } from '@/components/ads-hub/kpi-cards';
import { ClientGrid } from '@/components/ads-hub/client-grid';
import { DateRangePicker } from '@/components/ads-hub/date-range-picker';
import { ClientDropdown } from '@/components/ads-hub/client-dropdown';
import type { AdsHubClientRow } from '@/components/ads-hub/client-card';

export default function AdsHubOverview() {
  const { startDate, endDate, selectedClientId } = useDashboardStore();
  const { data, isLoading } = useOverview(startDate, endDate);

  const clients: AdsHubClientRow[] = data?.clients || [];

  const totals = useMemo(() => {
    const source = selectedClientId
      ? clients.filter((c) => c.id === selectedClientId)
      : clients;

    return source.reduce(
      (acc, c) => ({
        spend: acc.spend + Number(c.total_spend || 0),
        impressions: acc.impressions + Number(c.total_impressions || 0),
        clicks: acc.clicks + Number(c.total_clicks || 0),
        conversions: acc.conversions + Number(c.total_conversions || 0),
      }),
      { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
    );
  }, [clients, selectedClientId]);

  const cpl = totals.conversions > 0 ? totals.spend / totals.conversions : null;
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : null;

  const selectedClient = selectedClientId
    ? clients.find((c) => c.id === selectedClientId)
    : null;

  return (
    <div className="px-6 pb-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            סקירת פרסום
          </h2>
          {selectedClient && (
            <span
              className="text-sm px-2.5 py-1 rounded-full"
              style={{ background: 'var(--accent-subtle)', color: 'var(--text-primary)' }}
            >
              {selectedClient.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ClientDropdown clients={clients} loading={isLoading} />
          <DateRangePicker />
        </div>
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
