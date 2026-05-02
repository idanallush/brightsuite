'use client';

import { motion } from 'motion/react';
import useSWR from 'swr';
import {
  Code2,
  Database,
  Server,
  Lock,
  Cloud,
  Boxes,
  Workflow,
  Shield,
  Wallet,
  Target,
  Image as ImageIcon,
  PenLine,
  BarChart3,
  Briefcase,
  LayoutDashboard,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { TOOLS } from '@/lib/tools';

type EnvSeverity = 'critical' | 'important' | 'optional';
interface EnvCheck {
  key: string;
  label: string;
  set: boolean;
  severity: EnvSeverity;
  purpose: string;
}
interface EnvHealthResponse {
  checks: EnvCheck[];
  summary: {
    total: number;
    set: number;
    missingCritical: number;
    missingImportant: number;
    missingOptional: number;
  };
  checkedAt: string;
}

async function envFetcher(url: string): Promise<EnvHealthResponse> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

const TOOL_ICONS: Record<string, LucideIcon> = {
  Shield,
  Wallet,
  Target,
  Image: ImageIcon,
  PenLine,
  BarChart3,
  Briefcase,
  LayoutDashboard,
};

// =====================================================
// Display data — versions and stack info pulled from package.json
// =====================================================
const VERSIONS = {
  next: '16.2.2',
  react: '19.2.4',
  tailwind: '4.x',
  swr: '2.4',
  motion: '12.38',
  libsql: '0.17',
  ironSession: '8.0',
  anthropicSdk: '0.82',
  radix: '1.x',
  tanstackTable: '8.21',
  lucide: '1.7',
  dateFns: '4.1',
  sonner: '2.0',
};

const TABLE_GROUPS: Array<{
  group: string;
  prefix: string;
  tool: string;
  tables: string[];
  description: string;
}> = [
  {
    group: 'Core / Auth',
    prefix: 'bs_',
    tool: 'BrightSuite',
    tables: ['bs_users', 'bs_tool_permissions', 'bs_audit_log', 'bs_fb_connections', 'bs_google_connections'],
    description: 'משתמשים, הרשאות לכלים, לוג פעילות וחיבורי OAuth (Meta + Google)',
  },
  {
    group: 'Ads Hub (legacy)',
    prefix: 'ah_',
    tool: 'Ads Hub',
    tables: ['ah_clients', 'ah_campaigns', 'ah_performance_daily', 'ah_video_ads', 'ah_video_performance', 'ah_sync_log'],
    description: 'דאטה מאוחד של פרסום מ-Meta / Google Ads / GA4',
  },
  {
    group: 'Clients Dashboard',
    prefix: 'cd_',
    tool: 'Clients Dashboard',
    tables: ['cd_creatives', 'cd_creative_assets', 'cd_alerts', 'cd_views', 'cd_changes'],
    description: 'מעטפת חדשה: קריאייטיב מאוחד, התראות, תצוגות מותאמות, היסטוריית עריכות',
  },
  {
    group: 'CPA Tracker',
    prefix: 'cpa_',
    tool: 'CPA Tracker',
    tables: ['cpa_clients', 'cpa_alerts', 'cpa_topics', 'cpa_health'],
    description: 'מעקב CPA בזמן אמת מול יעדים + מערכת התראות',
  },
  {
    group: 'BudgetFlow',
    prefix: 'bf_',
    tool: 'BudgetFlow',
    tables: ['bf_clients', 'bf_campaigns', 'bf_budget_periods', 'bf_changelog', 'bf_sync_logs'],
    description: 'תחזיות תקציב חודשיות, היסטוריית שינויים, סנכרון יומי',
  },
  {
    group: 'PPC Retainer',
    prefix: 'pr_',
    tool: 'ניהול ריטיינרים',
    tables: ['pr_clients', 'pr_team', 'pr_expenses', 'pr_forecast'],
    description: 'תיק ריטיינרים, רווחיות צוות, הוצאות ותחזית 12 חודשים',
  },
  {
    group: 'Writer (MultiWrite)',
    prefix: 'wr_',
    tool: 'MultiWrite',
    tables: ['wr_clients', 'wr_history', 'wr_copy_archive'],
    description: 'ייצור קופי AI מבוסס Anthropic Claude, ארכיון והיסטוריה',
  },
];

const EXTERNAL_SERVICES = [
  { name: 'Turso (libSQL)', kind: 'Database', icon: Database, env: 'TURSO_DATABASE_URL · TURSO_AUTH_TOKEN' },
  { name: 'Vercel', kind: 'Hosting + Serverless', icon: Cloud, env: '—' },
  { name: 'Vercel Blob', kind: 'File storage', icon: Cloud, env: 'BLOB_READ_WRITE_TOKEN' },
  { name: 'Google OAuth', kind: 'Sign-in', icon: Lock, env: 'GOOGLE_CLIENT_ID · GOOGLE_CLIENT_SECRET' },
  { name: 'Google Ads API', kind: 'Ad data', icon: Server, env: 'GOOGLE_ADS_DEVELOPER_TOKEN · MCC' },
  { name: 'Meta Graph API', kind: 'Ad data', icon: Server, env: 'FB_APP_ID · FB_APP_SECRET' },
  { name: 'GA4 Data API', kind: 'Web analytics', icon: Server, env: 'service-account JSON' },
  { name: 'Anthropic Claude', kind: 'AI copy generation', icon: Server, env: 'ANTHROPIC_API_KEY' },
  { name: 'Supabase', kind: 'Auxiliary auth state', icon: Server, env: 'NEXT_PUBLIC_SUPABASE_URL · ANON_KEY' },
];

export default function SystemPage() {
  const { user } = useAuth();
  const { data: envHealth } = useSWR<EnvHealthResponse>(
    user?.role === 'admin' ? '/api/system/env-health' : null,
    envFetcher,
  );

  if (user?.role !== 'admin') {
    return (
      <div className="glass-card p-6 max-w-xl">
        <p style={{ color: 'var(--text-secondary)' }}>
          לעמוד הזה דרושה הרשאת מנהל. בקש מאדמין להעניק לך גישה.
        </p>
      </div>
    );
  }

  const totalTables = TABLE_GROUPS.reduce((s, g) => s + g.tables.length, 0);

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Hero */}
      <motion.div
        className="glass-card p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--accent-subtle)', color: 'var(--accent-fg)' }}
          >
            <Boxes size={24} />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              ארכיטקטורה ותשתית
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              סקירה מלאה של ה-stack של BrightSuite — Frontend, Database, API, Auth, Hosting,
              והכלים שמרכיבים את המערכת. תצוגה בלבד, לא ניתן לערוך מכאן.
            </p>
            <div className="flex flex-wrap gap-2 mt-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <span className="sys-pill">{TOOLS.length} כלים פעילים</span>
              <span className="sys-pill">{totalTables} טבלאות DB</span>
              <span className="sys-pill">{EXTERNAL_SERVICES.length} שירותים חיצוניים</span>
              <span className="sys-pill">Next.js {VERSIONS.next}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Env health */}
      {envHealth && (
        <motion.div
          className="glass-card p-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.04 }}
        >
          <SectionHead
            icon={<Shield size={18} />}
            title="בריאות משתני סביבה"
            hint={`${envHealth.summary.set}/${envHealth.summary.total} מוגדרים`}
          />
          {envHealth.summary.missingCritical > 0 && (
            <div
              className="rounded-lg p-3 mb-3 text-xs flex items-start gap-2"
              style={{
                background: 'rgba(185, 28, 28, 0.08)',
                border: '1px solid rgba(185, 28, 28, 0.3)',
                color: '#b91c1c',
              }}
            >
              <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
              <span>
                {envHealth.summary.missingCritical} משתנה קריטי חסר. חלק מהפונקציונליות תיכשל בפרודקשן —
                הגדר ב-Vercel Project Settings → Environment Variables.
              </span>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-2">
            {envHealth.checks.map((c) => (
              <EnvRow key={c.key} check={c} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Tools list */}
      <motion.div
        className="glass-card p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.05 }}
      >
        <SectionHead icon={<Workflow size={18} />} title="כלים במערכת" hint={`${TOOLS.length} כלים`} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TOOLS.map((tool) => {
            const Icon = TOOL_ICONS[tool.icon] || Boxes;
            return (
              <div
                key={tool.slug}
                className="rounded-xl border p-3 flex items-start gap-3"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'var(--card-bg)',
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: tool.color + '22', color: tool.color }}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {tool.name}
                    </span>
                    <code className="sys-code">{tool.slug}</code>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                    {tool.description}
                  </p>
                  <code className="sys-code mt-2 inline-block">{tool.href}</code>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Stack grid */}
      <div className="grid lg:grid-cols-2 gap-4">
        <SysCard icon={<Code2 size={18} />} title="Frontend" delay={0.08}>
          <SysRow k="Framework" v={`Next.js ${VERSIONS.next} (App Router · Turbopack)`} />
          <SysRow k="Runtime" v={`React ${VERSIONS.react}`} />
          <SysRow k="Styling" v={`Tailwind CSS ${VERSIONS.tailwind} + glass design tokens`} />
          <SysRow k="Data fetching" v={`SWR ${VERSIONS.swr} (revalidateOnFocus, optimistic updates)`} />
          <SysRow k="Animation" v={`motion ${VERSIONS.motion} (framer-motion)`} />
          <SysRow k="Components" v={`Radix UI ${VERSIONS.radix} (dialog, dropdown, tabs…)`} />
          <SysRow k="Tables" v={`@tanstack/react-table ${VERSIONS.tanstackTable}`} />
          <SysRow k="Icons" v={`lucide-react ${VERSIONS.lucide}`} />
          <SysRow k="Toasts" v={`sonner ${VERSIONS.sonner}`} />
          <SysRow k="Dates" v={`date-fns ${VERSIONS.dateFns}`} />
          <SysRow k="RTL" v="Hebrew · dir=rtl in root layout · Heebo font" />
        </SysCard>

        <SysCard icon={<Database size={18} />} title="Database" delay={0.1}>
          <SysRow k="Provider" v="Turso (libSQL · serverless SQLite, edge-replicated)" />
          <SysRow k="Client" v={`@libsql/client ${VERSIONS.libsql} (raw SQL — no ORM)`} />
          <SysRow k="Init" v={<code>src/lib/db/init.ts</code>} hint="ensureDatabase() runs once per cold start" />
          <SysRow k="Migrations" v="INIT_VERSION bump → re-run on warm deploys" />
          <SysRow k="Local dev" v={<code>data/brightsuite.db</code>} hint="SQLite file (gitignored at repo root)" />
          <SysRow k="Total tables" v={`${totalTables} (${TABLE_GROUPS.length} prefix groups)`} />
        </SysCard>

        <SysCard icon={<Server size={18} />} title="API & Routes" delay={0.12}>
          <SysRow k="Style" v="Next.js App Router · GET/POST/PUT/DELETE per route.ts" />
          <SysRow k="Auth gate" v={<code>requireApiAuth() / requireBudgetAuth() / requirePpcAuth()</code>} />
          <SysRow k="Pattern" v="optimistic mutate → fetch → revalidate" />
          <SysRow k="Long-running" v="vercel.json maxDuration overrides (ad-sync 120s, writer 90s, PDF 60s)" />
          <SysRow k="Cron" v={<code>/api/cron/ad-sync · /api/budget/cron/daily-sync · /api/cpa/cron/refresh</code>} />
          <SysRow k="Share links" v={<code>/api/budget/share/[token]</code>} hint="public read with token, no login" />
        </SysCard>

        <SysCard icon={<Lock size={18} />} title="Authentication & Authorization" delay={0.14}>
          <SysRow k="Sessions" v={`iron-session ${VERSIONS.ironSession} (encrypted JWE cookies)`} />
          <SysRow k="Sign-in" v="Google OAuth 2.0 only" />
          <SysRow k="Roles" v={<code>admin · manager · viewer</code>} hint="admin אוטומטית מקבל גישה לכל הכלים" />
          <SysRow k="Tool access" v="bs_tool_permissions (per-user grants by slug)" />
          <SysRow k="External auth" v="bs_fb_connections / bs_google_connections (refresh tokens)" />
          <SysRow k="Audit" v="bs_audit_log — לוג כל פעולה רגישה" />
        </SysCard>

        <SysCard icon={<Cloud size={18} />} title="Hosting & Deploy" delay={0.16}>
          <SysRow k="Platform" v="Vercel (Edge Network · serverless functions)" />
          <SysRow k="CI/CD" v="git push origin main → auto deploy" />
          <SysRow k="Production" v={<code>brightsuite.vercel.app</code>} />
          <SysRow k="Repo" v={<code>github.com/idanallush/brightsuite</code>} />
          <SysRow k="Cron" v="vercel.json crons section (daily syncs)" />
          <SysRow k="Local port" v={<code>localhost:3333</code>} hint="OAuth callback hardcoded שם" />
        </SysCard>

        <SysCard icon={<Boxes size={18} />} title="AI / External APIs" delay={0.18}>
          <SysRow k="Anthropic" v={`Claude SDK ${VERSIONS.anthropicSdk} (Writer tool)`} />
          <SysRow k="Meta Marketing" v="Graph API v23 — Ads, Insights, video transcripts" />
          <SysRow k="Google Ads" v="REST API v17 — campaigns, performance, MCC" />
          <SysRow k="GA4" v="Data API + MCP — web analytics, conversions" />
          <SysRow k="Image rendering" v="puppeteer-core + @sparticuz/chromium-min (PDF export)" />
        </SysCard>
      </div>

      {/* DB tables breakdown */}
      <motion.div
        className="glass-card p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.2 }}
      >
        <SectionHead
          icon={<Database size={18} />}
          title="פירוט סכמת בסיס הנתונים"
          hint={`${totalTables} טבלאות · ${TABLE_GROUPS.length} קבוצות`}
        />
        <div className="grid md:grid-cols-2 gap-3">
          {TABLE_GROUPS.map((g) => (
            <div
              key={g.prefix}
              className="rounded-xl border p-4"
              style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {g.group}
                </span>
                <code className="sys-code">{g.prefix}*</code>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  · {g.tool}
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                {g.description}
              </p>
              <div className="flex flex-wrap gap-1 mt-3">
                {g.tables.map((t) => (
                  <code key={t} className="sys-code">
                    {t}
                  </code>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* External services */}
      <motion.div
        className="glass-card p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.22 }}
      >
        <SectionHead
          icon={<Cloud size={18} />}
          title="חיבורים לשירותים חיצוניים"
          hint={`${EXTERNAL_SERVICES.length} ספקים`}
        />
        <div className="grid md:grid-cols-2 gap-2">
          {EXTERNAL_SERVICES.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.name}
                className="flex items-start gap-3 p-3 rounded-lg border"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'var(--accent-subtle)', color: 'var(--accent-fg)' }}
                >
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {s.name}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {s.kind}
                  </div>
                  <code className="sys-code mt-1 inline-block">{s.env}</code>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Folder structure */}
      <motion.div
        className="glass-card p-0 overflow-hidden"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.24 }}
      >
        <div className="px-6 pt-6">
          <SectionHead icon={<Code2 size={18} />} title="מבנה תיקיות" hint="src/" />
        </div>
        <pre className="sys-tree">
{`src/
├── app/
│   ├── (auth)/login/                Google OAuth + session
│   ├── (shell)/                     Authenticated app shell
│   │   ├── (tools)/
│   │   │   ├── ad-checker/          Ad Safe Zone
│   │   │   ├── ads/                 FB Ads Tool
│   │   │   ├── budget/              BudgetFlow
│   │   │   ├── clients-dashboard/   Clients Dashboard
│   │   │   ├── cpa/                 CPA Tracker
│   │   │   ├── ppc-retainer/        ניהול ריטיינרים
│   │   │   └── writer/              MultiWrite
│   │   ├── dashboard/
│   │   └── settings/                ← אתה כאן
│   ├── api/                         Route handlers per tool
│   └── share/                       Public share links (no auth)
├── components/
│   ├── shell/                       Sidebar, Topbar
│   └── <tool>/                      Tool-specific UI
├── hooks/                           use-auth, use-route-memory, …
├── lib/
│   ├── auth/                        session, require-auth
│   ├── db/                          turso.ts, init.ts (schema)
│   └── <tool>/                      services, sync cores, helpers
├── stores/                          Zustand global stores
└── types/                           TypeScript shared types`}
        </pre>
      </motion.div>

      <style jsx>{`
        .sys-pill {
          padding: 4px 10px;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 999px;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

function SectionHead({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--accent-fg)' }}>{icon}</span>
        <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
      </div>
      {hint && (
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {hint}
        </span>
      )}
    </div>
  );
}

function SysCard({
  icon,
  title,
  children,
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      className="glass-card p-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay }}
    >
      <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
        <span
          className="w-7 h-7 rounded-md flex items-center justify-center"
          style={{ background: 'var(--accent-subtle)', color: 'var(--accent-fg)' }}
        >
          {icon}
        </span>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </motion.div>
  );
}

function EnvRow({ check }: { check: EnvCheck }) {
  const Icon = check.set ? CheckCircle2 : check.severity === 'critical' ? AlertTriangle : HelpCircle;
  const tone = check.set
    ? { color: '#15803d', bg: 'rgba(34, 197, 94, 0.08)', border: 'rgba(34, 197, 94, 0.25)' }
    : check.severity === 'critical'
      ? { color: '#b91c1c', bg: 'rgba(185, 28, 28, 0.08)', border: 'rgba(185, 28, 28, 0.3)' }
      : check.severity === 'important'
        ? { color: '#a16207', bg: 'rgba(202, 138, 4, 0.08)', border: 'rgba(202, 138, 4, 0.3)' }
        : { color: 'var(--text-tertiary)', bg: 'var(--card-bg)', border: 'var(--card-border)' };
  const severityLabel: Record<EnvSeverity, string> = {
    critical: 'קריטי',
    important: 'חשוב',
    optional: 'אופציונלי',
  };

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg border"
      style={{ borderColor: tone.border, background: tone.bg }}
    >
      <Icon size={16} style={{ color: tone.color, marginTop: 2, flexShrink: 0 }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="sys-code">{check.label}</code>
          <span className="text-xs font-semibold" style={{ color: tone.color }}>
            {check.set ? 'מוגדר' : 'חסר'}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            · {severityLabel[check.severity]}
          </span>
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
          {check.purpose}
        </p>
      </div>
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
    <div
      className="grid gap-3 py-1.5"
      style={{
        gridTemplateColumns: '120px 1fr',
        borderBottom: '1px dashed var(--card-border)',
      }}
    >
      <div
        className="text-xs font-semibold uppercase"
        style={{ color: 'var(--text-tertiary)', letterSpacing: '0.02em' }}
      >
        {k}
      </div>
      <div className="text-xs" style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>
        {v}
        {hint && (
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}
