'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { RefreshCw, Image as ImageIcon } from 'lucide-react';
import type { ClientSummary, CreativeType } from '@/lib/clients-dashboard/types';
import type { CreativeListRow } from '@/app/api/clients-dashboard/creative/route';
import CreativeCard from './creative-card';
import CreativeModal from './creative-modal';

type FilterType = CreativeType | 'all';

interface ListResponse {
  creatives: CreativeListRow[];
  range: { startDate: string; endDate: string };
  type: FilterType;
}

const FILTERS: Array<{ id: FilterType; label: string }> = [
  { id: 'all', label: 'הכל' },
  { id: 'video', label: 'וידאו' },
  { id: 'image', label: 'תמונה' },
  { id: 'carousel', label: 'קרוסלה' },
  { id: 'collection', label: 'קולקציה' },
];

const RANGES: Array<{ days: number; label: string }> = [
  { days: 7, label: '7 ימים' },
  { days: 14, label: '14 ימים' },
  { days: 30, label: '30 ימים' },
  { days: 90, label: '90 ימים' },
];

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function isoToday(): string {
  return new Date().toISOString().split('T')[0];
}

export default function CreativeTab({ client }: { client: ClientSummary }) {
  const [type, setType] = useState<FilterType>('all');
  const [rangeDays, setRangeDays] = useState<number>(30);
  const [openId, setOpenId] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const startDate = useMemo(() => isoDaysAgo(rangeDays), [rangeDays]);
  const endDate = useMemo(() => isoToday(), []);

  const url = `/api/clients-dashboard/creative?clientId=${client.id}&startDate=${startDate}&endDate=${endDate}&type=${type}`;
  const { data, error, isLoading, mutate } = useSWR<ListResponse>(url, fetcher);

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch(`/api/clients-dashboard/creative/sync?clientId=${client.id}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed: ${res.status}`);
      }
      await mutate();
    } catch (err) {
      setSyncError((err as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  const creatives = data?.creatives || [];

  return (
    <div>
      <div className="cd-creative-toolbar">
        <div className="cd-creative-pills">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`cd-pill${type === f.id ? ' cd-pill--active' : ''}`}
              onClick={() => setType(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="cd-creative-pills">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              className={`cd-pill${rangeDays === r.days ? ' cd-pill--active' : ''}`}
              onClick={() => setRangeDays(r.days)}
            >
              {r.label}
            </button>
          ))}
          <button
            type="button"
            className="cd-creative-sync-btn cd-creative-sync-btn--ghost"
            onClick={handleSync}
            disabled={syncing}
            title="סנכרון מולטי-מטה"
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'מסנכרן…' : 'סנכרון'}
          </button>
        </div>
      </div>

      {syncError && (
        <div
          className="cd-card"
          style={{ borderColor: '#b91c1c', color: '#b91c1c', marginBottom: 12 }}
        >
          סנכרון נכשל: {syncError}
        </div>
      )}

      {isLoading && <div className="cd-empty">טוען קראייטיבים…</div>}
      {error && !isLoading && (
        <div className="cd-empty" style={{ color: '#b91c1c' }}>
          שגיאה בטעינה: {(error as Error).message}
        </div>
      )}

      {!isLoading && !error && creatives.length === 0 && (
        <div className="cd-creative-empty">
          <ImageIcon size={28} style={{ color: 'var(--text-tertiary)', marginBottom: 8 }} />
          <p>עדיין אין קראייטיבים סנוכרנים עבור לקוח זה.</p>
          <button
            type="button"
            className="cd-creative-empty__btn"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'מסנכרן…' : 'סנכרון קראייטיב'}
          </button>
        </div>
      )}

      {!isLoading && creatives.length > 0 && (
        <div className="cd-creative-grid">
          {creatives.map((creative) => (
            <CreativeCard
              key={creative.id}
              creative={creative}
              currency={client.currency}
              metricType={client.metricType}
              onClick={() => setOpenId(creative.id)}
            />
          ))}
        </div>
      )}

      {openId !== null && (
        <CreativeModal
          creativeId={openId}
          startDate={startDate}
          endDate={endDate}
          currency={client.currency}
          metricType={client.metricType}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}
