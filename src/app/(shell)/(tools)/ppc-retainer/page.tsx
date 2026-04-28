'use client';

import './styles.css';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import {
  CircleDot,
  Users,
  UserCog,
  Receipt,
  TrendingUp,
  Search,
  Plus,
  Pencil,
  Archive,
  X,
  Cog,
  Database,
  Server,
  Lock,
  Cloud,
  Code2,
} from 'lucide-react';

// =====================================================
// Types
// =====================================================
type Manager = string;

type Client = {
  id: number;
  name: string;
  retainer: number;
  manager: Manager;
  platforms: string[];
  meta: number;
  google: number;
  status: 'active' | 'archived';
};

type TeamMember = {
  id: number;
  name: Manager;
  revenue: number;
  employerCost: number;
};

type Expense = {
  id: number;
  name: string;
  amount: number;
  note: string;
  category: string;
};

type ForecastState = {
  newMonthly: number;
  churnMonthly: number;
  raisePct: number;
};

type Tab = 'overview' | 'clients' | 'team' | 'expenses' | 'forecast' | 'system';

type DataPayload = {
  clients: Client[];
  team: TeamMember[];
  expenses: Expense[];
  forecast: ForecastState;
};

// =====================================================
// Constants
// =====================================================
const ALL_PLATFORMS = ['גוגל', 'מטא', 'טיקטוק', 'לינקדאין', 'IDX'];
const ALL_MANAGERS: Manager[] = ['עידן', 'שרון', 'בן', 'דן', 'דן/ישי'];
const EXPENSE_CATEGORIES = ['Tracking', 'Data', 'Productivity', 'AI', 'Creative', 'Office', 'Tools'];

const MANAGER_COLORS: Record<string, string> = {
  'עידן': '#FFD400',
  'שרון': '#2D5BFF',
  'בן': '#FF7A5A',
  'דן': '#1FA866',
  'דן/ישי': '#5B2A86',
};

const PLATFORM_DOT: Record<string, string> = {
  'גוגל': '#4285F4',
  'מטא': '#0866FF',
  'טיקטוק': '#111111',
  'לינקדאין': '#0A66C2',
  'IDX': '#5B2A86',
};

const DATA_KEY = '/api/ppc-retainer/data';

// =====================================================
// Helpers
// =====================================================
const fmt = (n: number) => '₪' + Math.round(n).toLocaleString('he-IL');

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

async function apiCall<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// =====================================================
// Atoms
// =====================================================
function ManagerAvatar({ name, size = 28 }: { name: string; size?: number }) {
  const color = MANAGER_COLORS[name] || '#6B6B6B';
  const initial = name?.[0] || '?';
  return (
    <span
      className="ppcr-avatar"
      style={{
        background: color,
        color: color === '#FFD400' ? '#111' : '#fff',
        width: size,
        height: size,
        fontSize: size * 0.45,
      }}
      title={name}
    >
      {initial}
    </span>
  );
}

function PlatformChip({ name }: { name: string }) {
  const dot = PLATFORM_DOT[name] || '#6B6B6B';
  return (
    <span className="ppcr-platform-chip">
      <span className="ppcr-platform-chip__dot" style={{ background: dot }} />
      {name}
    </span>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'pos' | 'neg';
}) {
  return (
    <div className={`ppcr-stat${tone ? ` ppcr-stat--${tone}` : ''}`}>
      <div className="ppcr-stat__label">{label}</div>
      <div className="ppcr-stat__value">{value}</div>
      {sub && <div className="ppcr-stat__sub">{sub}</div>}
    </div>
  );
}

