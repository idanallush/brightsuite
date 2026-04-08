'use client';

import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface HelpTipProps {
  /** Help text to display */
  text: string;
  /** Icon size */
  size?: number;
  /** Preferred position */
  position?: 'top' | 'bottom';
}

export const HelpTip = ({ text, size = 15, position = 'bottom' }: HelpTipProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="rounded-full p-0.5 transition-colors"
        style={{ color: 'var(--text-tertiary)' }}
        aria-label="עזרה"
      >
        <Info size={size} />
      </button>

      {open && (
        <div
          className="absolute z-50 w-64 px-3 py-2.5 rounded-lg text-xs leading-relaxed shadow-lg"
          style={{
            background: 'var(--glass-bg-solid, #fff)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-secondary)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            ...(position === 'top'
              ? { bottom: 'calc(100% + 8px)', insetInlineStart: '50%', transform: 'translateX(50%)' }
              : { top: 'calc(100% + 8px)', insetInlineStart: '50%', transform: 'translateX(50%)' }),
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
};
