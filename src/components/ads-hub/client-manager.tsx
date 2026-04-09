'use client';

import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useOverview } from '@/hooks/ads-hub/use-overview';
import { toast } from 'sonner';
import { useDashboardStore } from '@/stores/ads-hub/dashboard-store';

export const ClientManager = () => {
  const { startDate, endDate } = useDashboardStore();
  const { data, mutate } = useOverview(startDate, endDate);
  const clients = data?.clients || [];

  const [showForm, setShowForm] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    metaAccountId: '',
    googleCustomerId: '',
    googleMccId: '',
    ga4PropertyId: '',
  });

  const handleAdd = async () => {
    if (!form.name || !form.slug) {
      toast.error('שם ו-slug הם שדות חובה');
      return;
    }

    try {
      const res = await fetch('/api/ads-hub/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'שגיאה ביצירת לקוח');
        return;
      }

      toast.success('לקוח נוסף בהצלחה');
      setShowForm(false);
      setForm({ name: '', slug: '', metaAccountId: '', googleCustomerId: '', googleMccId: '', ga4PropertyId: '' });
      mutate();
    } catch {
      toast.error('שגיאה ביצירת לקוח');
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/ads-hub/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(`סנכרון הושלם: ${data.clients} לקוחות`);
      } else {
        toast.error(data.error || 'שגיאה בסנכרון');
      }
    } catch {
      toast.error('שגיאה בסנכרון');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
          style={{ background: 'var(--accent)', color: '#1a1a1a' }}
        >
          <Plus size={16} />
          הוסף לקוח
        </button>
        <button
          onClick={handleManualSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors"
          style={{
            borderColor: 'var(--glass-border)',
            color: 'var(--text-secondary)',
            opacity: syncing ? 0.6 : 1,
          }}
        >
          <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'מסנכרן...' : 'סנכרן עכשיו'}
        </button>
      </div>

      {/* Add Client Form */}
      {showForm && (
        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>שם לקוח *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border"
                style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
                placeholder="שם הלקוח"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Slug *</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border"
                dir="ltr"
                style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
                placeholder="client-slug"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Meta Account ID</label>
              <input
                type="text"
                value={form.metaAccountId}
                onChange={(e) => setForm({ ...form, metaAccountId: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border"
                dir="ltr"
                style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
                placeholder="act_123456789"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Google Customer ID</label>
              <input
                type="text"
                value={form.googleCustomerId}
                onChange={(e) => setForm({ ...form, googleCustomerId: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border"
                dir="ltr"
                style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
                placeholder="123-456-7890"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Google MCC ID</label>
              <input
                type="text"
                value={form.googleMccId}
                onChange={(e) => setForm({ ...form, googleMccId: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border"
                dir="ltr"
                style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
                placeholder="123-456-7890"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>GA4 Property ID</label>
              <input
                type="text"
                value={form.ga4PropertyId}
                onChange={(e) => setForm({ ...form, ga4PropertyId: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-lg border"
                dir="ltr"
                style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
                placeholder="123456789"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="px-4 py-2 text-sm font-medium rounded-lg"
              style={{ background: 'var(--accent)', color: '#1a1a1a' }}
            >
              שמור
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border"
              style={{ borderColor: 'var(--glass-border)', color: 'var(--text-secondary)' }}
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Client List */}
      {clients.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <th className="text-right py-2.5 px-4 font-medium" style={{ color: 'var(--text-tertiary)' }}>לקוח</th>
                <th className="text-right py-2.5 px-4 font-medium hidden md:table-cell" style={{ color: 'var(--text-tertiary)' }}>Meta</th>
                <th className="text-right py-2.5 px-4 font-medium hidden md:table-cell" style={{ color: 'var(--text-tertiary)' }}>Google</th>
                <th className="text-right py-2.5 px-4 font-medium hidden md:table-cell" style={{ color: 'var(--text-tertiary)' }}>GA4</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c: Record<string, unknown>) => (
                <tr key={c.id as number} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td className="py-2.5 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>
                    {c.name as string}
                  </td>
                  <td className="py-2.5 px-4 hidden md:table-cell text-xs font-mono" dir="ltr" style={{ color: 'var(--text-secondary)' }}>
                    {(c.meta_account_id as string) || '—'}
                  </td>
                  <td className="py-2.5 px-4 hidden md:table-cell text-xs font-mono" dir="ltr" style={{ color: 'var(--text-secondary)' }}>
                    {(c.google_customer_id as string) || '—'}
                  </td>
                  <td className="py-2.5 px-4 hidden md:table-cell text-xs font-mono" dir="ltr" style={{ color: 'var(--text-secondary)' }}>
                    {(c.ga4_property_id as string) || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
