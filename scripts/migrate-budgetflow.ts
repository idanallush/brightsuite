/**
 * Migrate BudgetFlow data from Neon PostgreSQL into BrightSuite SQLite.
 * Run: npx tsx scripts/migrate-budgetflow.ts
 *
 * Type conversions:
 *   PostgreSQL UUID → SQLite TEXT
 *   PostgreSQL NUMERIC → SQLite REAL
 *   PostgreSQL TIMESTAMP → SQLite TEXT (ISO format)
 *   PostgreSQL BOOLEAN → SQLite INTEGER (0/1)
 */

import postgres from 'postgres';
import { createClient } from '@libsql/client';
import { join } from 'path';

const DATABASE_URL =
  'postgresql://neondb_owner:npg_dhQvEyZ64fNM@ep-gentle-waterfall-agvtbniq-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const sql = postgres(DATABASE_URL, { ssl: 'require' });

const dest = createClient({
  url: `file:${join(process.cwd(), 'data', 'brightsuite.db')}`,
});

function toIso(ts: Date | string | null): string | null {
  if (!ts) return null;
  return new Date(ts).toISOString();
}

function toBool(v: boolean | null | undefined): number {
  return v ? 1 : 0;
}

function toReal(v: string | number | null): number | null {
  if (v === null || v === undefined) return null;
  return Number(v);
}

async function migrate() {
  console.log('Connecting to Neon PostgreSQL...');

  // Test connection
  const testResult = await sql`SELECT 1 as ok`;
  if (!testResult[0]?.ok) throw new Error('Cannot connect to Neon');
  console.log('Connected!\n');

  // --- Clear existing BudgetFlow data ---
  console.log('Clearing existing BudgetFlow data in BrightSuite...');
  await dest.executeMultiple(`
    DELETE FROM bf_changelog;
    DELETE FROM bf_budget_periods;
    DELETE FROM bf_campaigns;
    DELETE FROM bf_clients;
  `);
  await dest.execute({
    sql: "DELETE FROM sqlite_sequence WHERE name IN ('bf_clients', 'bf_campaigns', 'bf_budget_periods', 'bf_changelog')",
    args: [],
  });

  // --- Clients ---
  const pgClients = await sql`SELECT * FROM clients ORDER BY created_at`;
  console.log(`Found ${pgClients.length} clients in Neon`);

  // Map Postgres UUID -> SQLite autoincrement ID
  const clientIdMap = new Map<string, number>();

  for (const c of pgClients) {
    const result = await dest.execute({
      sql: `INSERT INTO bf_clients (name, slug, share_token, is_active, notes, meta_ad_account_id, google_customer_id, google_mcc_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        c.name,
        c.slug,
        c.share_token,
        toBool(c.is_active),
        c.notes || null,
        c.meta_ad_account_id || null,
        c.google_customer_id || null,
        c.google_mcc_id || null,
        toIso(c.created_at) || new Date().toISOString(),
      ],
    });
    const newId = Number(result.lastInsertRowid);
    clientIdMap.set(c.id, newId);
    console.log(`  Client: ${c.name} (${c.id} -> ${newId})`);
  }

  // --- Campaigns ---
  const pgCampaigns = await sql`SELECT * FROM campaigns ORDER BY created_at`;
  console.log(`\nFound ${pgCampaigns.length} campaigns in Neon`);

  const campaignIdMap = new Map<string, number>();

  for (const camp of pgCampaigns) {
    const newClientId = clientIdMap.get(camp.client_id);
    if (!newClientId) {
      console.log(`  Skipping campaign "${camp.name}": no mapped client ${camp.client_id}`);
      continue;
    }

    const result = await dest.execute({
      sql: `INSERT INTO bf_campaigns (client_id, name, technical_name, platform, campaign_type, ad_link, status, start_date, end_date, notes, meta_campaign_id, actual_spend, actual_spend_month, last_synced_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        newClientId,
        camp.name,
        camp.technical_name || null,
        camp.platform,
        camp.campaign_type || null,
        camp.ad_link || null,
        camp.status || 'active',
        camp.start_date || null,
        camp.end_date || null,
        camp.notes || null,
        camp.meta_campaign_id || null,
        toReal(camp.actual_spend),
        camp.actual_spend_month || null,
        toIso(camp.last_synced_at),
        toIso(camp.created_at) || new Date().toISOString(),
      ],
    });
    const newId = Number(result.lastInsertRowid);
    campaignIdMap.set(camp.id, newId);
    console.log(`  Campaign: ${camp.name} [${camp.platform}] (${camp.id} -> ${newId})`);
  }

  // --- Budget Periods ---
  const pgPeriods = await sql`SELECT * FROM budget_periods ORDER BY created_at`;
  console.log(`\nFound ${pgPeriods.length} budget periods in Neon`);

  let periodCount = 0;
  for (const bp of pgPeriods) {
    const newCampId = campaignIdMap.get(bp.campaign_id);
    if (!newCampId) continue;

    await dest.execute({
      sql: `INSERT INTO bf_budget_periods (campaign_id, daily_budget, start_date, end_date, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        newCampId,
        toReal(bp.daily_budget),
        bp.start_date || null,
        bp.end_date || null,
        null, // created_by was a UUID reference - skip for now
        toIso(bp.created_at) || new Date().toISOString(),
      ],
    });
    periodCount++;
  }
  console.log(`  Inserted ${periodCount} budget periods`);

  // --- Changelog ---
  const pgChangelog = await sql`SELECT * FROM changelog ORDER BY performed_at`;
  console.log(`\nFound ${pgChangelog.length} changelog entries in Neon`);

  let changelogCount = 0;
  for (const cl of pgChangelog) {
    const newCampId = campaignIdMap.get(cl.campaign_id);
    if (!newCampId) continue;

    // Find client_id from campaign
    const campRow = await dest.execute({
      sql: 'SELECT client_id FROM bf_campaigns WHERE id = ?',
      args: [newCampId],
    });
    const clientId = campRow.rows.length > 0 ? campRow.rows[0].client_id : null;

    await dest.execute({
      sql: `INSERT INTO bf_changelog (campaign_id, client_id, action, description, old_value, new_value, performed_by, performed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        newCampId,
        clientId,
        cl.action,
        cl.description || '',
        cl.old_value || null,
        cl.new_value || null,
        cl.performed_by || 'מערכת',
        toIso(cl.performed_at) || new Date().toISOString(),
      ],
    });
    changelogCount++;
  }
  console.log(`  Inserted ${changelogCount} changelog entries`);

  // Cleanup
  await sql.end();
  console.log('\n✅ BudgetFlow migration complete!');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  sql.end();
  process.exit(1);
});
