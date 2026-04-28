/**
 * BrightSuite DB Initialization Script
 * Run: npx tsx scripts/init-db.ts
 *
 * Creates all tables and the first admin user (Google OAuth — no password needed).
 */

import { createClient } from '@libsql/client';
import { join } from 'path';

const db = createClient(
  process.env.TURSO_DATABASE_URL
    ? { url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN }
    : { url: `file:${join(process.cwd(), 'data', 'brightsuite.db')}` }
);

async function init() {
  console.log('Initializing BrightSuite database...\n');

  // Shared tables (bs_ prefix)
  console.log('Creating shared tables...');
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS bs_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT,
      google_id TEXT UNIQUE,
      role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'viewer')),
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

    CREATE INDEX IF NOT EXISTS idx_bs_users_google_id ON bs_users(google_id);
    CREATE INDEX IF NOT EXISTS idx_bs_permissions_user ON bs_tool_permissions(user_id);
    CREATE INDEX IF NOT EXISTS idx_bs_audit_user ON bs_audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_bs_audit_tool ON bs_audit_log(tool_slug);
    CREATE INDEX IF NOT EXISTS idx_bs_audit_created ON bs_audit_log(created_at);
  `);

  // MultiWrite tables
  console.log('Creating MultiWrite tables...');
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      initial TEXT,
      color TEXT,
      logo TEXT,
      about TEXT,
      website TEXT,
      winning_ads TEXT,
      avoid_notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS generations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      brief TEXT,
      campaign TEXT,
      platforms TEXT,
      language TEXT DEFAULT 'he',
      created_by_user_id INTEGER REFERENCES bs_users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS generation_outputs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      generation_id INTEGER NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      section TEXT NOT NULL,
      content TEXT,
      version_label TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS copy_archive (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      platform TEXT DEFAULT '',
      notes TEXT,
      is_global INTEGER DEFAULT 0,
      created_by_user_id INTEGER REFERENCES bs_users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // BudgetFlow tables (bf_ prefix)
  console.log('Creating BudgetFlow tables...');
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS bf_clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      share_token TEXT UNIQUE DEFAULT (lower(hex(randomblob(16)))),
      is_active INTEGER DEFAULT 1,
      notes TEXT,
      meta_ad_account_id TEXT,
      google_customer_id TEXT,
      google_mcc_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bf_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES bf_clients(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      technical_name TEXT,
      platform TEXT NOT NULL CHECK (platform IN ('facebook', 'google')),
      campaign_type TEXT,
      ad_link TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped', 'scheduled')),
      start_date TEXT,
      end_date TEXT,
      notes TEXT,
      meta_campaign_id TEXT,
      actual_spend REAL,
      actual_spend_month TEXT,
      last_synced_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bf_budget_periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL REFERENCES bf_campaigns(id) ON DELETE CASCADE,
      daily_budget REAL NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bf_changelog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER REFERENCES bf_campaigns(id) ON DELETE SET NULL,
      client_id INTEGER REFERENCES bf_clients(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      description TEXT,
      old_value TEXT,
      new_value TEXT,
      performed_by TEXT,
      created_by_user_id INTEGER REFERENCES bs_users(id),
      performed_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_bf_campaigns_client ON bf_campaigns(client_id);
    CREATE INDEX IF NOT EXISTS idx_bf_budget_campaign ON bf_budget_periods(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_bf_changelog_campaign ON bf_changelog(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_bf_changelog_client ON bf_changelog(client_id);
  `);

  // Ads Hub tables (ah_ prefix)
  console.log('Creating Ads Hub tables...');
  await db.executeMultiple(`
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
      created_at TEXT DEFAULT (datetime('now'))
    );

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
    CREATE INDEX IF NOT EXISTS idx_cd_changes_client ON cd_campaign_changes(client_id, detected_at);
    CREATE INDEX IF NOT EXISTS idx_cd_changes_campaign ON cd_campaign_changes(campaign_id, detected_at);
    CREATE INDEX IF NOT EXISTS idx_cd_alerts_client_status ON cd_alerts(client_id, status, severity);
    CREATE INDEX IF NOT EXISTS idx_cd_views_user ON cd_user_views(user_id, scope);
  `);

  // Create admin user (will sign in via Google OAuth)
  console.log('\nCreating admin user...');
  const email = 'idan@b-bright.co.il';

  const existing = await db.execute({ sql: 'SELECT id FROM bs_users WHERE email = ?', args: [email] });

  let userId: number;
  if (existing.rows.length > 0) {
    userId = existing.rows[0].id as number;
    console.log(`   User already exists (id: ${userId})`);
  } else {
    const result = await db.execute({
      sql: 'INSERT INTO bs_users (email, name, password_hash, role) VALUES (?, ?, NULL, ?) RETURNING id',
      args: [email, 'עידן', 'admin'],
    });
    userId = result.rows[0].id as number;
    console.log(`   Created admin user: ${email} (id: ${userId})`);
  }

  // Grant all tool permissions
  const tools = ['ad-checker', 'budget', 'cpa', 'ads', 'writer', 'ads-hub', 'clients-dashboard'];
  for (const tool of tools) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO bs_tool_permissions (user_id, tool_slug, granted_by) VALUES (?, ?, ?)',
      args: [userId, tool, userId],
    });
  }
  console.log(`   Granted permissions: ${tools.join(', ')}`);

  console.log('\nDatabase initialized successfully!');
  console.log(`\nLogin: Sign in with Google using ${email}`);
}

init().catch(console.error);
