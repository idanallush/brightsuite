'use client';

import { useSyncStatus } from '@/hooks/ads-hub/use-overview';
import { PlatformConnections } from '@/components/ads-hub/platform-connections';
import { SyncLogTable } from '@/components/ads-hub/sync-log-table';
import { ClientManager } from '@/components/ads-hub/client-manager';
import { BackfillForm } from '@/components/ads-hub/backfill-form';

export default function AdsHubSettingsPage() {
  const { data: syncData, isLoading: syncLoading } = useSyncStatus(30);

  return (
    <div className="px-6 pb-8 space-y-8">
      <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
        הגדרות Ads Hub
      </h2>

      {/* Unified Platform Connections */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          חיבורי פלטפורמות
        </h3>
        <PlatformConnections />
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
