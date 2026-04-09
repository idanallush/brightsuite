'use client';

import { useDashboardStore } from '@/stores/ads-hub/dashboard-store';

const platforms = [
  { value: null, label: 'הכל' },
  { value: 'meta', label: 'Meta' },
  { value: 'google', label: 'Google' },
  { value: 'ga4', label: 'GA4' },
] as const;

export const PlatformFilter = () => {
  const { platform, setPlatform } = useDashboardStore();

  return (
    <div className="flex gap-1">
      {platforms.map((p) => {
        const isActive = platform === p.value;
        return (
          <button
            key={p.label}
            onClick={() => setPlatform(p.value)}
            className="px-3 py-1.5 text-sm rounded-lg transition-colors"
            style={{
              background: isActive ? 'var(--accent)' : 'transparent',
              color: isActive ? '#1a1a1a' : 'var(--text-secondary)',
              border: isActive ? 'none' : '1px solid var(--glass-border)',
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
};
