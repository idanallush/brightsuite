import { getTurso } from './turso';

export async function initDatabase(): Promise<void> {
  await getTurso().executeMultiple(`
    CREATE TABLE IF NOT EXISTS bs_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'viewer')),
      google_id TEXT UNIQUE,
      avatar_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bs_tool_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES bs_users(id) ON DELETE CASCADE,
      tool_slug TEXT NOT NULL,
      granted_by INTEGER REFERENCES bs_users(id),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, tool_slug)
    );

    CREATE TABLE IF NOT EXISTS bs_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES bs_users(id) ON DELETE SET NULL,
      user_email TEXT,
      user_name TEXT,
      tool_slug TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bs_fb_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_by INTEGER REFERENCES bs_users(id),
      fb_user_id TEXT NOT NULL,
      fb_user_name TEXT,
      access_token TEXT NOT NULL,
      token_expires_at TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bs_google_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_by INTEGER REFERENCES bs_users(id),
      google_user_id TEXT,
      google_user_email TEXT,
      refresh_token TEXT NOT NULL,
      access_token TEXT,
      token_expires_at TEXT,
      scopes TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_bs_sessions_user ON bs_tool_permissions(user_id);
    CREATE INDEX IF NOT EXISTS idx_bs_audit_user ON bs_audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_bs_audit_tool ON bs_audit_log(tool_slug);
    CREATE INDEX IF NOT EXISTS idx_bs_audit_created ON bs_audit_log(created_at);

    -- Ads Hub: Client-platform mappings
    CREATE TABLE IF NOT EXISTS ah_clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      meta_account_id TEXT,
      google_customer_id TEXT,
      google_mcc_id TEXT,
      ga4_property_id TEXT,
      currency TEXT DEFAULT 'ILS',
      metric_type TEXT DEFAULT 'leads' CHECK (metric_type IN ('leads', 'ecommerce')),
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Ads Hub: Campaign metadata
    CREATE TABLE IF NOT EXISTS ah_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES ah_clients(id) ON DELETE CASCADE,
      platform TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'ga4')),
      platform_campaign_id TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT,
      objective TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(platform, platform_campaign_id)
    );

    -- Ads Hub: Daily performance metrics
    -- revenue/roas added 2026-04-28 for ecommerce clients (metric_type='ecommerce')
    CREATE TABLE IF NOT EXISTS ah_performance_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES ah_clients(id) ON DELETE CASCADE,
      platform TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'ga4')),
      campaign_id TEXT NOT NULL,
      date TEXT NOT NULL,
      impressions INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      conversions REAL DEFAULT 0,
      spend REAL DEFAULT 0,
      revenue REAL DEFAULT 0,
      cpc REAL,
      ctr REAL,
      cpl REAL,
      roas REAL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(platform, campaign_id, date)
    );

    -- Ads Hub: Video ads from Meta
    CREATE TABLE IF NOT EXISTS ah_video_ads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES ah_clients(id) ON DELETE CASCADE,
      meta_ad_id TEXT NOT NULL UNIQUE,
      meta_campaign_id TEXT,
      ad_name TEXT,
      video_id TEXT,
      thumbnail_url TEXT,
      utm_source TEXT DEFAULT 'meta',
      utm_medium TEXT DEFAULT 'paid',
      utm_campaign TEXT,
      utm_content TEXT,
      transcript TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Ads Hub: Video ad retention funnel
    CREATE TABLE IF NOT EXISTS ah_video_performance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_ad_id INTEGER NOT NULL REFERENCES ah_video_ads(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      impressions INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      spend REAL DEFAULT 0,
      p25 INTEGER DEFAULT 0,
      p50 INTEGER DEFAULT 0,
      p75 INTEGER DEFAULT 0,
      p95 INTEGER DEFAULT 0,
      p100 INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(video_ad_id, date)
    );

    -- Ads Hub: Sync audit log
    CREATE TABLE IF NOT EXISTS ah_sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES ah_clients(id) ON DELETE SET NULL,
      platform TEXT NOT NULL,
      sync_type TEXT NOT NULL CHECK (sync_type IN ('daily', 'backfill', 'video_discovery')),
      status TEXT NOT NULL CHECK (status IN ('success', 'error', 'partial', 'skipped')),
      records_synced INTEGER DEFAULT 0,
      error_message TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_ah_perf_client_date ON ah_performance_daily(client_id, date);
    CREATE INDEX IF NOT EXISTS idx_ah_perf_platform_campaign ON ah_performance_daily(platform, campaign_id, date);
    CREATE INDEX IF NOT EXISTS idx_ah_sync_client ON ah_sync_log(client_id, started_at);
    CREATE INDEX IF NOT EXISTS idx_ah_campaigns_client ON ah_campaigns(client_id);
    CREATE INDEX IF NOT EXISTS idx_ah_video_client ON ah_video_ads(client_id);

    -- ============================================================
    -- Clients Dashboard (cd_) — new top-level dashboard sharing the
    -- ah_clients / ah_campaigns / ah_performance_daily data layer,
    -- but adding edit history, alerts, custom views, and unified
    -- creatives (video / image / carousel / collection).
    -- ============================================================

    -- Unified creative catalog. Replaces the video-only ah_video_ads going
    -- forward. type discriminates between video / image / carousel / collection.
    -- Carousel children are joined via cd_creative_assets.
    CREATE TABLE IF NOT EXISTS cd_creatives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES ah_clients(id) ON DELETE CASCADE,
      platform TEXT NOT NULL CHECK (platform IN ('meta', 'google')),
      platform_ad_id TEXT NOT NULL,
      platform_campaign_id TEXT,
      ad_name TEXT,
      type TEXT NOT NULL CHECK (type IN ('video', 'image', 'carousel', 'collection')),
      thumbnail_url TEXT,
      media_url TEXT,
      headline TEXT,
      body TEXT,
      cta TEXT,
      landing_url TEXT,
      effective_status TEXT,
      first_seen_at TEXT DEFAULT (datetime('now')),
      last_seen_at TEXT DEFAULT (datetime('now')),
      raw_json TEXT,
      UNIQUE(platform, platform_ad_id)
    );

    -- Per-asset rows for carousels / collections (one creative -> N assets).
    CREATE TABLE IF NOT EXISTS cd_creative_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creative_id INTEGER NOT NULL REFERENCES cd_creatives(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      asset_type TEXT NOT NULL CHECK (asset_type IN ('video', 'image')),
      thumbnail_url TEXT,
      media_url TEXT,
      headline TEXT,
      body TEXT,
      landing_url TEXT
    );

    -- Per-creative daily performance (impressions, spend, conversions, video views).
    CREATE TABLE IF NOT EXISTS cd_creative_performance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creative_id INTEGER NOT NULL REFERENCES cd_creatives(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      impressions INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      spend REAL DEFAULT 0,
      conversions REAL DEFAULT 0,
      revenue REAL DEFAULT 0,
      video_views INTEGER DEFAULT 0,
      p25 INTEGER DEFAULT 0,
      p50 INTEGER DEFAULT 0,
      p75 INTEGER DEFAULT 0,
      p95 INTEGER DEFAULT 0,
      p100 INTEGER DEFAULT 0,
      UNIQUE(creative_id, date)
    );

    -- Client-level edit history (renames, metric_type swaps, account-id
    -- changes, soft-delete via is_active flip). Mirrors cd_campaign_changes
    -- but scoped to ah_clients rows. source: 'user' | 'system' (no 'sync'
    -- because client-level changes only happen via the dashboard UI / API).
    CREATE TABLE IF NOT EXISTS cd_client_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES ah_clients(id) ON DELETE CASCADE,
      field TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      user_id INTEGER REFERENCES bs_users(id) ON DELETE SET NULL,
      source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'system')),
      note TEXT,
      detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Campaign edit history. Detected via diffing campaign snapshots on each
    -- sync, or written explicitly by user actions in the dashboard.
    CREATE TABLE IF NOT EXISTS cd_campaign_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES ah_clients(id) ON DELETE CASCADE,
      campaign_id INTEGER REFERENCES ah_campaigns(id) ON DELETE SET NULL,
      platform TEXT NOT NULL,
      platform_campaign_id TEXT,
      change_type TEXT NOT NULL,
      field TEXT,
      old_value TEXT,
      new_value TEXT,
      source TEXT NOT NULL DEFAULT 'sync' CHECK (source IN ('sync', 'user', 'system')),
      user_id INTEGER REFERENCES bs_users(id) ON DELETE SET NULL,
      detected_at TEXT NOT NULL DEFAULT (datetime('now')),
      note TEXT
    );

    -- Anomaly / problem alerts produced by the alerts engine.
    -- status: 'open' (visible) | 'acknowledged' (snoozed) | 'resolved' (auto-cleared).
    CREATE TABLE IF NOT EXISTS cd_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES ah_clients(id) ON DELETE CASCADE,
      campaign_id INTEGER REFERENCES ah_campaigns(id) ON DELETE SET NULL,
      platform TEXT,
      severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT,
      metric_value REAL,
      threshold_value REAL,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
      acknowledged_by INTEGER REFERENCES bs_users(id) ON DELETE SET NULL,
      acknowledged_at TEXT,
      resolved_at TEXT,
      reopened_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Per-user saved view layouts (filters, sort, columns, widget order).
    -- payload is opaque JSON owned by the dashboard front-end.
    CREATE TABLE IF NOT EXISTS cd_user_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES bs_users(id) ON DELETE CASCADE,
      scope TEXT NOT NULL,
      name TEXT NOT NULL,
      payload TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, scope, name)
    );

    CREATE INDEX IF NOT EXISTS idx_cd_creatives_client ON cd_creatives(client_id);
    CREATE INDEX IF NOT EXISTS idx_cd_creative_perf ON cd_creative_performance(creative_id, date);
    CREATE INDEX IF NOT EXISTS idx_cd_creative_performance_date ON cd_creative_performance(date);
    CREATE INDEX IF NOT EXISTS idx_cd_client_changes_client ON cd_client_changes(client_id, detected_at DESC);
    CREATE INDEX IF NOT EXISTS idx_cd_changes_client ON cd_campaign_changes(client_id, detected_at);
    CREATE INDEX IF NOT EXISTS idx_cd_changes_campaign ON cd_campaign_changes(campaign_id, detected_at);
    CREATE INDEX IF NOT EXISTS idx_cd_campaign_changes_user_id ON cd_campaign_changes(user_id);
    CREATE INDEX IF NOT EXISTS idx_cd_alerts_client_status ON cd_alerts(client_id, status, severity);
    CREATE INDEX IF NOT EXISTS idx_cd_alerts_created_at ON cd_alerts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_cd_views_user ON cd_user_views(user_id, scope);

    -- CPA Dashboard: per-user saved views (filters / hidden client-id sets / sort).
    -- Mirrors cd_user_views but scoped to a single surface so we omit the scope column.
    -- payload is opaque JSON owned by the CPA dashboard front-end.
    CREATE TABLE IF NOT EXISTS cpa_user_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES bs_users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      payload TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, name)
    );

    CREATE INDEX IF NOT EXISTS idx_cpa_views_user ON cpa_user_views(user_id);

    -- PPC Retainer Manager: agency clients on retainer
    CREATE TABLE IF NOT EXISTS pr_clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      retainer REAL NOT NULL DEFAULT 0,
      manager TEXT NOT NULL,
      platforms TEXT NOT NULL DEFAULT '[]',
      meta INTEGER NOT NULL DEFAULT 0,
      google INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- PPC Retainer Manager: team roster (revenue / employer cost per manager)
    CREATE TABLE IF NOT EXISTS pr_team (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      revenue REAL NOT NULL DEFAULT 0,
      employer_cost REAL NOT NULL DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- PPC Retainer Manager: fixed monthly expenses
    CREATE TABLE IF NOT EXISTS pr_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      note TEXT DEFAULT '',
      category TEXT NOT NULL DEFAULT 'Tools',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- PPC Retainer Manager: forecast settings (singleton row, id always = 1)
    CREATE TABLE IF NOT EXISTS pr_forecast (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      new_monthly REAL NOT NULL DEFAULT 0,
      churn_monthly REAL NOT NULL DEFAULT 0,
      raise_pct REAL NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const db = getTurso();

  // Migration: add metric_type to ah_clients if missing (SQLite doesn't alter
  // on CREATE TABLE IF NOT EXISTS, so we check pragma and ALTER manually).
  const clientCols = await db.execute({ sql: `PRAGMA table_info(ah_clients)`, args: [] });
  const hasMetricType = clientCols.rows.some((r) => r.name === 'metric_type');
  if (!hasMetricType) {
    await db.execute({
      sql: `ALTER TABLE ah_clients ADD COLUMN metric_type TEXT DEFAULT 'leads'`,
      args: [],
    });
    console.log('[DB] Added metric_type column to ah_clients');
  }

  // Migration: add revenue/roas to ah_performance_daily for ecommerce clients.
  const perfCols = await db.execute({
    sql: `PRAGMA table_info(ah_performance_daily)`,
    args: [],
  });
  const perfColNames = new Set(perfCols.rows.map((r) => r.name as string));
  if (!perfColNames.has('revenue')) {
    await db.execute({
      sql: `ALTER TABLE ah_performance_daily ADD COLUMN revenue REAL DEFAULT 0`,
      args: [],
    });
    console.log('[DB] Added revenue column to ah_performance_daily');
  }
  if (!perfColNames.has('roas')) {
    await db.execute({
      sql: `ALTER TABLE ah_performance_daily ADD COLUMN roas REAL`,
      args: [],
    });
    console.log('[DB] Added roas column to ah_performance_daily');
  }

  // Migration: add reopened_count to cd_alerts so we can track how many times
  // the same (client_id, kind) re-opened after being acknowledged.
  const alertsCols = await db.execute({
    sql: `PRAGMA table_info(cd_alerts)`,
    args: [],
  });
  const alertsColNames = new Set(alertsCols.rows.map((r) => r.name as string));
  if (!alertsColNames.has('reopened_count')) {
    await db.execute({
      sql: `ALTER TABLE cd_alerts ADD COLUMN reopened_count INTEGER NOT NULL DEFAULT 0`,
      args: [],
    });
    console.log('[DB] Added reopened_count column to cd_alerts');
  }

  // Bootstrap: if no admin exists yet, promote the earliest active user to admin.
  const adminCheck = await db.execute({
    sql: `SELECT COUNT(*) as count FROM bs_users WHERE role = 'admin' AND is_active = 1`,
    args: [],
  });
  if (Number(adminCheck.rows[0]?.count ?? 0) === 0) {
    await db.execute({
      sql: `UPDATE bs_users
            SET role = 'admin', updated_at = datetime('now')
            WHERE id = (SELECT id FROM bs_users WHERE is_active = 1 ORDER BY created_at ASC LIMIT 1)`,
      args: [],
    });
    console.log('[DB] Bootstrapped first user to admin role');
  }

  // PPC Retainer Manager: seed initial data on first run only (zero-row check
  // for each table — safe to call repeatedly, idempotent across deploys).
  await seedPpcRetainer(db);

  console.log('[DB] All tables and indexes created successfully');
}

async function seedPpcRetainer(db: ReturnType<typeof getTurso>) {
  const clientCount = await db.execute({ sql: `SELECT COUNT(*) as c FROM pr_clients`, args: [] });
  if (Number(clientCount.rows[0]?.c ?? 0) === 0) {
    const seed: Array<[string, number, string, string[], number, number]> = [
      ['שמרת הזורע', 9560, 'עידן', ['גוגל', 'מטא'], 11, 5],
      ['מילגה', 6496, 'עידן', ['גוגל', 'מטא', 'טיקטוק'], 6, 5],
      ['שנקר הנדסאים', 4207, 'עידן', ['גוגל', 'מטא'], 12, 11],
      ['פאסוס פולראס', 5086, 'עידן', ['מטא'], 5, 0],
      ['אלברט ארט', 7580, 'עידן', ['גוגל', 'מטא'], 6, 1],
      ['IAC', 4500, 'שרון', ['גוגל', 'מטא'], 8, 2],
      ['עודד קרבצ\'יק', 3800, 'שרון', ['מטא'], 2, 0],
      ['פוטוטבע', 5956, 'שרון', ['גוגל', 'מטא'], 7, 1],
      ['רייכמן IDC', 5853, 'שרון', ['גוגל', 'מטא', 'לינקדאין'], 8, 2],
      ['רותם שני', 7003, 'שרון', ['גוגל', 'מטא', 'IDX'], 16, 10],
      ['קומסקיור Eset', 7000, 'שרון', ['גוגל', 'מטא'], 2, 5],
      ['Profit', 3000, 'בן', ['מטא'], 2, 0],
      ['ויסמן רהיטים', 3000, 'בן', ['מטא'], 4, 0],
      ['Inspire', 4000, 'בן', ['מטא'], 2, 0],
      ['קידמה גז', 3000, 'בן', ['מטא'], 2, 0],
      ['Meala', 1800, 'בן', ['לינקדאין'], 2, 0],
      ['Safe Consulting', 2000, 'בן', ['מטא'], 2, 0],
      ['Milk & Butterfly', 3800, 'בן', ['מטא'], 4, 0],
      ['Hebrew Uni', 2500, 'דן', ['מטא', 'לינקדאין'], 3, 1],
      ['Syberlion', 2500, 'דן', ['גוגל'], 0, 4],
      ['Adcom', 1500, 'דן', ['לינקדאין'], 0, 1],
      ['Elevation', 500, 'דן/ישי', ['מטא'], 3, 0],
    ];
    for (const [name, retainer, manager, platforms, meta, google] of seed) {
      await db.execute({
        sql: `INSERT INTO pr_clients (name, retainer, manager, platforms, meta, google) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [name, retainer, manager, JSON.stringify(platforms), meta, google],
      });
    }
    console.log(`[DB] Seeded ${seed.length} PPC retainer clients`);
  }

  const teamCount = await db.execute({ sql: `SELECT COUNT(*) as c FROM pr_team`, args: [] });
  if (Number(teamCount.rows[0]?.c ?? 0) === 0) {
    const seed: Array<[string, number, number, number]> = [
      ['עידן', 32929, 25300, 1],
      ['שרון', 34112, 19690, 2],
      ['בן', 20600, 21500, 3],
      ['דן', 7000, 10750, 4],
    ];
    for (const [name, revenue, cost, order] of seed) {
      await db.execute({
        sql: `INSERT INTO pr_team (name, revenue, employer_cost, sort_order) VALUES (?, ?, ?, ?)`,
        args: [name, revenue, cost, order],
      });
    }
    console.log(`[DB] Seeded ${seed.length} PPC retainer team members`);
  }

  const expCount = await db.execute({ sql: `SELECT COUNT(*) as c FROM pr_expenses`, args: [] });
  if (Number(expCount.rows[0]?.c ?? 0) === 0) {
    const seed: Array<[string, number, string, string]> = [
      ['Stape Meta CAPI', 315, 'דיווח המרות צד שרת לכל הלקוחות', 'Tracking'],
      ['Windsor', 535, 'סנכרון דאטה בכל הפלטפורמות', 'Data'],
      ['Supermetrics', 136, 'סנכרון דאטה בכל הפלטפורמות', 'Data'],
      ['Google Workspace', 96.88, '3 מנויים שונים', 'Productivity'],
      ['Elementor', 145, '1000 אתרים + אחסון', 'Productivity'],
      ['OpenAI', 128, '2 מנויים שונים', 'AI'],
      ['Canva', 48, '', 'Creative'],
      ['Claude AI', 432, '3 מנויים שונים', 'AI'],
      ['Kapwing', 77, 'עריכת וידאו', 'Creative'],
      ['Monday', 790, 'כמעט ולא בשימוש', 'Productivity'],
      ['Zapier', 164, 'אוטומציות', 'Productivity'],
      ['אדמיניסטרציה', 2400, 'שרון ניהול משרד', 'Office'],
      ['ראיית חשבון', 2200, 'מנהל חשבונות חברה בע״מ', 'Office'],
      ['דמי כרטיס', 40, '', 'Office'],
      ['AdScale', 2757, '', 'Tools'],
      ['עיצוב סטודיו', 3000, 'העברה בנקאית', 'Creative'],
      ['קופי גיא אורן', 2000, 'העברה בנקאית', 'Creative'],
    ];
    for (const [name, amount, note, category] of seed) {
      await db.execute({
        sql: `INSERT INTO pr_expenses (name, amount, note, category) VALUES (?, ?, ?, ?)`,
        args: [name, amount, note, category],
      });
    }
    console.log(`[DB] Seeded ${seed.length} PPC retainer expenses`);
  }

  const forecastCount = await db.execute({
    sql: `SELECT COUNT(*) as c FROM pr_forecast`,
    args: [],
  });
  if (Number(forecastCount.rows[0]?.c ?? 0) === 0) {
    await db.execute({
      sql: `INSERT INTO pr_forecast (id, new_monthly, churn_monthly, raise_pct) VALUES (1, 0, 0, 0)`,
      args: [],
    });
  }
}
