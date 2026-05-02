'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Plus, RefreshCw, ChevronDown, Loader2, Pencil, Trash2, X, Check, AlertTriangle } from 'lucide-react';
import { useFacebookAccounts } from '@/hooks/clients-dashboard/use-facebook-accounts';
import { useGoogleAccounts } from '@/hooks/clients-dashboard/use-google-accounts';
import { toast } from 'sonner';

interface SessionResponse {
  authenticated: boolean;
  user?: { role: 'admin' | 'manager' | 'viewer' };
}

interface RawClientsResponse {
  clients: Record<string, unknown>[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ClientFormData {
  name: string;
  slug: string;
  metaAccountId: string;
  googleCustomerId: string;
  googleMccId: string;
  ga4PropertyId: string;
  metricType: 'leads' | 'ecommerce';
}

const emptyForm: ClientFormData = {
  name: '',
  slug: '',
  metaAccountId: '',
  googleCustomerId: '',
  googleMccId: '',
  ga4PropertyId: '',
  metricType: 'leads',
};

export const ClientManager = () => {
  const { data, mutate } = useSWR<RawClientsResponse>('/api/clients-dashboard/clients?raw=1', fetcher);
  const clients = data?.clients || [];

  const { data: sessionData } = useSWR<SessionResponse>('/api/auth/session', fetcher, {
    revalidateOnMount: true,
    revalidateOnFocus: true,
  });
  const isAdmin = sessionData?.user?.role === 'admin';

  const { accounts: fbAccounts, isLoading: fbLoading } = useFacebookAccounts();
  const { accounts: googleAccounts, mccId: googleMccId, isLoading: googleLoading } = useGoogleAccounts();

  const [showForm, setShowForm] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<ClientFormData>(emptyForm);

  const handleAdd = async () => {
    if (!form.name || !form.slug) {
      toast.error('שם ו-slug הם שדות חובה');
      return;
    }

    try {
      const res = await fetch('/api/clients-dashboard/clients', {
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
      setForm(emptyForm);
      mutate();
    } catch {
      toast.error('שגיאה ביצירת לקוח');
    }
  };

  const handleEdit = (client: Record<string, unknown>) => {
    setEditingId(client.id as number);
    setForm({
      name: (client.name as string) || '',
      slug: (client.slug as string) || '',
      metaAccountId: (client.meta_account_id as string) || '',
      googleCustomerId: (client.google_customer_id as string) || '',
      googleMccId: (client.google_mcc_id as string) || '',
      ga4PropertyId: (client.ga4_property_id as string) || '',
      metricType: ((client.metric_type as string) === 'ecommerce' ? 'ecommerce' : 'leads'),
    });
    setShowForm(false);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !form.name) {
      toast.error('שם הלקוח הוא שדה חובה');
      return;
    }

    try {
      const res = await fetch(`/api/clients-dashboard/clients/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'שגיאה בעדכון לקוח');
        return;
      }

      toast.success('לקוח עודכן בהצלחה');
      setEditingId(null);
      setForm(emptyForm);
      mutate();
    } catch {
      toast.error('שגיאה בעדכון לקוח');
    }
  };

  const handleDelete = async (clientId: number) => {
    try {
      const res = await fetch(`/api/clients-dashboard/clients/${clientId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'שגיאה במחיקת לקוח');
        return;
      }

      toast.success('לקוח נמחק בהצלחה');
      setDeletingId(null);
      mutate();
    } catch {
      toast.error('שגיאה במחיקת לקוח');
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/clients-dashboard/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        const errors = data.results?.flatMap(
          (r: { syncs: Array<{ status: string; error?: string; platform: string }> }) =>
            r.syncs.filter((s) => s.status === 'error').map((s) => `${s.platform}: ${s.error}`),
        ) || [];

        if (errors.length > 0) {
          toast.warning(`סנכרון הושלם עם ${errors.length} שגיאות`, {
            description: errors.join('\n'),
            duration: 8000,
          });
        } else {
          toast.success(`סנכרון הושלם: ${data.clients} לקוחות`);
        }
        mutate();
      } else {
        toast.error(data.error || 'שגיאה בסנכרון');
      }
    } catch {
      toast.error('שגיאה בסנכרון');
    } finally {
      setSyncing(false);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const selectStyle = {
    background: 'var(--glass-bg)',
    borderColor: 'var(--glass-border)',
    color: 'var(--text-primary)',
  };

  const usedMetaIds = new Set(
    clients.map((c) => c.meta_account_id as string).filter(Boolean),
  );
  const usedGoogleIds = new Set(
    clients.map((c) => c.google_customer_id as string).filter(Boolean),
  );

  const renderAccountFields = (isEdit = false) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>שם לקוח *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full text-sm px-3 py-2 rounded-lg border"
          style={selectStyle}
          placeholder="שם הלקוח"
        />
      </div>
      {!isEdit && (
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Slug *</label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className="w-full text-sm px-3 py-2 rounded-lg border"
            dir="ltr"
            style={selectStyle}
            placeholder="client-slug"
          />
        </div>
      )}

      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
          חשבון Meta
          {fbLoading && <Loader2 size={12} className="inline-block mr-1 animate-spin" />}
        </label>
        {fbAccounts.length > 0 ? (
          <div className="relative">
            <select
              value={form.metaAccountId}
              onChange={(e) => setForm({ ...form, metaAccountId: e.target.value })}
              className="w-full text-sm px-3 py-2 rounded-lg border appearance-none"
              dir="ltr"
              style={selectStyle}
            >
              <option value="">ללא חשבון Meta</option>
              {fbAccounts.map((acc) => (
                <option
                  key={acc.id}
                  value={acc.account_id}
                  disabled={usedMetaIds.has(acc.account_id) && acc.account_id !== form.metaAccountId}
                >
                  {acc.name} ({acc.account_id}) {acc.currency}
                  {usedMetaIds.has(acc.account_id) && acc.account_id !== form.metaAccountId ? ' ✓' : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        ) : (
          <input
            type="text"
            value={form.metaAccountId}
            onChange={(e) => setForm({ ...form, metaAccountId: e.target.value })}
            className="w-full text-sm px-3 py-2 rounded-lg border"
            dir="ltr"
            style={selectStyle}
            placeholder={fbLoading ? 'טוען חשבונות...' : 'act_123456789'}
          />
        )}
      </div>

      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
          חשבון Google Ads
          {googleLoading && <Loader2 size={12} className="inline-block mr-1 animate-spin" />}
        </label>
        {googleAccounts.length > 0 ? (
          <div className="relative">
            <select
              value={form.googleCustomerId}
              onChange={(e) => {
                setForm({
                  ...form,
                  googleCustomerId: e.target.value,
                  googleMccId: e.target.value ? googleMccId : '',
                });
              }}
              className="w-full text-sm px-3 py-2 rounded-lg border appearance-none"
              dir="ltr"
              style={selectStyle}
            >
              <option value="">ללא חשבון Google</option>
              {googleAccounts.map((acc) => (
                <option
                  key={acc.id}
                  value={acc.id}
                  disabled={usedGoogleIds.has(acc.id) && acc.id !== form.googleCustomerId}
                >
                  {acc.name} ({acc.id}) {acc.currency}
                  {usedGoogleIds.has(acc.id) && acc.id !== form.googleCustomerId ? ' ✓' : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        ) : (
          <input
            type="text"
            value={form.googleCustomerId}
            onChange={(e) => setForm({ ...form, googleCustomerId: e.target.value })}
            className="w-full text-sm px-3 py-2 rounded-lg border"
            dir="ltr"
            style={selectStyle}
            placeholder={googleLoading ? 'טוען חשבונות...' : '123-456-7890'}
          />
        )}
      </div>

      {googleAccounts.length === 0 && (
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Google MCC ID</label>
          <input
            type="text"
            value={form.googleMccId}
            onChange={(e) => setForm({ ...form, googleMccId: e.target.value })}
            className="w-full text-sm px-3 py-2 rounded-lg border"
            dir="ltr"
            style={selectStyle}
            placeholder="123-456-7890"
          />
        </div>
      )}

      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>GA4 Property ID</label>
        <input
          type="text"
          value={form.ga4PropertyId}
          onChange={(e) => setForm({ ...form, ga4PropertyId: e.target.value })}
          className="w-full text-sm px-3 py-2 rounded-lg border"
          dir="ltr"
          style={selectStyle}
          placeholder="123456789"
        />
      </div>

      <div className="md:col-span-2">
        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>סוג מטריקות *</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setForm({ ...form, metricType: 'leads' })}
            className="text-sm px-3 py-2 rounded-lg border transition-colors"
            style={{
              background: form.metricType === 'leads' ? 'var(--accent-subtle)' : 'var(--glass-bg)',
              borderColor: form.metricType === 'leads' ? 'var(--accent)' : 'var(--glass-border)',
              color: 'var(--text-primary)',
              fontWeight: form.metricType === 'leads' ? 600 : 400,
            }}
          >
            לידים
            <span className="block text-[11px] opacity-70 font-normal">הוצאה · לידים · CPL · CTR</span>
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, metricType: 'ecommerce' })}
            className="text-sm px-3 py-2 rounded-lg border transition-colors"
            style={{
              background: form.metricType === 'ecommerce' ? 'var(--accent-subtle)' : 'var(--glass-bg)',
              borderColor: form.metricType === 'ecommerce' ? 'var(--accent)' : 'var(--glass-border)',
              color: 'var(--text-primary)',
              fontWeight: form.metricType === 'ecommerce' ? 600 : 400,
            }}
          >
            איקומרס
            <span className="block text-[11px] opacity-70 font-normal">הוצאה · רכישות · הכנסות · ROAS</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {sessionData && !isAdmin && (
        <div
          className="flex items-start gap-2 rounded-lg p-3 text-xs"
          style={{ background: '#fef6e0', border: '1px solid #f5e4b0', color: '#b45309' }}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">נדרשת הרשאת אדמין</p>
            <p className="mt-0.5 opacity-80">
              המשתמש הנוכחי הוא {sessionData.user?.role}. יצירה, עריכה, מחיקה וסנכרון של לקוחות דורשים הרשאת admin.
              צא והיכנס מחדש כדי לרענן את ההרשאות.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setForm(emptyForm);
          }}
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

      {showForm && (
        <div className="glass-card rounded-xl p-5 space-y-4">
          <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>לקוח חדש</h4>
          {renderAccountFields(false)}
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg"
              style={{ background: 'var(--accent)', color: '#1a1a1a' }}
            >
              <Check size={14} />
              שמור
            </button>
            <button
              onClick={() => { setShowForm(false); setForm(emptyForm); }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border"
              style={{ borderColor: 'var(--glass-border)', color: 'var(--text-secondary)' }}
            >
              <X size={14} />
              ביטול
            </button>
          </div>
        </div>
      )}

      {editingId && (
        <div className="glass-card rounded-xl p-5 space-y-4" style={{ borderColor: 'var(--accent)', borderWidth: '1px' }}>
          <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            עריכת לקוח: {form.name}
          </h4>
          {renderAccountFields(true)}
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg"
              style={{ background: 'var(--accent)', color: '#1a1a1a' }}
            >
              <Check size={14} />
              שמור שינויים
            </button>
            <button
              onClick={cancelEdit}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border"
              style={{ borderColor: 'var(--glass-border)', color: 'var(--text-secondary)' }}
            >
              <X size={14} />
              ביטול
            </button>
          </div>
        </div>
      )}

      {clients.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <th className="text-right py-2.5 px-4 font-medium" style={{ color: 'var(--text-tertiary)' }}>לקוח</th>
                <th className="text-right py-2.5 px-4 font-medium hidden md:table-cell" style={{ color: 'var(--text-tertiary)' }}>Meta</th>
                <th className="text-right py-2.5 px-4 font-medium hidden md:table-cell" style={{ color: 'var(--text-tertiary)' }}>Google</th>
                <th className="text-right py-2.5 px-4 font-medium hidden md:table-cell" style={{ color: 'var(--text-tertiary)' }}>GA4</th>
                <th className="text-right py-2.5 px-4 font-medium w-24" style={{ color: 'var(--text-tertiary)' }}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const clientId = c.id as number;
                const metaName = fbAccounts.find((a) => a.account_id === c.meta_account_id)?.name;
                const googleName = googleAccounts.find((a) => a.id === c.google_customer_id)?.name;
                const isDeleting = deletingId === clientId;

                return (
                  <tr key={clientId} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td className="py-2.5 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>
                      {c.name as string}
                      <span className="block text-xs font-mono opacity-50" dir="ltr">{c.slug as string}</span>
                    </td>
                    <td className="py-2.5 px-4 hidden md:table-cell text-xs" dir="ltr" style={{ color: 'var(--text-secondary)' }}>
                      {metaName ? (
                        <span>{metaName} <span className="font-mono opacity-60">({c.meta_account_id as string})</span></span>
                      ) : (
                        <span className="font-mono">{(c.meta_account_id as string) || '—'}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 hidden md:table-cell text-xs" dir="ltr" style={{ color: 'var(--text-secondary)' }}>
                      {googleName ? (
                        <span>{googleName} <span className="font-mono opacity-60">({c.google_customer_id as string})</span></span>
                      ) : (
                        <span className="font-mono">{(c.google_customer_id as string) || '—'}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 hidden md:table-cell text-xs font-mono" dir="ltr" style={{ color: 'var(--text-secondary)' }}>
                      {(c.ga4_property_id as string) || '—'}
                    </td>
                    <td className="py-2.5 px-4">
                      {isDeleting ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(clientId)}
                            className="p-1.5 rounded-md transition-colors"
                            style={{ background: '#c0392b', color: '#fff' }}
                            title="אישור מחיקה"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="p-1.5 rounded-md border transition-colors"
                            style={{ borderColor: 'var(--glass-border)', color: 'var(--text-secondary)' }}
                            title="ביטול"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(c)}
                            className="p-1.5 rounded-md transition-colors hover:opacity-80"
                            style={{ color: 'var(--text-secondary)' }}
                            title="עריכה"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingId(clientId)}
                            className="p-1.5 rounded-md transition-colors hover:opacity-80"
                            style={{ color: '#c0392b' }}
                            title="מחיקה"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {clients.length === 0 && !showForm && (
        <div className="glass-card rounded-xl p-8 text-center" style={{ color: 'var(--text-tertiary)' }}>
          <p className="text-sm">אין לקוחות עדיין. לחץ על &quot;הוסף לקוח&quot; כדי להתחיל.</p>
        </div>
      )}
    </div>
  );
};
