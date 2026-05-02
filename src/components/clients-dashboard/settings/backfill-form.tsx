'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

interface RawClientsResponse {
  clients: Record<string, unknown>[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export const BackfillForm = () => {
  const { data } = useSWR<RawClientsResponse>('/api/clients-dashboard/clients?raw=1', fetcher);
  const clients = data?.clients || [];

  const [clientId, setClientId] = useState('');
  const [platform, setPlatform] = useState('meta');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBackfill = async () => {
    if (!clientId || !startDate || !endDate) {
      toast.error('כל השדות הם חובה');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/clients-dashboard/sync/backfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: Number(clientId),
          platform,
          startDate,
          endDate,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const totalRecords = data.results?.reduce(
          (sum: number, r: { recordsSynced: number }) => sum + r.recordsSynced,
          0,
        ) || 0;
        toast.success(`Backfill הושלם: ${totalRecords} רשומות`);
      } else {
        toast.error(data.error || 'שגיאה ב-backfill');
      }
    } catch {
      toast.error('שגיאה ב-backfill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>לקוח</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-lg border"
            style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
          >
            <option value="">בחירת לקוח</option>
            {clients.map((c) => (
              <option key={c.id as number} value={c.id as number}>{c.name as string}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>פלטפורמה</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-lg border"
            style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
          >
            <option value="meta">Meta Ads</option>
            <option value="google">Google Ads</option>
            <option value="ga4">GA4</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>מתאריך</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-lg border"
            style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
          />
        </div>

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>עד תאריך</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-lg border"
            style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      <button
        onClick={handleBackfill}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
        style={{
          background: 'var(--accent)',
          color: '#1a1a1a',
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Download size={16} />
        {loading ? 'מעבד...' : 'התחל Backfill'}
      </button>
    </div>
  );
};
