'use client';

import { CheckCircle2, XCircle } from 'lucide-react';

interface PlatformStatus {
  platform: string;
  connected: boolean;
  lastSync: string | null;
  accountCount: number;
  lastError: string | null;
}

interface SyncStatusCardsProps {
  platforms: PlatformStatus[];
  loading?: boolean;
}

const platformLabels: Record<string, string> = {
  google: 'Google Ads',
  meta: 'Meta Ads',
  ga4: 'Google Analytics 4',
};

const formatDate = (d: string | null): string => {
  if (!d) return 'לא בוצע';
  return new Date(d).toLocaleString('he-IL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const SyncStatusCards = ({ platforms, loading }: SyncStatusCardsProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card rounded-xl h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {platforms.map((p) => (
        <div key={p.platform} className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {platformLabels[p.platform] || p.platform}
            </span>
            {p.connected ? (
              <span className="flex items-center gap-1 text-xs" style={{ color: '#1a7a4c' }}>
                <CheckCircle2 size={14} />
                מחובר
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs" style={{ color: '#c0392b' }}>
                <XCircle size={14} />
                לא מחובר
              </span>
            )}
          </div>

          <div className="space-y-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <p>סנכרון אחרון: {formatDate(p.lastSync)}</p>
            <p>חשבונות: {p.accountCount}</p>
          </div>

          {p.lastError && (
            <p className="text-xs truncate" style={{ color: '#c0392b' }} title={p.lastError}>
              {p.lastError}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};
