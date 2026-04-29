'use client';

import Link from 'next/link';

interface ClientRow {
  id: number;
  name: string;
  slug: string;
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  cpl: number | null;
}

interface ClientTableProps {
  clients: ClientRow[];
  loading?: boolean;
}

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('he-IL');
};

export const ClientTable = ({ clients, loading }: ClientTableProps) => {
  if (loading) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <p style={{ color: 'var(--text-secondary)' }}>
          אין לקוחות עדיין. הוסיפו לקוח חדש בהגדרות.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
            <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-tertiary)' }}>לקוח</th>
            <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-tertiary)' }}>הוצאה</th>
            <th className="text-right py-3 px-4 font-medium hidden md:table-cell" style={{ color: 'var(--text-tertiary)' }}>חשיפות</th>
            <th className="text-right py-3 px-4 font-medium hidden md:table-cell" style={{ color: 'var(--text-tertiary)' }}>קליקים</th>
            <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-tertiary)' }}>המרות</th>
            <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-tertiary)' }}>CPL</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr
              key={client.id}
              className="transition-colors hover:bg-[var(--accent-subtle)]"
              style={{ borderBottom: '1px solid var(--glass-border)' }}
            >
              <td className="py-3 px-4">
                <Link
                  href={`/ads-hub/${client.id}`}
                  className="font-medium hover:underline"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {client.name}
                </Link>
              </td>
              <td className="py-3 px-4 font-mono" style={{ color: 'var(--text-primary)' }}>
                ₪{formatNumber(Number(client.total_spend))}
              </td>
              <td className="py-3 px-4 hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                {formatNumber(Number(client.total_impressions))}
              </td>
              <td className="py-3 px-4 hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                {formatNumber(Number(client.total_clicks))}
              </td>
              <td className="py-3 px-4" style={{ color: 'var(--text-primary)' }}>
                {Number(client.total_conversions).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
              </td>
              <td className="py-3 px-4 font-mono" style={{ color: 'var(--text-primary)' }}>
                {client.cpl ? `₪${Number(client.cpl).toFixed(1)}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
