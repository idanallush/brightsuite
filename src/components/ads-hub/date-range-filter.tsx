'use client';

import { useDashboardStore } from '@/stores/ads-hub/dashboard-store';

export const DateRangeFilter = () => {
  const { startDate, endDate, setDateRange } = useDashboardStore();

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={startDate}
        onChange={(e) => setDateRange(e.target.value, endDate)}
        className="text-sm px-3 py-1.5 rounded-lg border"
        style={{
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)',
        }}
      />
      <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>—</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => setDateRange(startDate, e.target.value)}
        className="text-sm px-3 py-1.5 rounded-lg border"
        style={{
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)',
        }}
      />
    </div>
  );
};
