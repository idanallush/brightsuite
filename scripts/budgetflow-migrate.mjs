// Migration: copy all BudgetFlow data from Neon Postgres -> Brightsuite Turso (bf_* tables).
// The Turso schema uses INTEGER PRIMARY KEY AUTOINCREMENT for ids, while the source uses UUIDs.
// We let SQLite assign new integer ids on insert and build uuid->int maps to translate FKs.
//
// Setup (one-time):
//   npm install --no-save @neondatabase/serverless
//
// Usage:
//   set -a
//   . <(grep '^DATABASE_URL=' ../budgetflow/.env.local | sed 's/DATABASE_URL=/DATABASE_URL_BUDGETFLOW=/')
//   . <(grep -E '^TURSO_(DATABASE_URL|AUTH_TOKEN)=' .env.local)
//   set +a
//   node scripts/budgetflow-migrate.mjs                # dry run
//   node scripts/budgetflow-migrate.mjs --apply        # apply (with backup)

import { neon } from '@neondatabase/serverless'
import { createClient } from '@libsql/client'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const APPLY = process.argv.includes('--apply')
const SKIP_BACKUP = process.argv.includes('--skip-backup') // for retry after a failed run

const PG_URL = process.env.DATABASE_URL_BUDGETFLOW
const TURSO_URL = process.env.TURSO_DATABASE_URL
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN
if (!PG_URL || !TURSO_URL || !TURSO_TOKEN) {
  throw new Error('Missing env: DATABASE_URL_BUDGETFLOW + TURSO_DATABASE_URL + TURSO_AUTH_TOKEN')
}

const sql = neon(PG_URL)
const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })

const log = (...a) => console.log('[migrate]', ...a)

const toBool = (v) => (v ? 1 : 0)
const toIso = (v) => {
  if (v == null) return null
  if (v instanceof Date) return v.toISOString()
  return String(v)
}
const toDateStr = (v) => {
  if (v == null) return null
  if (v instanceof Date) return v.toISOString().split('T')[0]
  return String(v)
}
const toNum = (v) => (v == null ? null : Number(v))

// ---------- bf_sync_logs schema ----------
async function ensureSyncLogsTable() {
  // Match the existing INTEGER style of other bf_* tables for consistency
  await turso.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS bf_sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER REFERENCES bf_clients(id) ON DELETE CASCADE,
        platform TEXT NOT NULL,
        status TEXT NOT NULL,
        created_count INTEGER NOT NULL DEFAULT 0,
        updated_count INTEGER NOT NULL DEFAULT 0,
        error TEXT,
        duration_ms INTEGER,
        triggered_by TEXT NOT NULL DEFAULT 'manual',
        synced_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    { sql: `CREATE INDEX IF NOT EXISTS idx_bf_sync_logs_client_id ON bf_sync_logs(client_id)`, args: [] },
    { sql: `CREATE INDEX IF NOT EXISTS idx_bf_sync_logs_synced_at ON bf_sync_logs(synced_at)`, args: [] },
  ])
}

async function backupTarget() {
  const tables = ['bf_clients', 'bf_campaigns', 'bf_budget_periods', 'bf_changelog', 'bf_sync_logs']
  const backup = {}
  for (const t of tables) {
    try {
      const r = await turso.execute(`SELECT * FROM ${t}`)
      backup[t] = r.rows
      log(`backed up ${r.rows.length} from ${t}`)
    } catch (e) {
      backup[t] = { error: e.message }
      log(`could not back up ${t}: ${e.message.split('\n')[0]}`)
    }
  }
  const path = `./scripts/backups/turso-bf-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(backup, null, 2))
  log(`backup saved: ${path}`)
}

async function wipeTarget() {
  // Order matters: child tables first (FK)
  await turso.execute('DELETE FROM bf_sync_logs').catch(() => {})
  await turso.execute('DELETE FROM bf_changelog')
  await turso.execute('DELETE FROM bf_budget_periods')
  await turso.execute('DELETE FROM bf_campaigns')
  await turso.execute('DELETE FROM bf_clients')
  // Reset autoincrement counters so new ids start from 1
  await turso.execute("DELETE FROM sqlite_sequence WHERE name LIKE 'bf_%'").catch(() => {})
  log('wiped all bf_* tables and reset autoincrement')
}

// ---------- copy clients (build uuid->int map) ----------
async function copyClients() {
  const rows = await sql.query('SELECT * FROM clients ORDER BY created_at ASC')
  const clientMap = new Map() // uuid -> int id
  for (const c of rows) {
    const r = await turso.execute({
      sql: `INSERT INTO bf_clients
        (name, slug, share_token, is_active, notes, meta_ad_account_id, google_customer_id, google_mcc_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        c.name,
        c.slug,
        c.share_token,
        toBool(c.is_active),
        c.notes ?? null,
        c.meta_ad_account_id ?? null,
        c.google_customer_id ?? null,
        c.google_mcc_id ?? null,
        toIso(c.created_at),
      ],
    })
    const newId = Number(r.lastInsertRowid)
    clientMap.set(c.id, newId)
  }
  log(`copied ${rows.length} clients`)
  return clientMap
}

