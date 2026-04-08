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
  const tools = ['ad-checker', 'budget', 'cpa', 'ads', 'writer'];
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
