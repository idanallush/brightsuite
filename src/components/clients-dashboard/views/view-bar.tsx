'use client';

import { useMemo, useState } from 'react';
import { Star, Save, Loader2 } from 'lucide-react';
import {
  useViews,
  saveView,
  setDefault,
  updateView,
} from '@/lib/clients-dashboard/views-client';

/**
 * Reusable saved-view picker that any tab can drop above its content.
 *
 * Contract:
 *   <ViewBar
 *     scope="campaigns"
 *     currentPayload={filters}
 *     onLoad={setFilters}
 *   />
 *
 * - `scope`: stable kebab-case key identifying the surface ('campaigns', etc.)
 * - `currentPayload`: the current filter/sort/etc. state to capture on save.
 *   Must be JSON-serializable.
 * - `onLoad(payload)`: invoked when the user picks a saved view. Receives the
 *   parsed payload — caller is responsible for applying it to its own state.
 */
export interface ViewBarProps<T> {
  scope: string;
  currentPayload: T;
  onLoad: (payload: T) => void;
  /** Optional label shown on the left side of the bar. Defaults to "תצוגה". */
  label?: string;
}

export function ViewBar<T>({ scope, currentPayload, onLoad, label }: ViewBarProps<T>) {
  const { views, isLoading } = useViews<T>(scope);
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedView = useMemo(
    () => (selectedId === '' ? null : views.find((v) => v.id === selectedId) ?? null),
    [views, selectedId],
  );

  function handleSelect(value: string) {
    if (value === '') {
      setSelectedId('');
      return;
    }
    const id = Number(value);
    setSelectedId(id);
    const view = views.find((v) => v.id === id);
    if (view) onLoad(view.payload as T);
  }

  async function handleSave() {
    const name = saveName.trim();
    if (name.length < 1 || name.length > 80) {
      setError('שם תצוגה חייב להיות 1..80 תווים');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await saveView<T>(scope, name, currentPayload, {
        isDefault: saveAsDefault,
      });
      setSelectedId(created.id);
      setShowSave(false);
      setSaveName('');
      setSaveAsDefault(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שמירה נכשלה');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleDefault() {
    if (!selectedView) return;
    setBusy(true);
    setError(null);
    try {
      if (selectedView.isDefault) {
        await updateView(selectedView.id, { isDefault: false });
      } else {
        await setDefault(selectedView.id, scope);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'פעולה נכשלה');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cd-views-bar">
      <span className="cd-views-bar__label">{label ?? 'תצוגה'}</span>

      <select
        className="cd-select cd-views-bar__select"
        value={selectedId}
        onChange={(e) => handleSelect(e.target.value)}
        disabled={isLoading}
      >
        <option value="">— בחר תצוגה —</option>
        {views.map((v) => (
          <option key={v.id} value={v.id}>
            {v.isDefault ? '★ ' : ''}
            {v.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="cd-views-bar__star"
        onClick={handleToggleDefault}
        disabled={!selectedView || busy}
        title={
          selectedView?.isDefault
            ? 'הסר כברירת מחדל'
            : selectedView
              ? 'קבע כברירת מחדל'
              : 'בחר תצוגה לשינוי'
        }
        aria-label="קבע כברירת מחדל"
      >
        <Star
          size={14}
          fill={selectedView?.isDefault ? 'currentColor' : 'none'}
        />
      </button>

      {!showSave ? (
        <button
          type="button"
          className="cd-pill cd-views-bar__save"
          onClick={() => {
            setShowSave(true);
            setError(null);
          }}
        >
          <Save size={12} />
          שמור תצוגה
        </button>
      ) : (
        <div className="cd-views-bar__save-form">
          <input
            className="cd-input cd-views-bar__name"
            placeholder="שם לתצוגה…"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSave();
              } else if (e.key === 'Escape') {
                setShowSave(false);
                setSaveName('');
              }
            }}
            autoFocus
            maxLength={80}
            disabled={busy}
          />
          <label className="cd-views-bar__default-toggle">
            <input
              type="checkbox"
              checked={saveAsDefault}
              onChange={(e) => setSaveAsDefault(e.target.checked)}
              disabled={busy}
            />
            ברירת מחדל
          </label>
          <button
            type="button"
            className="cd-pill cd-pill--active"
            onClick={() => void handleSave()}
            disabled={busy || saveName.trim().length === 0}
          >
            {busy ? <Loader2 size={12} className="cd-views-bar__spin" /> : <Save size={12} />}
            שמור
          </button>
          <button
            type="button"
            className="cd-pill"
            onClick={() => {
              setShowSave(false);
              setSaveName('');
              setError(null);
            }}
            disabled={busy}
          >
            בטל
          </button>
        </div>
      )}

      {error && <span className="cd-views-bar__error">{error}</span>}
    </div>
  );
}
