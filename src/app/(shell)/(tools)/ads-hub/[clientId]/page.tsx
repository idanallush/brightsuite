'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useClientDetail, usePerformance, useCampaigns } from '@/hooks/ads-hub/use-overview';
import { useDashboardStore } from '@/stores/ads-hub/dashboard-store';
import { KpiCards } from '@/components/ads-hub/kpi-cards';
import { PerformanceChart } from '@/components/ads-hub/performance-chart';
import { CampaignTable } from '@/components/ads-hub/campaign-table';
import { PlatformFilter } from '@/components/ads-hub/platform-filter';
import { DateRangeFilter } from '@/components/ads-hub/date-range-filter';

export default function ClientDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const { startDate, endDate, platform } = useDashboardStore();

  const { data: clientData, isLoading: clientLoading } = useClientDetail(clientId, startDate, endDate, platform);
  const { data: perfData, isLoading: perfLoading } = usePerformance(clientId, startDate, endDate, platform);
  const { data: campData, isLoading: campLoading } = useCampaigns(clientId, startDate, endDate, platform);

  const kpis = clientData?.kpis;
  const client = clientData?.client;

  return (
    <div className="px-6 pb-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/ads-hub"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--accent-subtle)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowRight size={18} />
          </Link>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {client?.name || 'טוען...'}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <PlatformFilter />
          <DateRangeFilter />
        </div>
      </div>

      {/* KPIs */}
      <KpiCards
        spend={Number(kpis?.total_spend || 0)}
        impressions={Number(kpis?.total_impressions || 0)}
        conversions={Number(kpis?.total_conversions || 0)}
        cpl={kpis?.cpl ? Number(kpis.cpl) : null}
        loading={clientLoading}
      />

      {/* Performance Chart */}
      <PerformanceChart
        data={perfData?.data || []}
        loading={perfLoading}
      />

      {/* Campaign Table */}
      <CampaignTable
        campaigns={campData?.campaigns || []}
        loading={campLoading}
      />
    </div>
  );
}
