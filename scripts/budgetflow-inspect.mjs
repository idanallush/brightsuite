import { neon } from '@neondatabase/serverless'
import { createClient } from '@libsql/client'

const PG_URL = process.env.DATABASE_URL_BUDGETFLOW
const TURSO_URL = process.env.TURSO_DATABASE_URL
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN
if (!PG_URL || !TURSO_URL || !TURSO_TOKEN) {
  throw new Error('Missing env: need DATABASE_URL_BUDGETFLOW + TURSO_DATABASE_URL + TURSO_AUTH_TOKEN')
}

const sql = neon(PG_URL)
const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })

console.log('--- Source (Neon Postgres) ---')
for (const t of ['clients', 'campaigns', 'budget_periods', 'changelog', 'sync_logs']) {
  try {
    const r = await sql.query(`SELECT count(*)::int AS c FROM ${t}`)
    console.log(`${t.padEnd(20)} ${r[0].c} rows`)
  } catch (e) { console.log(`${t.padEnd(20)} ERROR: ${e.message.split('\n')[0]}`) }
}

console.log('\n--- Target (Turso) ---')
for (const t of ['bf_clients', 'bf_campaigns', 'bf_budget_periods', 'bf_changelog', 'bf_sync_logs']) {
  try {
    const r = await turso.execute(`SELECT count(*) AS c FROM ${t}`)
    console.log(`${t.padEnd(20)} ${r.rows[0].c} rows`)
  } catch (e) { console.log(`${t.padEnd(20)} ERROR: ${e.message.split('\n')[0]}`) }
}

console.log('\n--- Source clients (all) ---')
const src = await sql.query(`SELECT id, name, slug, is_active FROM clients ORDER BY created_at DESC`)
for (const c of src) console.log(` ${String(c.slug).padEnd(25)} ${c.name} ${c.is_active ? 'ACTIVE' : 'inactive'} ${c.id}`)

console.log('\n--- Target bf_clients (all) ---')
const tgt = await turso.execute('SELECT id, name, slug, is_active FROM bf_clients ORDER BY created_at DESC')
for (const c of tgt.rows) console.log(` ${String(c.slug).padEnd(25)} ${c.name} ${c.is_active === 1 ? 'ACTIVE' : 'inactive'} ${c.id}`)

console.log('\n--- Slug overlap ---')
const srcSlugs = new Set(src.map((r) => r.slug))
const tgtSlugs = new Set(tgt.rows.map((r) => String(r.slug)))
const overlap = [...srcSlugs].filter((s) => tgtSlugs.has(s))
console.log(`source slugs: ${srcSlugs.size}, target slugs: ${tgtSlugs.size}, overlap: ${overlap.length}`)
if (overlap.length) console.log(` overlapping slugs: ${overlap.join(', ')}`)

// Also check share_token overlap (since it's also unique)
const srcTokens = (await sql.query('SELECT share_token FROM clients')).map((r) => r.share_token)
const tgtTokens = (await turso.execute('SELECT share_token FROM bf_clients')).rows.map((r) => String(r.share_token))
const tokenOverlap = srcTokens.filter((t) => tgtTokens.includes(t))
console.log(`share_token overlap: ${tokenOverlap.length}`)

// Also IDs (probably no overlap if both random uuids)
const srcIds = src.map((r) => r.id)
const tgtIds = tgt.rows.map((r) => String(r.id))
const idOverlap = srcIds.filter((id) => tgtIds.includes(id))
console.log(`client id overlap: ${idOverlap.length}`)
