'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import {
  SearchableSelect,
  type SearchableSelectItem,
} from '@/components/clients-dashboard/ui/searchable-select';

interface RawClientsResponse {
  clients: Record<string, unknown>[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Parse a 'YYYY-MM-DD' string as local midnight — avoids UTC drift on
// last day of month (memory: feedback_budgetflow-date-parsing).
const parseLocal = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const BackfillForm = () => {
  const { data } = useSWR<RawClientsResponse>('/api/clients-dashboard/clients?raw=1', fetcher);
  const clients = data?.clients || [];

  const [clientId, setClientId] = useState('');
  const [platform, setPlatform] = useState('meta');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const clientItems = useMemo<SearchableSelectItem[]>(
    () =>
      clients.map((c) => {
        const id = String(c.id as number);
        const name = (c.name as string) ?? '';
        const slug = (c.slug as string | null) ?? '';
        return {
          key: id,
          label: name,
          searchText: `${name} ${slug}`.toLowerCase(),
        };
      }),
    [clients],
  );

  const handleBackfill = async () => {
    if (!clientId || !startDate || !endDate) {
      toast.error('כל השדות הם חובה');
      return;
    }

    const start = parseLocal(startDate);
    const end = parseLocal(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      toast.error('תאריך לא תקין');
      return;
    }

    if (start > end) {
      toast.error('תאריך התחלה חייב להיות לפני תאריך סיום');
      return;
    }

    const rangeDays = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
    if (rangeDays > 730) {
      toast.error('טווח התאריכים חורג מ-730 ימים (שנתיים)');
      return;
    }

    // Verify the selected client is actually connected to the selected platform.
    const selected = clients.find((c) => Number(c.id) === Number(clientId));
    if (!selected) {
      toast.error('הלקוח לא נמצא');
      return;
    }
    const hasMeta = Boolean(selected.meta_account_id);
    const hasGoogle = Boolean(selected.google_customer_id);
    const hasGa4 = Boolean(selected.ga4_property_id);
    const platformConnected =
      (platform === 'meta' && hasMeta) ||
      (platform === 'google' && hasGoogle) ||
      (platform === 'ga4' && hasGa4);
    if (!platformConnected) {
      toast.error('הלקוח לא מחובר לפלטפורמה הזו');
      return;
    }

    if (rangeDays > 90) {
      const ok = window.confirm('טווח רחב — הסנכרון עשוי להימשך מספר דקות. להמשיך?');
      if (!ok) return;
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
          <SearchableSelect
            items={clientItems}
            value={clientId}
            onChange={setClientId}
            placeholder="בחר לקוח"
            searchPlaceholder="חפש לקוח…"
            className="cd-ss--full"
          />
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
