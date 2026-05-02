'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Pencil, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ClientSummary } from '@/lib/clients-dashboard/types';

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

export default function HistoryTab({ client }: HistoryTabProps) {
  const [campaignId, setCampaignId] = useState<string>('');
  const [showNoteFor, setShowNoteFor] = useState<number | null>(null);
  const [addingForCampaign, setAddingForCampaign] = useState<number | null>(null);

  const url = useMemo(() => {
    const params = new URLSearchParams({ clientId: String(client.id) });
    if (campaignId) params.set('campaignId', campaignId);
    return `/api/clients-dashboard/history?${params.toString()}`;
  }, [client.id, campaignId]);

  const { data, isLoading, mutate } = useSWR<HistoryResponse>(url, fetcher);

  const series = data?.series ?? [];
  const monthly = useMemo(() => aggregateMonthly(series), [series]);
  const isEcom = client.metricType === 'ecommerce';

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

  return (
    <div className="cd-history-tab">
      <div className="cd-history-toolbar">
        <label className="cd-history-toolbar__label">
          קמפיין:
          <select
            className="cd-select"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
          >
            <option value="">כל הקמפיינים</option>
            {(data?.campaigns ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                [{c.platform}] {c.name}
              </option>
            ))}
          </select>
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

      <MonthlyChart data={monthly} isEcom={isEcom} currency={client.currency} />

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
      </div>
    </div>
  );
}

// ============================================================
// Monthly chart (plain SVG — no charting libs)
// ============================================================

interface MonthlyPoint {
  month: string; // YYYY-MM
  spend: number;
  conversions: number;
  revenue: number;
}

function aggregateMonthly(series: HistorySeriesPoint[]): MonthlyPoint[] {
  const map = new Map<string, MonthlyPoint>();
  for (const p of series) {
    const month = p.date.slice(0, 7);
    const cur = map.get(month) ?? { month, spend: 0, conversions: 0, revenue: 0 };
    cur.spend += p.spend;
    cur.conversions += p.conversions;
    cur.revenue += p.revenue;
    map.set(month, cur);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

function MonthlyChart({
  data,
  isEcom,
  currency,
}: {
  data: MonthlyPoint[];
  isEcom: boolean;
  currency: string;
}) {
  const W = 720;
  const H = 220;
  const padL = 56;
  const padR = 56;
  const padT = 18;
  const padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  if (data.length === 0) {
    return (
      <div className="cd-history-chart">
        <div className="cd-history-chart__head">
          <h3>גרף חודשי — הוצאה ו{isEcom ? 'הכנסה' : 'המרות'}</h3>
        </div>
        <div className="cd-empty">אין נתונים בטווח שנבחר.</div>
      </div>
    );
  }

  const spendMax = Math.max(1, ...data.map((d) => d.spend));
  const secondaryKey: keyof MonthlyPoint = isEcom ? 'revenue' : 'conversions';
  const secondaryMax = Math.max(1, ...data.map((d) => d[secondaryKey] as number));

  const barW = innerW / data.length;
  const barInner = Math.max(8, barW * 0.55);

  const linePoints = data
    .map((d, i) => {
      const x = padL + i * barW + barW / 2;
      const v = d[secondaryKey] as number;
      const y = padT + innerH - (v / secondaryMax) * innerH;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="cd-history-chart">
      <div className="cd-history-chart__head">
        <h3>גרף חודשי — הוצאה ו{isEcom ? 'הכנסה' : 'המרות'}</h3>
        <div className="cd-history-chart__legend">
          <span className="cd-history-chart__legend-item">
            <span className="cd-history-chart__swatch cd-history-chart__swatch--bar" />
            הוצאה ({currency})
          </span>
          <span className="cd-history-chart__legend-item">
            <span className="cd-history-chart__swatch cd-history-chart__swatch--line" />
            {isEcom ? `הכנסה (${currency})` : 'המרות'}
          </span>
        </div>
      </div>
      <svg
        className="cd-history-chart__svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
      >
        {/* gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padT + innerH * (1 - t);
          return (
            <line
              key={t}
              x1={padL}
              x2={W - padR}
              y1={y}
              y2={y}
              stroke="rgba(0,0,0,0.06)"
              strokeWidth={1}
            />
          );
        })}
        {/* bars */}
        {data.map((d, i) => {
          const h = (d.spend / spendMax) * innerH;
          const x = padL + i * barW + (barW - barInner) / 2;
          const y = padT + innerH - h;
          return (
            <g key={d.month}>
              <rect
                x={x}
                y={y}
                width={barInner}
                height={h}
                fill="var(--accent)"
                rx={3}
              />
              <text
                x={padL + i * barW + barW / 2}
                y={H - 10}
                textAnchor="middle"
                fontSize={11}
                fill="var(--text-tertiary)"
              >
                {formatMonthLabel(d.month)}
              </text>
            </g>
          );
        })}
        {/* secondary line */}
        <polyline
          points={linePoints}
          fill="none"
          stroke="#0369a1"
          strokeWidth={2}
        />
        {data.map((d, i) => {
          const x = padL + i * barW + barW / 2;
          const v = d[secondaryKey] as number;
          const y = padT + innerH - (v / secondaryMax) * innerH;
          return <circle key={d.month + 'p'} cx={x} cy={y} r={3} fill="#0369a1" />;
        })}
        {/* y axis (left) — spend */}
        {[0, 0.5, 1].map((t) => {
          const y = padT + innerH * (1 - t);
          return (
            <text
              key={`yl-${t}`}
              x={padL - 6}
              y={y + 3}
              textAnchor="end"
              fontSize={10}
              fill="var(--text-tertiary)"
            >
              {abbr(spendMax * t)}
            </text>
          );
        })}
        {/* y axis (right) — secondary */}
        {[0, 0.5, 1].map((t) => {
          const y = padT + innerH * (1 - t);
          return (
            <text
              key={`yr-${t}`}
              x={W - padR + 6}
              y={y + 3}
              textAnchor="start"
              fontSize={10}
              fill="var(--text-tertiary)"
            >
              {abbr(secondaryMax * t)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return `${m}/${y.slice(2)}`;
}

function abbr(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  if (n >= 10) return n.toFixed(0);
  return n.toFixed(1);
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
