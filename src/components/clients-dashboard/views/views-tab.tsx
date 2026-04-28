'use client';

import { useMemo, useState } from 'react';
import { Star, Pencil, Trash2, Loader2, LayoutGrid } from 'lucide-react';
import {
  useViews,
  updateView,
  deleteView,
  setDefault,
} from '@/lib/clients-dashboard/views-client';
import type { ClientSummary, UserViewRecord } from '@/lib/clients-dashboard/types';

// Human label for known scopes. Unknown scopes fall through to the raw key.
const SCOPE_LABELS: Record<string, string> = {
  'clients-list': 'רשימת לקוחות',
  campaigns: 'קמפיינים',
  creative: 'קראייטיב',
  history: 'היסטוריה',
  alerts: 'התראות',
};

function scopeLabel(scope: string): string {
  return SCOPE_LABELS[scope] ?? scope;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  // Match the contract used by sibling tabs even though Views is account-wide.
  client: ClientSummary;
}

export default function ViewsTab(props: Props) {
  // The client prop is part of the tab contract but not used here — Views is
  // account-wide. Touch it to satisfy lint without changing behavior.
  void props.client;
  const { views, isLoading, error, refresh } = useViews('');

  const grouped = useMemo(() => {
    const map = new Map<string, UserViewRecord[]>();
    for (const v of views) {
      const list = map.get(v.scope) ?? [];
      list.push(v);
      map.set(v.scope, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => scopeLabel(a).localeCompare(scopeLabel(b)));
  }, [views]);

  return (
    <div className="cd-views-tab">
      <div className="cd-card">
        <div className="cd-card__header">
          <h3>
            <LayoutGrid size={14} style={{ verticalAlign: 'middle', marginInlineEnd: 6 }} />
            התצוגות השמורות שלי
          </h3>
          <span className="cd-card__hint">
            תצוגות נשמרות אוטומטית מתוך סרגל הסינון של כל טאב.
          </span>
        </div>

        {error ? (
          <div className="cd-views-tab__error">
            שגיאה בטעינת תצוגות: {error instanceof Error ? error.message : 'נסה לרענן'}
          </div>
        ) : null}

        {isLoading && <div className="cd-empty">טוען תצוגות…</div>}

        {!isLoading && views.length === 0 && (
          <div className="cd-empty">
            עוד אין תצוגות שמורות. פתח טאב (לדוגמה {'"'}קמפיינים{'"'}), הגדר סינון נוח, ולחץ
            <strong style={{ margin: '0 4px' }}>{'"'}שמור תצוגה{'"'}</strong>
            כדי שתוכל לחזור אליו במכה.
          </div>
        )}

        {!isLoading &&
          grouped.map(([scope, list]) => (
            <div key={scope} className="cd-views-tab__group">
              <div className="cd-views-tab__group-head">
                <span className="cd-tag">{scopeLabel(scope)}</span>
                <span className="cd-views-tab__group-count">{list.length} תצוגות</span>
              </div>
              <table className="cd-table">
                <thead>
                  <tr>
                    <th style={{ width: 28 }}></th>
                    <th>שם</th>
                    <th>עדכון אחרון</th>
                    <th style={{ width: 220 }}>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((view) => (
                    <ViewRow key={view.id} view={view} onAfterChange={refresh} />
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </div>
    </div>
  );
}

function ViewRow({
  view,
  onAfterChange,
}: {
  view: UserViewRecord;
  onAfterChange: () => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(view.name);
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  async function commitRename() {
    const next = name.trim();
    if (next === view.name) {
      setEditing(false);
      return;
    }
    if (next.length < 1 || next.length > 80) {
      setRowError('שם 1..80 תווים');
      return;
    }
    setBusy(true);
    setRowError(null);
    try {
      await updateView(view.id, { name: next });
      setEditing(false);
      await onAfterChange();
    } catch (err) {
      setRowError(err instanceof Error ? err.message : 'שמירה נכשלה');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`למחוק את התצוגה "${view.name}"?`)) return;
    setBusy(true);
    setRowError(null);
    try {
      await deleteView(view.id, view.scope);
      await onAfterChange();
    } catch (err) {
      setRowError(err instanceof Error ? err.message : 'מחיקה נכשלה');
      setBusy(false);
    }
  }

  async function handleSetDefault() {
    setBusy(true);
    setRowError(null);
    try {
      if (view.isDefault) {
        await updateView(view.id, { isDefault: false });
      } else {
        await setDefault(view.id, view.scope);
      }
      await onAfterChange();
    } catch (err) {
      setRowError(err instanceof Error ? err.message : 'פעולה נכשלה');
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr>
      <td>
        <button
          type="button"
          className="cd-views-tab__star-btn"
          onClick={handleSetDefault}
          disabled={busy}
          aria-label={view.isDefault ? 'הסר כברירת מחדל' : 'קבע כברירת מחדל'}
          title={view.isDefault ? 'ברירת מחדל' : 'קבע כברירת מחדל'}
        >
          <Star
            size={14}
            fill={view.isDefault ? 'currentColor' : 'none'}
            color={view.isDefault ? '#eab308' : 'currentColor'}
          />
        </button>
      </td>
      <td>
        {editing ? (
          <input
            className="cd-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => void commitRename()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void commitRename();
              } else if (e.key === 'Escape') {
                setName(view.name);
                setEditing(false);
                setRowError(null);
              }
            }}
            autoFocus
            maxLength={80}
            disabled={busy}
          />
        ) : (
          <button
            type="button"
            className="cd-views-tab__name-btn"
            onClick={() => {
              setName(view.name);
              setEditing(true);
              setRowError(null);
            }}
            title="לחץ לעריכת שם"
          >
            {view.name}
          </button>
        )}
        {rowError && <div className="cd-views-tab__row-error">{rowError}</div>}
      </td>
      <td className="cd-mono" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
        {formatDate(view.updatedAt)}
      </td>
      <td>
        <div className="cd-views-tab__actions">
          <button
            type="button"
            className="cd-pill"
            onClick={() => {
              setName(view.name);
              setEditing(true);
              setRowError(null);
            }}
            disabled={busy || editing}
          >
            <Pencil size={12} />
            ערוך
          </button>
          <button
            type="button"
            className="cd-pill"
            onClick={handleSetDefault}
            disabled={busy}
            title={view.isDefault ? 'הסר כברירת מחדל' : 'קבע כברירת מחדל'}
          >
            <Star size={12} fill={view.isDefault ? 'currentColor' : 'none'} />
            {view.isDefault ? 'בטל ברירת מחדל' : 'קבע כברירת מחדל'}
          </button>
          <button
            type="button"
            className="cd-pill cd-views-tab__delete"
            onClick={handleDelete}
            disabled={busy}
          >
            {busy ? <Loader2 size={12} className="cd-views-bar__spin" /> : <Trash2 size={12} />}
            מחק
          </button>
        </div>
      </td>
    </tr>
  );
}
