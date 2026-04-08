'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { TOOLS } from '@/lib/tools';
import { formatDateTime } from '@/lib/format';
import type { AuditEntry, ToolSlug } from '@/types/auth';

const ITEMS_PER_PAGE = 20;

const dateFilters = [
  { label: 'היום', value: 1 },
  { label: '7 ימים', value: 7 },
  { label: '30 יום', value: 30 },
] as const;

const toolColorMap: Record<string, string> = {
  'ad-checker': '#8b5cf6',
  budget: '#16a34a',
  cpa: '#ea580c',
  ads: '#FFDF4F',
  writer: '#d946ef',
};

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [toolFilter, setToolFilter] = useState<ToolSlug | ''>('');
  const [daysFilter, setDaysFilter] = useState<number>(30);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (toolFilter) params.set('tool', toolFilter);
      params.set('days', String(daysFilter));
      params.set('page', String(page));

      const res = await fetch(`/api/audit?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setTotal(data.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [toolFilter, daysFilter, page]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleToolChange = (value: string) => {
    setToolFilter(value as ToolSlug | '');
    setPage(1);
  };

  const handleDaysChange = (value: number) => {
    setDaysFilter(value);
    setPage(1);
  };

  const getToolLabel = (slug: string | null): string => {
    if (!slug) return '—';
    const tool = TOOLS.find((t) => t.slug === slug);
    return tool?.name || slug;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Tool filter */}
        <select
          value={toolFilter}
          onChange={(e) => handleToolChange(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm outline-none"
          style={{
            background: 'rgba(255,255,255,0.6)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <option value="">הכל</option>
          {TOOLS.map((tool) => (
            <option key={tool.slug} value={tool.slug}>
              {tool.name}
            </option>
          ))}
        </select>

        {/* Date chips */}
        <div className="flex gap-1.5">
          {dateFilters.map((df) => {
            const isActive = daysFilter === df.value;
            return (
              <button
                key={df.value}
                onClick={() => handleDaysChange(df.value)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                style={{
                  background: isActive ? '#FFDF4F' : 'rgba(255,255,255,0.6)',
                  color: isActive ? '#1a1a1a' : 'var(--text-secondary)',
                  border: isActive ? 'none' : '1px solid var(--border)',
                }}
              >
                {df.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            <p
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              טוען...
            </p>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-6 text-center">
            <p
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              לא נמצאו רשומות
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th
                    className="text-start px-4 py-3 font-medium"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    תאריך
                  </th>
                  <th
                    className="text-start px-4 py-3 font-medium"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    משתמש
                  </th>
                  <th
                    className="text-start px-4 py-3 font-medium"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    כלי
                  </th>
                  <th
                    className="text-start px-4 py-3 font-medium"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    פעולה
                  </th>
                  <th
                    className="text-start px-4 py-3 font-medium"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    פרטים
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td
                      className="px-4 py-3 whitespace-nowrap"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {formatDateTime(entry.createdAt)}
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {entry.userName || entry.userEmail || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {entry.toolSlug ? (
                        <span
                          className="inline-block text-xs px-2.5 py-0.5 rounded-full font-medium text-white"
                          style={{
                            background:
                              toolColorMap[entry.toolSlug] || '#6b7280',
                          }}
                        >
                          {getToolLabel(entry.toolSlug)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>
                          —
                        </span>
                      )}
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {entry.action}
                    </td>
                    <td
                      className="px-4 py-3 max-w-[200px] truncate"
                      style={{ color: 'var(--text-secondary)' }}
                      title={entry.details || ''}
                    >
                      {entry.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg transition-opacity disabled:opacity-30"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ChevronRight size={18} />
          </button>
          <span
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg transition-opacity disabled:opacity-30"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