// =====================================================
// Page
// =====================================================
export default function PpcRetainerPage() {
  const { data, error, isLoading, mutate } = useSWR<DataPayload>(DATA_KEY, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  });
  const { mutate: globalMutate } = useSWRConfig();

  const clients = data?.clients ?? [];
  const team = data?.team ?? [];
  const expenses = data?.expenses ?? [];
  const forecast = data?.forecast ?? { newMonthly: 0, churnMonthly: 0, raisePct: 0 };

  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [filterMgr, setFilterMgr] = useState<'all' | Manager>('all');
  const [filterPlat, setFilterPlat] = useState<'all' | string>('all');
  const [sortBy, setSortBy] = useState<
    'retainer-desc' | 'retainer-asc' | 'name' | 'manager' | 'campaigns' | 'efficiency'
  >('retainer-desc');
  const [editing, setEditing] = useState<Client | 'new' | null>(null);
  const [saving, setSaving] = useState(false);

  // Optimistic updater: applies a function to the cached data, fires the API
  // request in the background, and revalidates from server when it returns.
  const optimisticUpdate = useCallback(
    async (updater: (prev: DataPayload) => DataPayload, request: () => Promise<unknown>) => {
      if (!data) return;
      const optimistic = updater(data);
      try {
        await mutate(
          async () => {
            await request();
            return undefined; // force revalidate from server
          },
          {
            optimisticData: optimistic,
            rollbackOnError: true,
            populateCache: false,
            revalidate: true,
          },
        );
      } catch (err) {
        console.error('[ppc-retainer] mutation error:', err);
        alert('שגיאה בשמירה: ' + (err instanceof Error ? err.message : 'לא ידוע'));
      }
    },
    [data, mutate],
  );

  // ----- derived metrics -----
  const activeClients = useMemo(() => clients.filter((c) => c.status === 'active'), [clients]);

  const totalsByMgr = useMemo(() => {
    const m: Record<string, { count: number; retainer: number; campaigns: number }> = {};
    for (const c of activeClients) {
      m[c.manager] ||= { count: 0, retainer: 0, campaigns: 0 };
      m[c.manager].count += 1;
      m[c.manager].retainer += c.retainer;
      m[c.manager].campaigns += (c.meta || 0) + (c.google || 0);
    }
    return m;
  }, [activeClients]);

  const totalRetainer = activeClients.reduce((s, c) => s + c.retainer, 0);
  const totalEmployerCost = team.reduce((s, t) => s + t.employerCost, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const grossProfit = totalRetainer - totalEmployerCost;
  const netProfit = grossProfit - totalExpenses;
  const totalCampaigns = activeClients.reduce((s, c) => s + (c.meta || 0) + (c.google || 0), 0);
  const avgRetainer = totalRetainer / Math.max(1, activeClients.length);

  const projectedRetainer =
    totalRetainer * (1 + forecast.raisePct / 100) + forecast.newMonthly - forecast.churnMonthly;
  const projectedNet = projectedRetainer - totalEmployerCost - totalExpenses;

  const filteredClients = useMemo(() => {
    const arr = clients.filter(
      (c) =>
        (filterMgr === 'all' || c.manager === filterMgr) &&
        (filterPlat === 'all' || c.platforms.includes(filterPlat)) &&
        (!search || c.name.toLowerCase().includes(search.toLowerCase())),
    );
    const sorters: Record<typeof sortBy, (a: Client, b: Client) => number> = {
      'retainer-desc': (a, b) => b.retainer - a.retainer,
      'retainer-asc': (a, b) => a.retainer - b.retainer,
      name: (a, b) => a.name.localeCompare(b.name, 'he'),
      manager: (a, b) => a.manager.localeCompare(b.manager, 'he'),
      campaigns: (a, b) => (b.meta + b.google) - (a.meta + a.google),
      efficiency: (a, b) =>
        b.retainer / Math.max(1, b.meta + b.google) -
        a.retainer / Math.max(1, a.meta + a.google),
    };
    arr.sort(sorters[sortBy]);
    return arr;
  }, [clients, search, filterMgr, filterPlat, sortBy]);

  // ----- handlers -----
  const handleSaveClient = async (
    draft: Client | (Omit<Client, 'id' | 'status'> & { id?: number; status?: Client['status'] }),
  ) => {
    setSaving(true);
    try {
      if ('id' in draft && draft.id) {
        const id = draft.id;
        await optimisticUpdate(
          (prev) => ({
            ...prev,
            clients: prev.clients.map((c) => (c.id === id ? ({ ...c, ...draft } as Client) : c)),
          }),
          () =>
            apiCall(`/api/ppc-retainer/clients/${id}`, {
              method: 'PUT',
              body: JSON.stringify(draft),
            }),
        );
      } else {
        const tempId = -Date.now();
        const tempClient: Client = {
          id: tempId,
          name: draft.name,
          retainer: draft.retainer || 0,
          manager: draft.manager,
          platforms: draft.platforms ?? [],
          meta: draft.meta || 0,
          google: draft.google || 0,
          status: 'active',
        };
        await optimisticUpdate(
          (prev) => ({ ...prev, clients: [...prev.clients, tempClient] }),
          () =>
            apiCall('/api/ppc-retainer/clients', {
              method: 'POST',
              body: JSON.stringify(draft),
            }),
        );
      }
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClient = async (id: number) => {
    if (!confirm('להסיר את הלקוח לצמיתות?')) return;
    await optimisticUpdate(
      (prev) => ({ ...prev, clients: prev.clients.filter((c) => c.id !== id) }),
      () => apiCall(`/api/ppc-retainer/clients/${id}`, { method: 'DELETE' }),
    );
    setEditing(null);
  };

  const handleArchive = async (id: number) => {
    const client = clients.find((c) => c.id === id);
    if (!client) return;
    const newStatus = client.status === 'active' ? 'archived' : 'active';
    await optimisticUpdate(
      (prev) => ({
        ...prev,
        clients: prev.clients.map((c) => (c.id === id ? { ...c, status: newStatus } : c)),
      }),
      () =>
        apiCall(`/api/ppc-retainer/clients/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ status: newStatus }),
        }),
    );
  };

  const handleAddExpense = async (draft: { name: string; amount: number; note: string; category: string }) => {
    const tempId = -Date.now();
    await optimisticUpdate(
      (prev) => ({ ...prev, expenses: [...prev.expenses, { ...draft, id: tempId }] }),
      () =>
        apiCall('/api/ppc-retainer/expenses', {
          method: 'POST',
          body: JSON.stringify(draft),
        }),
    );
  };

  const handleDeleteExpense = async (id: number) => {
    await optimisticUpdate(
      (prev) => ({ ...prev, expenses: prev.expenses.filter((e) => e.id !== id) }),
      () => apiCall(`/api/ppc-retainer/expenses/${id}`, { method: 'DELETE' }),
    );
  };

  // Forecast: keep slider responsive with local state, debounce the PUT.
  const [localForecast, setLocalForecast] = useState<ForecastState>(forecast);
  const forecastInitialized = useRef(false);
  useEffect(() => {
    if (!forecastInitialized.current && data) {
      setLocalForecast(forecast);
      forecastInitialized.current = true;
    }
  }, [data, forecast]);

  const forecastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateForecast = (next: ForecastState) => {
    setLocalForecast(next);
    if (forecastTimer.current) clearTimeout(forecastTimer.current);
    forecastTimer.current = setTimeout(() => {
      apiCall('/api/ppc-retainer/forecast', {
        method: 'PUT',
        body: JSON.stringify(next),
      })
        .then(() => globalMutate(DATA_KEY))
        .catch((err) => console.error('[ppc-retainer] forecast PUT failed:', err));
    }, 350);
  };

  // ----- render -----
  const tabs: { id: Tab; label: string; icon: typeof CircleDot; badge?: number }[] = [
    { id: 'overview', label: 'סקירה', icon: CircleDot },
    { id: 'clients', label: 'לקוחות', icon: Users, badge: activeClients.length },
    { id: 'team', label: 'צוות', icon: UserCog, badge: team.length },
    { id: 'expenses', label: 'הוצאות קבועות', icon: Receipt },
    { id: 'forecast', label: 'תכנון עתיד', icon: TrendingUp },
    { id: 'system', label: 'מערכת', icon: Cog },
  ];

  if (error) {
    return (
      <div className="ppcr-root">
        <div className="ppcr-card" style={{ background: 'var(--danger-subtle)', borderColor: 'var(--danger)' }}>
          <h3 style={{ color: 'var(--danger-text)' }}>שגיאה בטעינת הנתונים</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {error instanceof Error ? error.message : 'נסה לרענן את הדף'}
          </p>
          <button className="ppcr-btn ppcr-btn--ghost" onClick={() => mutate()} style={{ marginTop: 12 }}>
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="ppcr-root">
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-tertiary)' }}>
          <div
            className="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
          />
          טוען נתוני ריטיינרים…
        </div>
      </div>
    );
  }

  return (
    <div className="ppcr-root">
      <div className="ppcr-tabs" role="tablist">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              className={`ppcr-tab${active ? ' ppcr-tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <Icon size={16} />
              <span>{t.label}</span>
              {t.badge != null && <span className="ppcr-tab__badge">{t.badge}</span>}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <button
          className="ppcr-btn ppcr-btn--yellow ppcr-btn--sm"
          style={{ marginInlineStart: 'auto' }}
          onClick={() => setEditing('new')}
        >
          <Plus size={14} />
          לקוח חדש
        </button>
      </div>

      {tab === 'overview' && (
        <Overview
          totalRetainer={totalRetainer}
          totalEmployerCost={totalEmployerCost}
          totalExpenses={totalExpenses}
          grossProfit={grossProfit}
          netProfit={netProfit}
          avgRetainer={avgRetainer}
          totalCampaigns={totalCampaigns}
          clients={activeClients}
          team={team}
          totalsByMgr={totalsByMgr}
          setTab={setTab}
        />
      )}

      {tab === 'clients' && (
        <Clients
          clients={filteredClients}
          allCount={clients.length}
          search={search}
          setSearch={setSearch}
          filterMgr={filterMgr}
          setFilterMgr={setFilterMgr}
          filterPlat={filterPlat}
          setFilterPlat={setFilterPlat}
          sortBy={sortBy}
          setSortBy={setSortBy}
          onEdit={(c) => setEditing(c)}
          onArchive={handleArchive}
          onAdd={() => setEditing('new')}
        />
      )}

      {tab === 'team' && <Team team={team} totalsByMgr={totalsByMgr} clients={activeClients} />}

      {tab === 'expenses' && (
        <Expenses
          expenses={expenses}
          onAdd={handleAddExpense}
          onDelete={handleDeleteExpense}
        />
      )}

      {tab === 'system' && (
        <System
          counts={{
            clients: clients.length,
            activeClients: activeClients.length,
            team: team.length,
            expenses: expenses.length,
          }}
        />
      )}

      {tab === 'forecast' && (
        <Forecast
          forecast={localForecast}
          setForecast={updateForecast}
          totalRetainer={totalRetainer}
          totalEmployerCost={totalEmployerCost}
          totalExpenses={totalExpenses}
          netProfit={netProfit}
          projectedRetainer={
            totalRetainer * (1 + localForecast.raisePct / 100) +
            localForecast.newMonthly -
            localForecast.churnMonthly
          }
          projectedNet={
            totalRetainer * (1 + localForecast.raisePct / 100) +
            localForecast.newMonthly -
            localForecast.churnMonthly -
            totalEmployerCost -
            totalExpenses
          }
        />
      )}

      {editing && (
        <ClientDrawer
          client={editing === 'new' ? null : editing}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={handleSaveClient}
          onDelete={handleDeleteClient}
        />
      )}

      {/* avoid lint warning that some derived values are unused on initial render */}
      {projectedRetainer === Number.NEGATIVE_INFINITY && projectedNet === Number.NEGATIVE_INFINITY ? null : null}
    </div>
  );
}

// =====================================================
// Overview
// =====================================================
function Overview({
  totalRetainer,
  totalEmployerCost,
  totalExpenses,
  grossProfit,
  netProfit,
  avgRetainer,
  totalCampaigns,
  clients,
  team,
  totalsByMgr,
  setTab,
}: {
  totalRetainer: number;
  totalEmployerCost: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  avgRetainer: number;
  totalCampaigns: number;
  clients: Client[];
  team: TeamMember[];
  totalsByMgr: Record<string, { count: number; retainer: number; campaigns: number }>;
  setTab: (t: Tab) => void;
}) {
  const margin = totalRetainer ? (netProfit / totalRetainer) * 100 : 0;
  const top5 = [...clients].sort((a, b) => b.retainer - a.retainer).slice(0, 5);
  const bottom5 = [...clients].sort((a, b) => a.retainer - b.retainer).slice(0, 5);
  const avgCampaigns = totalCampaigns / Math.max(1, clients.length);

  return (
    <div className="ppcr-view-overview">
      <div className="ppcr-hero-grid">
        <div className="ppcr-hero ppcr-hero--ink">
          <div className="ppcr-hero__eyebrow">הכנסות חודשיות</div>
          <div className="ppcr-hero__value">{fmt(totalRetainer)}</div>
          <div className="ppcr-hero__sub">
            {clients.length} ריטיינרים פעילים · ממוצע {fmt(avgRetainer)}
          </div>
          <div className="ppcr-hero__bars">
            {Object.entries(totalsByMgr).map(([m, d]) => (
              <div
                key={m}
                style={{
                  width: (d.retainer / Math.max(1, totalRetainer)) * 100 + '%',
                  background: MANAGER_COLORS[m] || '#888',
                  height: '100%',
                }}
                title={`${m}: ${fmt(d.retainer)}`}
              />
            ))}
          </div>
          <div className="ppcr-hero__legend">
            {Object.entries(totalsByMgr).map(([m, d]) => (
              <span key={m} className="ppcr-legend-item">
                <span
                  className="ppcr-legend-dot"
                  style={{ background: MANAGER_COLORS[m] || '#888' }}
                />
                {m}
                <span className="ppcr-legend-val ppcr-mono">{fmt(d.retainer)}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="ppcr-hero ppcr-hero--yellow">
          <div className="ppcr-hero__eyebrow">רווח נטו (חודשי)</div>
          <div className="ppcr-hero__value">{fmt(netProfit)}</div>
          <div className="ppcr-hero__sub">
            שולי רווח {margin.toFixed(1)}% · אחרי שכר ועלויות
          </div>
          <div className="ppcr-flow">
            <div className="ppcr-flow__row">
              <span>הכנסות</span>
              <span className="ppcr-mono">{fmt(totalRetainer)}</span>
            </div>
            <div className="ppcr-flow__row ppcr-flow__row--minus">
              <span>− עלות צוות</span>
              <span className="ppcr-mono">{fmt(totalEmployerCost)}</span>
            </div>
            <div className="ppcr-flow__row ppcr-flow__row--minus">
              <span>− הוצאות קבועות</span>
              <span className="ppcr-mono">{fmt(totalExpenses)}</span>
            </div>
            <div className="ppcr-flow__row ppcr-flow__row--total">
              <span>= נטו</span>
              <span className="ppcr-mono">{fmt(netProfit)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="ppcr-kpi-row">
        <Stat
          label="קמפיינים פעילים"
          value={totalCampaigns}
          sub={`${avgCampaigns.toFixed(1)} בממוצע ללקוח`}
        />
        <Stat
          label="עלות צוות"
          value={fmt(totalEmployerCost)}
          sub={`${team.length} אנשי צוות`}
        />
        <Stat
          label="הוצאות תפעול"
          value={fmt(totalExpenses)}
          sub="מנויים, אדמיניסטרציה, סטודיו"
        />
        <Stat
          label="רווח גולמי"
          value={fmt(grossProfit)}
          sub="לפני הוצאות קבועות"
          tone={grossProfit > 0 ? 'pos' : 'neg'}
        />
      </div>

      <div className="ppcr-split">
        <div className="ppcr-card">
          <div className="ppcr-card__header">
            <h3>חמשת הלקוחות הגדולים</h3>
            <button className="ppcr-btn--link" onClick={() => setTab('clients')}>
              לכל הלקוחות ←
            </button>
          </div>
          <ul className="ppcr-rank">
            {top5.map((c, i) => (
              <li key={c.id} className="ppcr-rank-row">
                <span className="ppcr-rank-num">{i + 1}</span>
                <span className="ppcr-rank-name">{c.name}</span>
                <ManagerAvatar name={c.manager} size={22} />
                <span className="ppcr-rank-bar">
                  <span
                    className="ppcr-rank-bar__fill"
                    style={{ width: (c.retainer / Math.max(1, top5[0].retainer)) * 100 + '%' }}
                  />
                </span>
                <span className="ppcr-rank-val ppcr-mono">{fmt(c.retainer)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="ppcr-card">
          <div className="ppcr-card__header">
            <h3>צריך לבדוק — ריטיינר נמוך</h3>
            <span className="ppcr-card__hint">מועמדים לעדכון מחיר</span>
          </div>
          <ul className="ppcr-rank">
            {bottom5.map((c) => (
              <li key={c.id} className="ppcr-rank-row">
                <span className="ppcr-rank-num ppcr-rank-num--alt">↓</span>
                <span className="ppcr-rank-name">{c.name}</span>
                <ManagerAvatar name={c.manager} size={22} />
                <span className="ppcr-rank-meta">{c.meta + c.google} קמפיינים</span>
                <span className="ppcr-rank-val ppcr-mono">{fmt(c.retainer)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="ppcr-card">
        <div className="ppcr-card__header">
          <h3>חלוקת תיק לפי מנהל לקוח</h3>
          <span className="ppcr-card__hint">
            {clients.length} לקוחות · {team.length} אנשי צוות
          </span>
        </div>
        <div className="ppcr-mgr-grid">
          {Object.entries(totalsByMgr).map(([m, d]) => {
            const t = team.find((x) => x.name === m);
            const revenue = t?.revenue ?? d.retainer;
            const employerCost = t?.employerCost ?? 0;
            const profit = revenue - employerCost;
            return (
              <div key={m} className="ppcr-mgr-tile">
                <div className="ppcr-mgr-tile__head">
                  <ManagerAvatar name={m} size={36} />
                  <div>
                    <div className="ppcr-mgr-tile__name">{m}</div>
                    <div className="ppcr-mgr-tile__sub">
                      {d.count} לקוחות · {d.campaigns} קמפיינים
                    </div>
                  </div>
                </div>
                <div className="ppcr-mgr-tile__row">
                  <span>הכנסות</span>
                  <span className="ppcr-mono">{fmt(revenue)}</span>
                </div>
                <div className="ppcr-mgr-tile__row">
                  <span>עלות מעביד</span>
                  <span className="ppcr-mono">{fmt(employerCost)}</span>
                </div>
                <div
                  className={`ppcr-mgr-tile__row ppcr-mgr-tile__row--total ${
                    profit >= 0 ? 'ppcr-pos' : 'ppcr-neg'
                  }`}
                >
                  <span>רווח</span>
                  <span className="ppcr-mono">{(profit >= 0 ? '+' : '') + fmt(profit)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// Clients
// =====================================================
function Clients({
  clients,
  allCount,
  search,
  setSearch,
  filterMgr,
  setFilterMgr,
  filterPlat,
  setFilterPlat,
  sortBy,
  setSortBy,
  onEdit,
  onArchive,
  onAdd,
}: {
  clients: Client[];
  allCount: number;
  search: string;
  setSearch: (s: string) => void;
  filterMgr: 'all' | Manager;
  setFilterMgr: (m: 'all' | Manager) => void;
  filterPlat: 'all' | string;
  setFilterPlat: (p: 'all' | string) => void;
  sortBy: 'retainer-desc' | 'retainer-asc' | 'name' | 'manager' | 'campaigns' | 'efficiency';
  setSortBy: (s: 'retainer-desc' | 'retainer-asc' | 'name' | 'manager' | 'campaigns' | 'efficiency') => void;
  onEdit: (c: Client) => void;
  onArchive: (id: number) => void;
  onAdd: () => void;
}) {
  return (
    <div>
      <div className="ppcr-filters">
        <div className="ppcr-filters__search">
          <Search className="ppcr-search-icon" size={16} />
          <input
            className="ppcr-input ppcr-search-input"
            placeholder="חיפוש לקוח…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="ppcr-filters__row">
          <button
            className={`ppcr-pill${filterMgr === 'all' ? ' ppcr-pill--active' : ''}`}
            onClick={() => setFilterMgr('all')}
          >
            כל הצוות
          </button>
          {ALL_MANAGERS.map((m) => (
            <button
              key={m}
              className={`ppcr-pill${filterMgr === m ? ' ppcr-pill--active' : ''}`}
              onClick={() => setFilterMgr(m)}
              style={
                filterMgr === m
                  ? {
                      background: MANAGER_COLORS[m],
                      borderColor: MANAGER_COLORS[m],
                      color: MANAGER_COLORS[m] === '#FFD400' ? '#111' : '#fff',
                    }
                  : undefined
              }
            >
              {m}
            </button>
          ))}
        </div>
        <div className="ppcr-filters__row">
          <button
            className={`ppcr-pill${filterPlat === 'all' ? ' ppcr-pill--active' : ''}`}
            onClick={() => setFilterPlat('all')}
          >
            כל הפלטפורמות
          </button>
          {ALL_PLATFORMS.map((p) => (
            <button
              key={p}
              className={`ppcr-pill${filterPlat === p ? ' ppcr-pill--active' : ''}`}
              onClick={() => setFilterPlat(p)}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="ppcr-filters__row" style={{ alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>מיון</label>
          <select
            className="ppcr-select ppcr-select--sm"
            style={{ width: 'auto' }}
            value={sortBy}
            onChange={(e) =>
              setSortBy(
                e.target.value as
                  | 'retainer-desc'
                  | 'retainer-asc'
                  | 'name'
                  | 'manager'
                  | 'campaigns'
                  | 'efficiency',
              )
            }
          >
            <option value="retainer-desc">ריטיינר — גבוה לנמוך</option>
            <option value="retainer-asc">ריטיינר — נמוך לגבוה</option>
            <option value="name">שם לקוח</option>
            <option value="manager">מנהל לקוח</option>
            <option value="campaigns">מס׳ קמפיינים</option>
            <option value="efficiency">ריטיינר לקמפיין</option>
          </select>
        </div>
      </div>

      <div className="ppcr-meta">
        <span>
          {clients.length} מתוך {allCount} לקוחות
        </span>
        <button className="ppcr-btn ppcr-btn--yellow ppcr-btn--sm" onClick={onAdd}>
          <Plus size={14} />
          לקוח חדש
        </button>
      </div>

      <div className="ppcr-card ppcr-card--flush">
        <table className="ppcr-table">
          <thead>
            <tr>
              <th>לקוח</th>
              <th>מנהל</th>
              <th>פלטפורמות</th>
              <th>קמפיינים</th>
              <th>ריטיינר</th>
              <th>פר קמפיין</th>
              <th aria-label="actions"></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => {
              const totalCamp = c.meta + c.google;
              const perCamp = c.retainer / Math.max(1, totalCamp);
              return (
                <tr key={c.id} onClick={() => onEdit(c)}>
                  <td>
                    <div className="ppcr-td-name__main">{c.name}</div>
                    <div className="ppcr-td-name__sub">#{String(c.id).padStart(3, '0')}</div>
                  </td>
                  <td>
                    <span className="ppcr-mgr-cell">
                      <ManagerAvatar name={c.manager} size={22} /> {c.manager}
                    </span>
                  </td>
                  <td>
                    <div className="ppcr-platform-stack">
                      {c.platforms.map((p) => (
                        <PlatformChip key={p} name={p} />
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="ppcr-camp-cell">
                      <span className="ppcr-camp-pill" title="מטא">
                        {c.meta}
                      </span>
                      <span className="ppcr-camp-sep">·</span>
                      <span className="ppcr-camp-pill" title="גוגל">
                        {c.google}
                      </span>
                      <span className="ppcr-camp-total">סה״כ {totalCamp}</span>
                    </div>
                  </td>
                  <td className="ppcr-mono ppcr-retainer-cell">{fmt(c.retainer)}</td>
                  <td className="ppcr-mono ppcr-per-cell">{fmt(perCamp)}</td>
                  <td className="ppcr-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="ppcr-icon-btn"
                      onClick={() => onEdit(c)}
                      title="עריכה"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="ppcr-icon-btn"
                      onClick={() => onArchive(c.id)}
                      title={c.status === 'active' ? 'העברה לארכיון' : 'הפעלה מחדש'}
                    >
                      <Archive size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {clients.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)' }}>
                  אין לקוחות תואמים לסינון
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =====================================================
// Team
// =====================================================
function Team({
  team,
  totalsByMgr,
  clients,
}: {
  team: TeamMember[];
  totalsByMgr: Record<string, { count: number; retainer: number; campaigns: number }>;
  clients: Client[];
}) {
  return (
    <div>
      <h2 className="ppcr-view__title">הצוות שלנו</h2>
      <p className="ppcr-view__lede">
        ניהול תיק הלקוחות לפי מנהל. כל אחד מהצוות אחראי על לקוחות, פלטפורמות וקמפיינים — וזה מה שזה
        אומר במספרים.
      </p>
      <div className="ppcr-team-grid">
        {team.map((t) => {
          const m = totalsByMgr[t.name] || { count: 0, retainer: 0, campaigns: 0 };
          const profit = t.revenue - t.employerCost;
          const margin = t.revenue ? (profit / t.revenue) * 100 : 0;
          const myClients = clients
            .filter((c) => c.manager === t.name)
            .sort((a, b) => b.retainer - a.retainer);
          return (
            <div key={t.id} className="ppcr-team-card">
              <div className="ppcr-team-card__head">
                <ManagerAvatar name={t.name} size={56} />
                <div>
                  <div className="ppcr-team-card__name">{t.name}</div>
                  <div className="ppcr-team-card__role">מנהל לקוח · PPC</div>
                </div>
              </div>
              <div className="ppcr-team-metrics">
                <div className="ppcr-team-metric">
                  <div className="ppcr-team-metric__label">הכנסות</div>
                  <div className="ppcr-team-metric__value ppcr-mono">{fmt(t.revenue)}</div>
                </div>
                <div className="ppcr-team-metric">
                  <div className="ppcr-team-metric__label">עלות מעביד</div>
                  <div className="ppcr-team-metric__value ppcr-mono">{fmt(t.employerCost)}</div>
                </div>
                <div
                  className={`ppcr-team-metric ${profit >= 0 ? 'ppcr-team-metric--pos' : 'ppcr-team-metric--neg'}`}
                >
                  <div className="ppcr-team-metric__label">
                    רווח · {margin.toFixed(0)}%
                  </div>
                  <div
                    className={`ppcr-team-metric__value ppcr-mono ${profit >= 0 ? 'ppcr-pos' : 'ppcr-neg'}`}
                  >
                    {(profit >= 0 ? '+' : '') + fmt(profit)}
                  </div>
                </div>
              </div>
              <div className="ppcr-team-clients">
                <div className="ppcr-team-clients__head">
                  {m.count} לקוחות · {m.campaigns} קמפיינים
                </div>
                <ul>
                  {myClients.map((c) => (
                    <li key={c.id}>
                      <span>{c.name}</span>
                      <span className="ppcr-mono">{fmt(c.retainer)}</span>
                    </li>
                  ))}
                  {myClients.length === 0 && (
                    <li style={{ color: 'var(--text-tertiary)' }}>
                      <span>אין לקוחות פעילים</span>
                      <span />
                    </li>
                  )}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =====================================================
// Expenses
// =====================================================
function Expenses({
  expenses,
  onAdd,
  onDelete,
}: {
  expenses: Expense[];
  onAdd: (draft: { name: string; amount: number; note: string; category: string }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{ name: string; amount: string; note: string; category: string }>({
    name: '',
    amount: '',
    note: '',
    category: 'Tools',
  });

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  const submitAdd = async () => {
    if (!draft.name || !draft.amount) return;
    await onAdd({
      name: draft.name,
      amount: parseFloat(draft.amount) || 0,
      note: draft.note,
      category: draft.category,
    });
    setDraft({ name: '', amount: '', note: '', category: 'Tools' });
    setAdding(false);
  };

  return (
    <div>
      <div className="ppcr-expenses-head">
        <div>
          <h2 className="ppcr-view__title">הוצאות חודשיות קבועות</h2>
          <p className="ppcr-view__lede">
            מנויים, כלים, אדמיניסטרציה — כל מה שיורד מהרווח כל חודש, ללא קשר ללקוחות.
          </p>
        </div>
        <div className="ppcr-expenses-total">
          <div className="ppcr-expenses-total__label">סה״כ חודשי</div>
          <div className="ppcr-expenses-total__value">{fmt(total)}</div>
        </div>
      </div>

      <div className="ppcr-cat-strip">
        {Object.entries(byCategory)
          .sort((a, b) => b[1] - a[1])
          .map(([cat, sum]) => (
            <div key={cat} className="ppcr-cat-tile">
              <div className="ppcr-cat-tile__name">{cat}</div>
              <div className="ppcr-cat-tile__value">{fmt(sum)}</div>
              <div className="ppcr-cat-tile__bar">
                <span style={{ width: (sum / Math.max(1, total)) * 100 + '%' }} />
              </div>
            </div>
          ))}
      </div>

      <div className="ppcr-card ppcr-card--flush">
        <table className="ppcr-table">
          <thead>
            <tr>
              <th>ספק / שירות</th>
              <th>קטגוריה</th>
              <th>סכום</th>
              <th>הערות</th>
              <th aria-label="actions"></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} style={{ cursor: 'default' }}>
                <td>
                  <div className="ppcr-td-name__main">{e.name}</div>
                </td>
                <td>
                  <span className="ppcr-badge-soft">{e.category}</span>
                </td>
                <td className="ppcr-mono ppcr-retainer-cell">{fmt(e.amount)}</td>
                <td style={{ color: 'var(--text-tertiary)' }}>{e.note || '—'}</td>
                <td className="ppcr-actions">
                  <button
                    className="ppcr-icon-btn"
                    onClick={() => onDelete(e.id)}
                    title="מחיקה"
                  >
                    <X size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {adding && (
              <tr className="ppcr-adding-row" style={{ cursor: 'default' }}>
                <td>
                  <input
                    className="ppcr-input ppcr-input--sm"
                    placeholder="ספק"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </td>
                <td>
                  <select
                    className="ppcr-select ppcr-select--sm"
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    className="ppcr-input ppcr-input--sm ppcr-mono"
                    type="number"
                    placeholder="0"
                    value={draft.amount}
                    onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className="ppcr-input ppcr-input--sm"
                    placeholder="הערה"
                    value={draft.note}
                    onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                  />
                </td>
                <td className="ppcr-actions">
                  <button className="ppcr-btn ppcr-btn--yellow ppcr-btn--xs" onClick={submitAdd}>
                    שמור
                  </button>
                  <button
                    className="ppcr-btn ppcr-btn--ghost ppcr-btn--xs"
                    onClick={() => setAdding(false)}
                  >
                    בטל
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!adding && (
        <button
          className="ppcr-btn ppcr-btn--ghost"
          style={{ marginTop: 14 }}
          onClick={() => setAdding(true)}
        >
          <Plus size={14} />
          הוצאה חדשה
        </button>
      )}
    </div>
  );
}

// =====================================================
// Forecast
// =====================================================
function Forecast({
  forecast,
  setForecast,
  totalRetainer,
  totalEmployerCost,
  totalExpenses,
  netProfit,
  projectedRetainer,
  projectedNet,
}: {
  forecast: ForecastState;
  setForecast: (f: ForecastState) => void;
  totalRetainer: number;
  totalEmployerCost: number;
  totalExpenses: number;
  netProfit: number;
  projectedRetainer: number;
  projectedNet: number;
}) {
  const delta = projectedNet - netProfit;
  const months = Array.from({ length: 12 }, (_, i) => i);
  const projection = months.map((m) => {
    const ramp = m === 0 ? 0 : m === 1 ? 0.5 : 1;
    const rev =
      totalRetainer * (1 + (forecast.raisePct / 100) * (m / 12)) +
      (forecast.newMonthly - forecast.churnMonthly) * ramp;
    const profit = rev - totalEmployerCost - totalExpenses;
    return { m, rev, profit };
  });
  const maxRev = Math.max(...projection.map((p) => p.rev), totalRetainer, 1);
  const revDelta = projectedRetainer - totalRetainer;

  return (
    <div>
      <h2 className="ppcr-view__title">תכנון 12 החודשים הקרובים</h2>
      <p className="ppcr-view__lede">
        משחקי &quot;מה אם&quot;: הוסיפו ריטיינרים חדשים, הניחו נטישה, העלו מחירים — וראו מיד איך זה
        משפיע על הרווח.
      </p>

      <div className="ppcr-forecast-grid">
        <div className="ppcr-card">
          <div className="ppcr-card__header">
            <h3>תרחיש</h3>
            <button
              className="ppcr-btn--link"
              onClick={() => setForecast({ newMonthly: 0, churnMonthly: 0, raisePct: 0 })}
            >
              איפוס
            </button>
          </div>
          <ForecastSlider
            label="ריטיינרים חדשים בחודש"
            sub="התחייבות חודשית מצטברת מלקוחות חדשים"
            value={forecast.newMonthly}
            max={20000}
            step={500}
            onChange={(v) => setForecast({ ...forecast, newMonthly: v })}
            format={(v) => fmt(v)}
            color="#16a34a"
          />
          <ForecastSlider
            label="נטישה צפויה"
            sub="ריטיינרים שלא יחודשו"
            value={forecast.churnMonthly}
            max={15000}
            step={500}
            onChange={(v) => setForecast({ ...forecast, churnMonthly: v })}
            format={(v) => fmt(v)}
            color="#dc2626"
          />
          <ForecastSlider
            label="העלאת מחירים שנתית"
            sub="עליה הדרגתית על פני 12 חודשים"
            value={forecast.raisePct}
            max={30}
            step={1}
            onChange={(v) => setForecast({ ...forecast, raisePct: v })}
            format={(v) => v + '%'}
            color="#FFD400"
          />
        </div>

        <div>
          <div className="ppcr-forecast-cards">
            <div className="ppcr-card ppcr-forecast-summary">
              <div className="ppcr-forecast-summary__row">
                <span>הכנסות היום</span>
                <span className="ppcr-mono">{fmt(totalRetainer)}</span>
              </div>
              <div className="ppcr-forecast-summary__row">
                <span>הכנסות צפויות</span>
                <span className="ppcr-mono">{fmt(projectedRetainer)}</span>
              </div>
              <div className="ppcr-forecast-summary__row ppcr-forecast-summary__row--total">
                <span>שינוי בהכנסות</span>
                <span className={`ppcr-mono ${revDelta >= 0 ? 'ppcr-pos' : 'ppcr-neg'}`}>
                  {(revDelta >= 0 ? '+' : '') + fmt(revDelta)}
                </span>
              </div>
            </div>
            <div className="ppcr-card ppcr-forecast-summary ppcr-forecast-summary--bold">
              <div className="ppcr-forecast-summary__row">
                <span>רווח נטו היום</span>
                <span className="ppcr-mono">{fmt(netProfit)}</span>
              </div>
              <div className="ppcr-forecast-summary__row">
                <span>רווח נטו צפוי</span>
                <span className="ppcr-mono">{fmt(projectedNet)}</span>
              </div>
              <div className="ppcr-forecast-summary__row ppcr-forecast-summary__row--total">
                <span>השינוי</span>
                <span
                  className="ppcr-mono"
                  style={{ color: delta >= 0 ? '#86efac' : '#fca5a5' }}
                >
                  {(delta >= 0 ? '+' : '') + fmt(delta)}
                </span>
              </div>
            </div>
          </div>

          <div className="ppcr-card ppcr-forecast-chart">
            <div className="ppcr-card__header">
              <h3>תחזית 12 חודשים</h3>
              <span className="ppcr-card__hint">הכנסות חודשיות (מצטבר אחרי תרחיש)</span>
            </div>
            <div className="ppcr-chart">
              {projection.map((p, i) => (
                <div key={i} className="ppcr-chart-bar">
                  <div
                    className="ppcr-chart-bar__fill"
                    style={{ height: (p.rev / maxRev) * 100 + '%' }}
                    title={fmt(p.rev)}
                  />
                  <div
                    className="ppcr-chart-bar__profit"
                    style={{ height: Math.max(0, (p.profit / maxRev) * 100) + '%' }}
                  />
                  <div className="ppcr-chart-bar__label">+{i}חוד׳</div>
                </div>
              ))}
            </div>
            <div className="ppcr-chart-legend">
              <span>
                <span className="ppcr-chart-legend__dot" style={{ background: '#FFD400' }} />
                הכנסות
              </span>
              <span>
                <span className="ppcr-chart-legend__dot" style={{ background: '#111' }} />
                רווח נטו
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// System (read-only stack info)
// =====================================================
function System({
  counts,
}: {
  counts: { clients: number; activeClients: number; team: number; expenses: number };
}) {
  return (
    <div>
      <h2 className="ppcr-view__title">מערכת ותשתית</h2>
      <p className="ppcr-view__lede">
        סקירת ה-stack של הכלי, מקורות הדאטה, מבנה ה-DB וה-API endpoints. תצוגה בלבד — לא ניתן
        לערוך מכאן.
      </p>

      <div className="ppcr-sys-grid">
        <SysCard icon={<Code2 size={18} />} title="Frontend">
          <SysRow k="Framework" v="Next.js 16.2 (App Router · Turbopack)" />
          <SysRow k="Runtime" v="React 19" />
          <SysRow k="Styling" v="Tailwind CSS v4 + scoped styles.css" />
          <SysRow k="Data fetching" v="SWR (revalidate-on-focus, optimistic updates)" />
          <SysRow k="Icons" v="lucide-react" />
          <SysRow k="Page" v={<code>src/app/(shell)/(tools)/ppc-retainer/page.tsx</code>} />
        </SysCard>

        <SysCard icon={<Database size={18} />} title="Database">
          <SysRow k="Provider" v="Turso (libSQL · serverless SQLite)" />
          <SysRow k="Client" v="@libsql/client (raw SQL, no ORM)" />
          <SysRow k="Init" v={<code>src/lib/db/init.ts</code>} />
          <SysRow k="Connection" v={<code>src/lib/db/turso.ts (INIT_VERSION = 4)</code>} />
          <SysRow k="Tables" v={`pr_clients · pr_team · pr_expenses · pr_forecast`} />
        </SysCard>

        <SysCard icon={<Server size={18} />} title="API">
          <SysRow k="GET" v={<code>/api/ppc-retainer/data</code>} hint="כל הנתונים בקריאה אחת" />
          <SysRow k="POST" v={<code>/api/ppc-retainer/clients</code>} hint="יצירת לקוח" />
          <SysRow k="PUT/DELETE" v={<code>/api/ppc-retainer/clients/[id]</code>} hint="עדכון / מחיקה / ארכיון" />
          <SysRow k="POST" v={<code>/api/ppc-retainer/expenses</code>} hint="הוצאה חדשה" />
          <SysRow k="PUT/DELETE" v={<code>/api/ppc-retainer/expenses/[id]</code>} />
          <SysRow k="PUT" v={<code>/api/ppc-retainer/team/[id]</code>} hint="הכנסות / עלות מעביד" />
          <SysRow k="PUT" v={<code>/api/ppc-retainer/forecast</code>} hint="upsert של תרחיש (debounced 350ms)" />
        </SysCard>

        <SysCard icon={<Lock size={18} />} title="Authentication">
          <SysRow k="Sessions" v="iron-session (encrypted cookies)" />
          <SysRow k="Login" v="Google OAuth 2.0" />
          <SysRow k="Auth check" v={<code>requirePpcAuth()</code>} hint="בכל route — מחזיר 401 ללא session" />
          <SysRow k="Tool slug" v={<code>ppc-retainer</code>} hint="admin אוטומטית · אחרים דורשים הרשאה" />
        </SysCard>

        <SysCard icon={<Cloud size={18} />} title="Hosting & Deploy">
          <SysRow k="Platform" v="Vercel (Edge functions · serverless)" />
          <SysRow k="CI/CD" v="git push origin main → auto deploy" />
          <SysRow k="Repo" v="github.com/idanallush/brightsuite" />
          <SysRow k="Env vars" v="TURSO_DATABASE_URL · TURSO_AUTH_TOKEN · GOOGLE_CLIENT_ID/SECRET · SESSION_PASSWORD" />
        </SysCard>

        <SysCard icon={<CircleDot size={18} />} title="Data Snapshot">
          <SysRow k="לקוחות במערכת" v={`${counts.clients} (${counts.activeClients} פעילים)`} />
          <SysRow k="אנשי צוות" v={String(counts.team)} />
          <SysRow k="הוצאות קבועות" v={String(counts.expenses)} />
          <SysRow k="Seed initial" v="22 לקוחות · 4 צוות · 17 הוצאות (חד פעמי על DB ריק)" />
        </SysCard>
      </div>

      <div className="ppcr-card" style={{ marginTop: 18 }}>
        <div className="ppcr-card__header">
          <h3>סכמת בסיס הנתונים</h3>
          <span className="ppcr-card__hint">SQLite · prefix pr_</span>
        </div>
        <pre className="ppcr-sys-schema">
{`pr_clients (
  id            INTEGER PK AUTOINCREMENT
  name          TEXT
  retainer      REAL
  manager       TEXT
  platforms     TEXT (JSON array)
  meta          INTEGER
  google        INTEGER
  status        TEXT  -- 'active' | 'archived'
  created_at    TEXT
  updated_at    TEXT
)

pr_team (
  id            INTEGER PK AUTOINCREMENT
  name          TEXT UNIQUE
  revenue       REAL
  employer_cost REAL
  sort_order    INTEGER
)

pr_expenses (
  id            INTEGER PK AUTOINCREMENT
  name          TEXT
  amount        REAL
  note          TEXT
  category      TEXT
)

pr_forecast (
  id            INTEGER PK CHECK (id = 1)  -- singleton
  new_monthly   REAL
  churn_monthly REAL
  raise_pct     REAL
  updated_at    TEXT
)`}
        </pre>
      </div>
    </div>
  );
}

function SysCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ppcr-card ppcr-sys-card">
      <div className="ppcr-sys-card__head">
        <span className="ppcr-sys-card__icon">{icon}</span>
        <h3>{title}</h3>
      </div>
      <div className="ppcr-sys-card__body">{children}</div>
    </div>
  );
}

function SysRow({
  k,
  v,
  hint,
}: {
  k: string;
  v: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="ppcr-sys-row">
      <div className="ppcr-sys-row__k">{k}</div>
      <div className="ppcr-sys-row__v">
        {v}
        {hint && <div className="ppcr-sys-row__hint">{hint}</div>}
      </div>
    </div>
  );
}

function ForecastSlider({
  label,
  sub,
  value,
  max,
  step,
  onChange,
  format,
  color,
}: {
  label: string;
  sub?: string;
  value: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  color: string;
}) {
  return (
    <div className="ppcr-forecast-slider">
      <div className="ppcr-forecast-slider__head">
        <div>
          <div className="ppcr-forecast-slider__label">{label}</div>
          {sub && <div className="ppcr-forecast-slider__sub">{sub}</div>}
        </div>
        <div className="ppcr-forecast-slider__value ppcr-mono" style={{ color }}>
          {format(value)}
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ accentColor: color }}
      />
    </div>
  );
}

// =====================================================
// Drawer
// =====================================================
function ClientDrawer({
  client,
  saving,
  onClose,
  onSave,
  onDelete,
}: {
  client: Client | null;
  saving: boolean;
  onClose: () => void;
  onSave: (
    data:
      | Client
      | (Omit<Client, 'id' | 'status'> & { id?: number; status?: Client['status'] }),
  ) => void | Promise<void>;
  onDelete: (id: number) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<Client | (Omit<Client, 'id' | 'status'> & { id?: number })>(
    client ?? {
      name: '',
      retainer: 0,
      manager: 'עידן',
      platforms: [],
      meta: 0,
      google: 0,
    },
  );

  const togglePlatform = (p: string) => {
    setDraft((d) => ({
      ...d,
      platforms: d.platforms.includes(p) ? d.platforms.filter((x) => x !== p) : [...d.platforms, p],
    }));
  };

  const totalCamp = (draft.meta || 0) + (draft.google || 0);
  const perCamp = (draft.retainer || 0) / Math.max(1, totalCamp);

  return (
    <>
      <div className="ppcr-scrim" onClick={onClose} />
      <aside className="ppcr-drawer" role="dialog" aria-modal="true">
        <div className="ppcr-drawer__head">
          <h3>{client ? 'עריכת ריטיינר' : 'ריטיינר חדש'}</h3>
          <button className="ppcr-icon-btn ppcr-icon-btn--lg" onClick={onClose} aria-label="סגור">
            <X size={18} />
          </button>
        </div>
        <div className="ppcr-drawer__body">
          <div className="ppcr-field">
            <label>שם הלקוח</label>
            <input
              className="ppcr-input"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="למשל: שמרת הזורע"
            />
          </div>
          <div className="ppcr-field-row">
            <div className="ppcr-field">
              <label>סכום ריטיינר חודשי (₪)</label>
              <input
                className="ppcr-input ppcr-mono"
                type="number"
                value={draft.retainer}
                onChange={(e) => setDraft({ ...draft, retainer: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="ppcr-field">
              <label>מנהל לקוח</label>
              <select
                className="ppcr-select"
                value={draft.manager}
                onChange={(e) => setDraft({ ...draft, manager: e.target.value as Manager })}
              >
                {ALL_MANAGERS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="ppcr-field">
            <label>פלטפורמות פרסום</label>
            <div className="ppcr-checkbox-grid">
              {ALL_PLATFORMS.map((p) => (
                <label
                  key={p}
                  className={`ppcr-checkbox-tile${draft.platforms.includes(p) ? ' ppcr-checkbox-tile--on' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={draft.platforms.includes(p)}
                    onChange={() => togglePlatform(p)}
                  />
                  <span>{p}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="ppcr-field-row">
            <div className="ppcr-field">
              <label>קמפיינים במטא</label>
              <input
                className="ppcr-input ppcr-mono"
                type="number"
                value={draft.meta}
                onChange={(e) => setDraft({ ...draft, meta: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
            <div className="ppcr-field">
              <label>קמפיינים בגוגל</label>
              <input
                className="ppcr-input ppcr-mono"
                type="number"
                value={draft.google}
                onChange={(e) => setDraft({ ...draft, google: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
          </div>

          <div className="ppcr-drawer-summary">
            <div className="ppcr-drawer-summary__row">
              <span>סה״כ קמפיינים</span>
              <span className="ppcr-mono">{totalCamp}</span>
            </div>
            <div className="ppcr-drawer-summary__row">
              <span>ריטיינר לקמפיין</span>
              <span className="ppcr-mono">{fmt(perCamp)}</span>
            </div>
          </div>
        </div>
        <div className="ppcr-drawer__foot">
          {client && (
            <button
              className="ppcr-btn--link ppcr-btn--link-danger"
              onClick={() => onDelete(client.id)}
              disabled={saving}
            >
              מחיקת לקוח
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="ppcr-btn ppcr-btn--ghost" onClick={onClose} disabled={saving}>
            בטל
          </button>
          <button
            className="ppcr-btn ppcr-btn--yellow"
            onClick={() => onSave(draft as Client)}
            disabled={saving || !draft.name.trim()}
          >
            {saving ? 'שומר…' : client ? 'שמור' : 'הוסף ריטיינר'}
          </button>
        </div>
      </aside>
    </>
  );
}
