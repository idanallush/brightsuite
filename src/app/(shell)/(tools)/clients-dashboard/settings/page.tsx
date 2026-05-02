'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PlatformConnections } from '@/components/clients-dashboard/settings/platform-connections';
import { ClientManager } from '@/components/clients-dashboard/settings/client-manager';
import { BackfillForm } from '@/components/clients-dashboard/settings/backfill-form';
import { SyncLogTable } from '@/components/clients-dashboard/settings/sync-log-table';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface SyncLogResponse {
  logs: Array<{
    id: number;
    client_name: string | null;
    platform: string;
    sync_type: string;
    status: string;
    records_synced: number;
    error_message: string | null;
    started_at: string;
    completed_at: string | null;
  }>;
}

export default function ClientsDashboardSettingsPage() {
  const { data: syncLogData, isLoading: syncLogLoading } = useSWR<SyncLogResponse>(
    '/api/clients-dashboard/sync/status?limit=20',
    fetcher,
  );

  return (
    <div className="px-6 pt-6 pb-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            הגדרות Clients Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            חיבורי פלטפורמות, ניהול לקוחות וסנכרון נתונים
          </p>
        </div>
        <Link
          href="/clients-dashboard"
          className="flex items-center gap-1.5 text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowRight size={14} />
          חזרה לדשבורד
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          חיבורי פלטפורמות
        </h2>
        <PlatformConnections />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          ניהול לקוחות
        </h2>
        <ClientManager />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Backfill היסטורי
        </h2>
        <BackfillForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          לוג סנכרונים
        </h2>
        <SyncLogTable logs={syncLogData?.logs || []} loading={syncLogLoading} />
      </section>
    </div>
  );
}
