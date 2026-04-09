'use client';

import { usePlatformStatus, useSyncStatus } from '@/hooks/ads-hub/use-overview';
import { SyncStatusCards } from '@/components/ads-hub/sync-status-cards';
import { SyncLogTable } from '@/components/ads-hub/sync-log-table';
import { ClientManager } from '@/components/ads-hub/client-manager';
import { BackfillForm } from '@/components/ads-hub/backfill-form';

export default function AdsHubSettingsPage() {
  const { data: platformData, isLoading: platformLoading } = usePlatformStatus();
  const { data: syncData, isLoading: syncLoading } = useSyncStatus(30);

  return (
    <div className="px-6 pb-8 space-y-8">
      <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
        הגדרות Ads Hub
      </h2>

      {/* Connection Status */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          סטטוס חיבור
        </h3>
        <SyncStatusCards
          platforms={platformData?.platforms || []}
          loading={platformLoading}
        />
      </section>

      {/* Client Management */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          ניהול לקוחות
        </h3>
        <ClientManager />
      </section>

      {/* Backfill */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          שליפת נתונים היסטוריים
        </h3>
        <BackfillForm />
      </section>

      {/* Sync Log */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          יומן סנכרון
        </h3>
        <SyncLogTable logs={syncData?.logs || []} loading={syncLoading} />
      </section>
    </div>
  );
}
