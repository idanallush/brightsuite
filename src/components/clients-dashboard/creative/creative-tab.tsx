'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { ChevronLeft, ChevronRight, Image as ImageIcon, RefreshCw } from 'lucide-react';
import type { ClientSummary, CreativeType } from '@/lib/clients-dashboard/types';
import type { CreativeListRow } from '@/app/api/clients-dashboard/creative/route';
import CreativeCard from './creative-card';

// Modal is heavy (chart + asset gallery) and only mounts on click — keep it
// out of the initial bundle for the gallery view.
const CreativeModal = dynamic(() => import('./creative-modal'), {
  ssr: false,
  loading: () => null,
});

type FilterType = CreativeType | 'all';

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface ListResponse {
  creatives: CreativeListRow[];
  range: { startDate: string; endDate: string };
  type: FilterType;
  pagination: PaginationMeta;
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

const PAGE_SIZE = 24;
const SKELETON_COUNT = 9; // 3×3 grid placeholder.

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

function CreativeCardSkeleton() {
  return (
    <div className="cd-creative-card cd-creative-card--skeleton" aria-hidden="true">
      <div className="cd-creative-card__thumb cd-creative-card__thumb--skeleton" />
      <div className="cd-creative-card__body">
        <div className="cd-creative-card__skeleton-line cd-creative-card__skeleton-line--title" />
        <div className="cd-creative-card__skeleton-line cd-creative-card__skeleton-line--primary" />
        <div className="cd-creative-card__skeleton-line cd-creative-card__skeleton-line--meta" />
      </div>
    </div>
  );
}

export default function CreativeTab({ client }: { client: ClientSummary }) {
  const [type, setType] = useState<FilterType>('all');
  const [rangeDays, setRangeDays] = useState<number>(30);
  const [page, setPage] = useState<number>(1);
  const [openId, setOpenId] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const startDate = useMemo(() => isoDaysAgo(rangeDays), [rangeDays]);
  const endDate = useMemo(() => isoToday(), []);

  // Reset to first page whenever the filter or date range changes — otherwise
  // a user on page 5 of "all" can land on an empty page after switching to "video".
  useEffect(() => {
    setPage(1);
  }, [type, rangeDays, client.id]);

  const url =
    `/api/clients-dashboard/creative?clientId=${client.id}` +
    `&startDate=${startDate}&endDate=${endDate}&type=${type}` +
    `&page=${page}&pageSize=${PAGE_SIZE}`;
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
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const total = pagination?.total ?? 0;

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

      {isLoading && (
        <div className="cd-creative-grid" aria-busy="true" aria-live="polite">
          {Array.from({ length: SKELETON_COUNT }).map((_, idx) => (
            <CreativeCardSkeleton key={idx} />
          ))}
        </div>
      )}
      {error && !isLoading && (
        <div className="cd-empty" style={{ color: '#b91c1c' }}>
          שגיאה בטעינה: {(error as Error).message}
        </div>
      )}

      {!isLoading && !error && creatives.length === 0 && (
        <div className="cd-creative-empty">
          <div className="cd-creative-empty__icon">
            <ImageIcon size={28} />
          </div>
          <h3 className="cd-creative-empty__title">
            {client.hasMeta ? 'עדיין לא סונכרנו קראייטיבים' : 'אין חיבור Meta פעיל'}
          </h3>
          <p>
            {client.hasMeta
              ? 'לחיצה על "סנכרון" תמשוך מ-Meta את כל ה-ads האקטיביים, תסווג אותם לסוג (וידאו / תמונה / קרוסלה / קולקציה) ותציג גלריה עם ביצועים יומיים.'
              : 'כדי להציג קראייטיבים צריך לחבר חשבון Meta ללקוח זה דרך טאב מערכת ב-Ads Hub.'}
          </p>
          {client.hasMeta && (
            <button
              type="button"
              className="cd-creative-empty__btn"
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'מסנכרן מ-Meta…' : 'סנכרן קראייטיב מ-Meta'}
            </button>
          )}
          {client.hasMeta && (
            <div className="cd-creative-empty__hint">
              הסנכרון רץ אוטומטית פעם ביום; ניתן גם להריץ ידנית מכאן.
            </div>
          )}
        </div>
      )}

      {!isLoading && creatives.length > 0 && (
        <>
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

          {totalPages > 1 && (
            <div className="cd-creative-pagination">
              <button
                type="button"
                className="cd-creative-pagination__btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="עמוד קודם"
              >
                <ChevronRight size={14} />
                הקודם
              </button>
              <span className="cd-creative-pagination__info cd-mono">
                עמוד {page} מתוך {totalPages} · {total.toLocaleString('he-IL')} סה״כ
              </span>
              <button
                type="button"
                className="cd-creative-pagination__btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="עמוד הבא"
              >
                הבא
                <ChevronLeft size={14} />
              </button>
            </div>
          )}
        </>
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
