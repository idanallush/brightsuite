'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { ChevronLeft, ChevronRight, Pencil, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ClientSummary } from '@/lib/clients-dashboard/types';
import {
  PlatformPill,
  SearchableSelect,
  type SearchableSelectItem,
} from '@/components/clients-dashboard/ui/searchable-select';

interface HistoryTabProps {
  client: ClientSummary;
}

interface HistoryChange {
  id: number;
  clientId: number;
  campaignId: number | null;
  platform: string;
  platformCampaignId: string | null;
  changeType: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  source: 'sync' | 'user' | 'system';
  userId: number | null;
  detectedAt: string;
  note: string | null;
  campaignName: string | null;
  userName: string | null;
}

interface HistoryCampaign {
  id: number;
  name: string;
  platform: string;
  platformCampaignId: string | null;
  status: string | null;
}

interface HistorySeriesPoint {
  date: string;
  spend: number;
  conversions: number;
  revenue: number;
}

interface HistoryResponse {
  changes: HistoryChange[];
  total: number;
  page: number;
  pageSize: number;
  series: HistorySeriesPoint[];
  campaigns: HistoryCampaign[];
  range: { startDate: string; endDate: string };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const SOURCE_LABEL: Record<HistoryChange['source'], string> = {
  sync: 'סנכרון',
  user: 'ידני',
  system: 'מערכת',
};

const FIELD_LABEL: Record<string, string> = {
  status: 'סטטוס',
  name: 'שם',
  objective: 'יעד',
};

const PAGE_SIZE_OPTIONS = [50, 100, 200] as const;
const DEFAULT_PAGE_SIZE = 100;

function parsePage(raw: string | null): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

function parsePageSize(raw: string | null): number {
  const n = Number(raw);
  if (Number.isFinite(n) && PAGE_SIZE_OPTIONS.includes(n as (typeof PAGE_SIZE_OPTIONS)[number])) {
    return n;
  }
  return DEFAULT_PAGE_SIZE;
}

export default function HistoryTab({ client }: HistoryTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [campaignId, setCampaignId] = useState<string>('');
  const [showNoteFor, setShowNoteFor] = useState<number | null>(null);
  const [addingForCampaign, setAddingForCampaign] = useState<number | null>(null);

  const [page, setPage] = useState<number>(() => parsePage(searchParams.get('page')));
  const [pageSize, setPageSize] = useState<number>(() => parsePageSize(searchParams.get('pageSize')));

  // Sync page/pageSize back to the URL (same pattern as cpa/page.tsx).
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) params.delete('page');
    else params.set('page', String(page));
    if (pageSize === DEFAULT_PAGE_SIZE) params.delete('pageSize');
    else params.set('pageSize', String(pageSize));
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : '?', { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const url = useMemo(() => {
    const params = new URLSearchParams({
      clientId: String(client.id),
      page: String(page),
      pageSize: String(pageSize),
    });
    if (campaignId) params.set('campaignId', campaignId);
    return `/api/clients-dashboard/history?${params.toString()}`;
  }, [client.id, campaignId, page, pageSize]);

  const { data, isLoading, mutate } = useSWR<HistoryResponse>(url, fetcher);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  const handleCampaignChange = useCallback((value: string) => {
    setCampaignId(value);
    setPage(1);
  }, []);

  const handlePageSizeChange = useCallback((value: number) => {
    setPageSize(value);
    setPage(1);
  }, []);

  const submitNote = async (cmpId: number, note: string) => {
    const trimmed = note.trim();
    if (!trimmed) {
      toast.error('יש להזין טקסט להערה');
      return false;
    }
    try {
      const res = await fetch('/api/clients-dashboard/history/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: cmpId, note: trimmed }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error || `שגיאה בשמירת ההערה (${res.status})`);
        return false;
      }
      toast.success('ההערה נשמרה');
      await mutate();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בשמירת ההערה');
      return false;
    }
  };

  const campaignItems = useMemo<SearchableSelectItem[]>(
    () =>
      (data?.campaigns ?? []).map((c) => {
        const idStr = String(c.id);
        const platformId = c.platformCampaignId ?? '';
        return {
          key: idStr,
          label: c.name,
          searchText: `${c.name} ${platformId}`.toLowerCase(),
          render: (
            <>
              <span className="cd-ss__item-label">{c.name}</span>
              <PlatformPill platform={c.platform} />
            </>
          ),
        };
      }),
    [data?.campaigns],
  );

  return (
    <div className="cd-history-tab">
      <div className="cd-history-toolbar">
        <label className="cd-history-toolbar__label">
          קמפיין:
          <SearchableSelect
            items={campaignItems}
            value={campaignId}
            onChange={handleCampaignChange}
            placeholder="כל הקמפיינים"
            searchPlaceholder="חפש קמפיין…"
            clearOptionLabel="כל הקמפיינים"
          />
        </label>
        <button
          type="button"
          className="cd-alert-btn cd-alert-btn--primary"
          disabled={!campaignId}
          onClick={() =>
            setAddingForCampaign(campaignId ? Number(campaignId) : null)
          }
        >
          <Plus size={14} /> הוסף הערה
        </button>
      </div>

      {addingForCampaign != null && (
        <NoteForm
          campaignId={addingForCampaign}
          onCancel={() => setAddingForCampaign(null)}
          onSubmit={async (note) => {
            const ok = await submitNote(addingForCampaign, note);
            if (ok) setAddingForCampaign(null);
            return ok;
          }}
        />
      )}

      <div className="cd-history-timeline">
        <div className="cd-history-timeline__head">
          <h3>היסטוריית עריכות</h3>
          <span className="cd-card__hint">
            {data?.range.startDate} ↔ {data?.range.endDate}
          </span>
        </div>
        {isLoading ? (
          <div className="cd-history-timeline__list">
            {[1, 2, 3].map((i) => (
              <div key={i} className="cd-history-row cd-history-row--skeleton" />
            ))}
          </div>
        ) : (data?.changes ?? []).length === 0 ? (
          <div className="cd-empty">
            <strong>אין שינויים בטווח</strong>
            <div>לא נרשמו עדכוני קמפיין או הערות בטווח התאריכים שנבחר.</div>
          </div>
        ) : (
          <div className="cd-history-timeline__list">
            {(data?.changes ?? []).map((change) => (
              <ChangeRow
                key={change.id}
                change={change}
                editing={showNoteFor === change.id}
                onEdit={() => setShowNoteFor(change.id)}
                onCancelEdit={() => setShowNoteFor(null)}
                onSubmitEdit={async (note) => {
                  if (change.campaignId == null) {
                    toast.error('לא ניתן להוסיף הערה — חסר מזהה קמפיין');
                    return false;
                  }
                  const ok = await submitNote(change.campaignId, note);
                  if (ok) setShowNoteFor(null);
                  return ok;
                }}
              />
            ))}
          </div>
        )}

        <div className="cd-history-pagination">
          <div className="cd-history-pagination__count">
            {total === 0
              ? 'אין רשומות'
              : `מציג ${rangeStart}–${rangeEnd} מתוך ${total}`}
          </div>
          <div className="cd-history-pagination__controls">
            <label className="cd-history-pagination__page-size">
              לעמוד:
              <select
                className="cd-select"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="cd-alert-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              aria-label="העמוד הקודם"
            >
              <ChevronRight size={14} />
              הקודם
            </button>
            <span className="cd-history-pagination__page">
              עמוד {page} מתוך {totalPages}
            </span>
            <button
              type="button"
              className="cd-alert-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              aria-label="העמוד הבא"
            >
              הבא
              <ChevronLeft size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Change row + note form
// ============================================================

function ChangeRow({
  change,
  editing,
  onEdit,
  onCancelEdit,
  onSubmitEdit,
}: {
  change: HistoryChange;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSubmitEdit: (note: string) => Promise<boolean>;
}) {
  const canEdit = change.campaignId != null;
  const isExistingNote = change.changeType === 'note' && !!change.note;
  return (
    <>
      <div className="cd-history-row">
        <div className="cd-history-row__date">{formatDate(change.detectedAt)}</div>
        <div className="cd-history-row__campaign">
          {change.campaignName ?? change.platformCampaignId ?? '—'}
          <span className="cd-history-row__platform">{change.platform}</span>
        </div>
        <div className="cd-history-row__desc">{describeChange(change)}</div>
        <div className="cd-history-row__source">
          <span className={`cd-history-source cd-history-source--${change.source}`}>
            {SOURCE_LABEL[change.source]}
            {change.source === 'user' && change.userName ? ` · ${change.userName}` : ''}
          </span>
          {canEdit && !editing && (
            <button
              type="button"
              className="cd-history-row__edit"
              onClick={onEdit}
              aria-label={isExistingNote ? 'ערוך הערה' : 'הוסף הערה'}
              title={isExistingNote ? 'ערוך הערה' : 'הוסף הערה'}
            >
              <Pencil size={13} />
            </button>
          )}
        </div>
      </div>
      {editing && (
        <NoteForm
          campaignId={change.campaignId as number}
          initialValue={isExistingNote ? change.note ?? '' : ''}
          onCancel={onCancelEdit}
          onSubmit={onSubmitEdit}
        />
      )}
    </>
  );
}

function describeChange(change: HistoryChange): string {
  if (change.changeType === 'note') {
    return change.note ?? '';
  }
  if (change.changeType === 'baseline') {
    const fieldLabel = change.field ? FIELD_LABEL[change.field] ?? change.field : '';
    return `נרשם ${fieldLabel}: ${change.newValue ?? ''}`;
  }
  const fieldLabel = change.field ? FIELD_LABEL[change.field] ?? change.field : '';
  return `${fieldLabel}: ${change.oldValue ?? '—'} → ${change.newValue ?? '—'}`;
}

function formatDate(iso: string): string {
  return new Date(iso.includes('T') ? iso : `${iso}Z`).toLocaleString('he-IL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function NoteForm({
  campaignId,
  initialValue = '',
  onCancel,
  onSubmit,
}: {
  campaignId: number;
  initialValue?: string;
  onCancel: () => void;
  onSubmit: (note: string) => Promise<boolean> | void;
}) {
  const [text, setText] = useState(initialValue);
  const [busy, setBusy] = useState(false);

  return (
    <div className="cd-history-note-form">
      <div className="cd-history-note-form__head">
        <Pencil size={14} />
        <span>הערה לקמפיין #{campaignId}</span>
        <button
          type="button"
          className="cd-history-note-form__close"
          onClick={onCancel}
          aria-label="סגור"
        >
          <X size={14} />
        </button>
      </div>
      <textarea
        className="cd-input cd-history-note-form__input"
        rows={3}
        placeholder="תיאור השינוי / סיבת ההערה"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="cd-history-note-form__actions">
        <button
          type="button"
          className="cd-alert-btn"
          onClick={onCancel}
          disabled={busy}
        >
          ביטול
        </button>
        <button
          type="button"
          className="cd-alert-btn cd-alert-btn--primary"
          disabled={!text.trim() || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onSubmit(text);
            } finally {
              setBusy(false);
            }
          }}
        >
          שמור
        </button>
      </div>
    </div>
  );
}