async function copyCampaigns(clientMap) {
  const rows = await sql.query('SELECT * FROM campaigns ORDER BY created_at ASC')
  const campaignMap = new Map() // uuid -> int id
  let skipped = 0
  for (const c of rows) {
    const newClientId = clientMap.get(c.client_id)
    if (!newClientId) {
      skipped++
      continue
    }
    const r = await turso.execute({
      sql: `INSERT INTO bf_campaigns
        (client_id, name, technical_name, platform, campaign_type, ad_link, status,
         start_date, end_date, notes, meta_campaign_id, actual_spend, actual_spend_month, last_synced_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        newClientId,
        c.name,
        c.technical_name ?? null,
        c.platform,
        c.campaign_type ?? null,
        c.ad_link ?? null,
        c.status,
        toDateStr(c.start_date),
        toDateStr(c.end_date),
        c.notes ?? null,
        c.meta_campaign_id ?? null,
        toNum(c.actual_spend) ?? 0,
        c.actual_spend_month ?? null,
        toIso(c.last_synced_at),
        toIso(c.created_at),
      ],
    })
    campaignMap.set(c.id, Number(r.lastInsertRowid))
  }
  log(`copied ${rows.length - skipped} campaigns${skipped ? ` (${skipped} skipped)` : ''}`)
  return campaignMap
}

async function copyBudgetPeriods(campaignMap) {
  const rows = await sql.query('SELECT * FROM budget_periods ORDER BY created_at ASC')
  let copied = 0, skipped = 0
  for (const p of rows) {
    const newCampaignId = campaignMap.get(p.campaign_id)
    if (!newCampaignId) {
      skipped++
      continue
    }
    await turso.execute({
      sql: `INSERT INTO bf_budget_periods
        (campaign_id, daily_budget, start_date, end_date, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        newCampaignId,
        toNum(p.daily_budget),
        toDateStr(p.start_date),
        toDateStr(p.end_date),
        // created_by was a UUID FK to team_members in source; we don't have that mapping in target,
        // so set null (the target column is INTEGER and brightsuite has its own user system)
        null,
        toIso(p.created_at),
      ],
    })
    copied++
  }
  log(`copied ${copied} budget_periods${skipped ? ` (${skipped} skipped)` : ''}`)
}

async function copyChangelog(campaignMap) {
  const rows = await sql.query('SELECT * FROM changelog ORDER BY performed_at ASC')
  let copied = 0, skipped = 0
  for (const e of rows) {
    const newCampaignId = campaignMap.get(e.campaign_id)
    if (!newCampaignId) {
      skipped++
      continue
    }
    await turso.execute({
      sql: `INSERT INTO bf_changelog
        (campaign_id, action, description, old_value, new_value, performed_by, performed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        newCampaignId,
        e.action,
        e.description,
        e.old_value ?? null,
        e.new_value ?? null,
        e.performed_by ?? 'מערכת',
        toIso(e.performed_at),
      ],
    })
    copied++
  }
  log(`copied ${copied} changelog entries${skipped ? ` (${skipped} skipped)` : ''}`)
}

async function copySyncLogs(clientMap) {
  let rows = []
  try {
    rows = await sql.query('SELECT * FROM sync_logs ORDER BY synced_at ASC')
  } catch (e) {
    log(`sync_logs not in source (${e.message.split('\n')[0]}); skipping`)
    return
  }
  let copied = 0, skipped = 0
  for (const r of rows) {
    const newClientId = r.client_id ? clientMap.get(r.client_id) : null
    if (r.client_id && !newClientId) {
      skipped++
      continue
    }
    await turso.execute({
      sql: `INSERT INTO bf_sync_logs
        (client_id, platform, status, created_count, updated_count, error, duration_ms, triggered_by, synced_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        newClientId,
        r.platform,
        r.status,
        r.created_count ?? 0,
        r.updated_count ?? 0,
        r.error ?? null,
        r.duration_ms ?? null,
        r.triggered_by ?? 'manual',
        toIso(r.synced_at),
      ],
    })
    copied++
  }
  log(`copied ${copied} sync_logs${skipped ? ` (${skipped} skipped)` : ''}`)
}

async function verify() {
  console.log('\n=== verify ===')
  const tables = [
    ['clients', 'bf_clients'],
    ['campaigns', 'bf_campaigns'],
    ['budget_periods', 'bf_budget_periods'],
    ['changelog', 'bf_changelog'],
    ['sync_logs', 'bf_sync_logs'],
  ]
  for (const [src, tgt] of tables) {
    const s = (await sql.query(`SELECT count(*)::int AS c FROM ${src}`))[0].c
    const t = Number((await turso.execute(`SELECT count(*) AS c FROM ${tgt}`)).rows[0].c)
    const match = s === t ? 'OK' : `Δ=${s - t}`
    console.log(`${tgt.padEnd(20)} source=${s} target=${t} ${match}`)
  }
}

// ---------- main ----------
log(`mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
await ensureSyncLogsTable()

if (!APPLY) {
  log('dry-run; rerun with --apply to actually run')
  process.exit(0)
}

if (!SKIP_BACKUP) await backupTarget()
await wipeTarget()
const clientMap = await copyClients()
const campaignMap = await copyCampaigns(clientMap)
await copyBudgetPeriods(campaignMap)
await copyChangelog(campaignMap)
await copySyncLogs(clientMap)
await verify()
log('done.')
