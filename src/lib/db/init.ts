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
      cpc REAL,
      ctr REAL,
      cpl REAL,
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

  console.log('[DB] All tables and indexes created successfully');
}
