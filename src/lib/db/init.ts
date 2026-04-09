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

    CREATE INDEX IF NOT EXISTS idx_bs_sessions_user ON bs_tool_permissions(user_id);
    CREATE INDEX IF NOT EXISTS idx_bs_audit_user ON bs_audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_bs_audit_tool ON bs_audit_log(tool_slug);
    CREATE INDEX IF NOT EXISTS idx_bs_audit_created ON bs_audit_log(created_at);
  `);

  console.log('[DB] All tables and indexes created successfully');
}
