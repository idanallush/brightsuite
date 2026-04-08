import { getTurso } from '@/lib/db/turso';

/**
 * Initialize all BudgetFlow tables in Turso (SQLite).
 * Uses bf_ prefix to avoid conflicts with other BrightSuite tables.
 * Safe to call multiple times — uses CREATE TABLE IF NOT EXISTS.
 */
export async function initBudgetFlowTables(): Promise<void> {
  const db = getTurso();

  await db.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS bf_clients (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        share_token TEXT UNIQUE NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        notes TEXT,
        meta_ad_account_id TEXT,
        google_customer_id TEXT,
        google_mcc_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_bf_clients_slug ON bf_clients(slug)`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_bf_clients_share_token ON bf_clients(share_token)`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS bf_campaigns (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        client_id TEXT NOT NULL REFERENCES bf_clients(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        technical_name TEXT,
        platform TEXT NOT NULL,
        campaign_type TEXT,
        ad_link TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        start_date TEXT NOT NULL,
        end_date TEXT,
        notes TEXT,
        meta_campaign_id TEXT,
        actual_spend REAL DEFAULT 0,
        actual_spend_month TEXT,
        last_synced_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_bf_campaigns_client_id ON bf_campaigns(client_id)`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_bf_campaigns_platform ON bf_campaigns(platform)`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_bf_campaigns_status ON bf_campaigns(status)`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_bf_campaigns_meta_campaign_id ON bf_campaigns(meta_campaign_id)`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS bf_budget_periods (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        campaign_id TEXT NOT NULL REFERENCES bf_campaigns(id) ON DELETE CASCADE,
        daily_budget REAL NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_bf_budget_periods_campaign_id ON bf_budget_periods(campaign_id)`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_bf_budget_periods_dates ON bf_budget_periods(start_date, end_date)`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS bf_changelog (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        campaign_id TEXT NOT NULL REFERENCES bf_campaigns(id) ON DELETE CASCADE,
        client_id TEXT,
        action TEXT NOT NULL,
        description TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        performed_by TEXT NOT NULL DEFAULT 'מערכת',
        performed_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_bf_changelog_campaign_id ON bf_changelog(campaign_id)`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_bf_changelog_performed_at ON bf_changelog(performed_at)`,
      args: [],
    },
  ]);
}
