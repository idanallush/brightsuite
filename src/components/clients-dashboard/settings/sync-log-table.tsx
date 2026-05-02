'use client';

interface SyncLogEntry {
  id: number;
  client_name: string | null;
  platform: string;
  sync_type: string;
  status: string;
  records_synced: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

interface SyncLogTableProps {
  logs: SyncLogEntry[];
  loading?: boolean;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  success: { bg: '#e8f5ee', text: '#1a7a4c' },
  error: { bg: '#fceaea', text: '#c0392b' },
  partial: { bg: '#fff8e1', text: '#d4a017' },
  skipped: { bg: '#f0f0ec', text: '#8a877f' },
};

const statusLabels: Record<string, string> = {
  success: 'הצלחה',
  error: 'שגיאה',
  partial: 'חלקי',
  skipped: 'דולג',
};

const syncTypeLabels: Record<string, string> = {
  daily: 'יומי',
  backfill: 'היסטורי',
  video_discovery: 'גילוי וידאו',
};

const formatDate = (d: string): string => {
  return new Date(d).toLocaleString('he-IL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const SyncLogTable = ({ logs, loading }: SyncLogTableProps) => {
  if (loading) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 rounded bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 text-center">
        <p style={{ color: 'var(--text-secondary)' }}>אין רשומות סנכרון עדיין</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
            <th className="text-right py-2.5 px-4 font-medium" style={{ color: 'var(--text-tertiary)' }}>זמן</th>
            <th className="text-right py-2.5 px-4 font-medium hidden md:table-cell" style={{ color: 'var(--text-tertiary)' }}>לקוח</th>
            <th className="text-right py-2.5 px-4 font-medium" style={{ color: 'var(--text-tertiary)' }}>פלטפורמה</th>
            <th className="text-right py-2.5 px-4 font-medium hidden md:table-cell" style={{ color: 'var(--text-tertiary)' }}>סוג</th>
            <th className="text-right py-2.5 px-4 font-medium" style={{ color: 'var(--text-tertiary)' }}>סטטוס</th>
            <th className="text-right py-2.5 px-4 font-medium" style={{ color: 'var(--text-tertiary)' }}>רשומות</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const sc = statusColors[log.status] || statusColors.skipped;
            return (
              <tr
                key={log.id}
                style={{ borderBottom: '1px solid var(--glass-border)' }}
                title={log.error_message || undefined}
              >
                <td className="py-2.5 px-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {formatDate(log.started_at)}
                </td>
                <td className="py-2.5 px-4 hidden md:table-cell" style={{ color: 'var(--text-primary)' }}>
                  {log.client_name || '—'}
                </td>
                <td className="py-2.5 px-4" style={{ color: 'var(--text-primary)' }}>
                  {log.platform}
                </td>
                <td className="py-2.5 px-4 hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                  {syncTypeLabels[log.sync_type] || log.sync_type}
                </td>
                <td className="py-2.5 px-4">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: sc.bg, color: sc.text }}
                  >
                    {statusLabels[log.status] || log.status}
                  </span>
                </td>
                <td className="py-2.5 px-4 font-mono" style={{ color: 'var(--text-primary)' }}>
                  {log.records_synced}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
