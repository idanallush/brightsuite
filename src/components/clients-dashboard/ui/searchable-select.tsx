'use client';

import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ChevronDown, X } from 'lucide-react';

/**
 * Generic searchable combobox for clients-dashboard.
 *
 * Replaces native <select>s that become unusable with hundreds of items.
 * Renders a trigger button styled like `.cd-select`, plus a popover with a
 * search input and a scrollable item list (max 8 visible at a time).
 *
 * No external dependencies — keyboard navigation (ArrowUp/Down/Enter/Esc),
 * outside-click close, and RTL-friendly anchoring are implemented locally.
 */

export interface SearchableSelectItem {
  /** Stable string key for React + the `value` prop. */
  key: string;
  /** Visible label rendered inside the trigger when this item is selected. */
  label: string;
  /** Free-form text (lowercased) used for case-insensitive substring matching. */
  searchText: string;
  /** Custom row renderer (e.g. with a platform pill). Falls back to `label`. */
  render?: ReactNode;
}

interface SearchableSelectProps {
  items: SearchableSelectItem[];
  /** Currently selected key. Empty string => no selection / "clear" option. */
  value: string;
  onChange: (key: string) => void;
  /** Trigger placeholder when nothing is selected. */
  placeholder: string;
  /** Search input placeholder. */
  searchPlaceholder: string;
  /**
   * If provided, an extra row at the top of the list with this label and an
   * empty-string value. Used by the history tab for "כל הקמפיינים".
   */
  clearOptionLabel?: string;
  /** Optional inline style passthrough — used by the backfill form. */
  className?: string;
  disabled?: boolean;
}

const MAX_VISIBLE = 8;
const ROW_HEIGHT_PX = 36;

export function SearchableSelect({
  items,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  clearOptionLabel,
  className,
  disabled,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();

  // Build the visible options. If a clear-option label was provided we
  // prepend a synthetic row with an empty key.
  const visibleItems = useMemo<SearchableSelectItem[]>(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? items.filter((it) => it.searchText.includes(q))
      : items;
    if (clearOptionLabel) {
      // The clear row is always shown when query is empty, and shown when
      // it itself matches the query.
      const clearItem: SearchableSelectItem = {
        key: '',
        label: clearOptionLabel,
        searchText: clearOptionLabel.toLowerCase(),
      };
      if (!q || clearItem.searchText.includes(q)) {
        return [clearItem, ...filtered];
      }
    }
    return filtered;
  }, [items, query, clearOptionLabel]);

  // Reset highlight when the query changes or the popover opens.
  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  // Auto-focus the search input when opened.
  useEffect(() => {
    if (open) {
      // next tick — popover is now mounted
      const id = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
    setQuery('');
  }, [open]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  // Scroll the highlighted row into view when it changes.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLElement>(
      `[data-cd-ss-index="${highlight}"]`,
    );
    if (el) {
      const top = el.offsetTop;
      const bottom = top + el.offsetHeight;
      if (top < list.scrollTop) list.scrollTop = top;
      else if (bottom > list.scrollTop + list.clientHeight)
        list.scrollTop = bottom - list.clientHeight;
    }
  }, [highlight, open]);

  const handleSelect = useCallback(
    (key: string) => {
      onChange(key);
      setOpen(false);
      // Return focus to the trigger so keyboard users keep their place.
      triggerRef.current?.focus();
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight((h) =>
          visibleItems.length === 0 ? 0 : (h + 1) % visibleItems.length,
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((h) =>
          visibleItems.length === 0
            ? 0
            : (h - 1 + visibleItems.length) % visibleItems.length,
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = visibleItems[highlight];
        if (item) handleSelect(item.key);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setHighlight(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setHighlight(Math.max(0, visibleItems.length - 1));
      }
    },
    [open, visibleItems, highlight, handleSelect],
  );

  const selectedLabel = useMemo(() => {
    if (!value) return '';
    return items.find((it) => it.key === value)?.label ?? '';
  }, [items, value]);

  return (
    <div
      className={`cd-ss${className ? ` ${className}` : ''}`}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        className="cd-ss__trigger cd-select"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className="cd-ss__trigger-label">
          {selectedLabel || (
            <span className="cd-ss__placeholder">{placeholder}</span>
          )}
        </span>
        <ChevronDown size={14} className="cd-ss__chev" aria-hidden />
      </button>

      {open && (
        <div ref={popoverRef} className="cd-ss__popover" role="presentation">
          <div className="cd-ss__search">
            <input
              ref={inputRef}
              type="text"
              className="cd-input cd-ss__input"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              dir="rtl"
            />
            {query && (
              <button
                type="button"
                className="cd-ss__clear"
                aria-label="נקה חיפוש"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>
          <div
            ref={listRef}
            className="cd-ss__list"
            id={listboxId}
            role="listbox"
            style={{ maxHeight: `${MAX_VISIBLE * ROW_HEIGHT_PX}px` }}
          >
            {visibleItems.length === 0 ? (
              <div className="cd-ss__empty">לא נמצאו תוצאות</div>
            ) : (
              visibleItems.map((it, idx) => {
                const isSelected = it.key === value;
                const isHighlighted = idx === highlight;
                return (
                  <button
                    key={it.key || '__cd_ss_clear__'}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-cd-ss-index={idx}
                    className={[
                      'cd-ss__item',
                      isHighlighted ? 'cd-ss__item--highlighted' : '',
                      isSelected ? 'cd-ss__item--selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => handleSelect(it.key)}
                  >
                    {it.render ?? it.label}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Tiny platform pill used inside SearchableSelect rows. Lives here so callers
 * don't need to import a styling primitive from a sibling tab.
 */
export function PlatformPill({ platform }: { platform: string }) {
  const label =
    platform === 'meta'
      ? 'Meta'
      : platform === 'google'
        ? 'Google'
        : platform === 'ga4'
          ? 'GA4'
          : platform;
  return (
    <span className={`cd-ss__pill cd-ss__pill--${platform}`}>{label}</span>
  );
}
