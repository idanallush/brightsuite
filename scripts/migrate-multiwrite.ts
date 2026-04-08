/**
 * Migrate MultiWrite data from the original local SQLite DB into BrightSuite.
 * Run: npx tsx scripts/migrate-multiwrite.ts
 */

import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';
import { join } from 'path';

const SOURCE_PATH = '/Users/idan/Desktop/New Claude code/projects/work/Tools/multiwrite/server/multiwrite.db';

const dest = createClient({
  url: `file:${join(process.cwd(), 'data', 'brightsuite.db')}`,
});

async function migrate() {
  console.log('Reading source MultiWrite DB...');
  const src = new Database(SOURCE_PATH, { readonly: true });

  // --- Clients ---
  const clients = src.prepare('SELECT * FROM clients').all() as any[];
  console.log(`Found ${clients.length} clients`);

  // Check if clients already exist
  const existing = await dest.execute('SELECT COUNT(*) as cnt FROM clients');
  const existingCount = Number(existing.rows[0].cnt);

  if (existingCount > 0) {
    console.log(`BrightSuite already has ${existingCount} clients. Clearing MultiWrite tables first...`);
    await dest.executeMultiple(`
      DELETE FROM generation_outputs;
      DELETE FROM generations;
      DELETE FROM copy_archive;
      DELETE FROM clients;
    `);
    // Reset autoincrement
    await dest.execute({
      sql: "DELETE FROM sqlite_sequence WHERE name IN ('clients', 'generations', 'generation_outputs', 'copy_archive')",
      args: [],
    });
  }

  // Build ID mapping (source id -> new id)
  const clientIdMap = new Map<number, number>();

  for (const c of clients) {
    const result = await dest.execute({
      sql: `INSERT INTO clients (name, initial, color, logo, about, website, winning_ads, avoid_notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        c.name,
        c.initial || c.name?.[0] || '?',
        c.color || 'bg-purple-500',
        c.logo || '',
        c.about || '',
        c.website || '',
        c.winning_ads || '',
        c.avoid_notes || '',
        c.created_at || new Date().toISOString(),
        c.updated_at || new Date().toISOString(),
      ],
    });
    clientIdMap.set(c.id, Number(result.lastInsertRowid));
    console.log(`  Client: ${c.name} (${c.id} -> ${result.lastInsertRowid})`);
  }

  // --- Generations ---
  const generations = src.prepare('SELECT * FROM generations').all() as any[];
  console.log(`\nFound ${generations.length} generations`);

  const genIdMap = new Map<number, number>();

  for (const g of generations) {
    const newClientId = clientIdMap.get(g.client_id);
    if (!newClientId) {
      console.log(`  Skipping generation ${g.id}: no mapped client_id=${g.client_id}`);
      continue;
    }
    const result = await dest.execute({
      sql: `INSERT INTO generations (client_id, brief, campaign, platforms, language, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        newClientId,
        g.brief || '',
        g.campaign || '',
        g.platforms || '[]',
        g.language || 'he',
        g.created_at || new Date().toISOString(),
      ],
    });
    genIdMap.set(g.id, Number(result.lastInsertRowid));
    console.log(`  Generation: ${g.id} -> ${result.lastInsertRowid} (client ${newClientId})`);
  }

  // --- Generation Outputs ---
  const outputs = src.prepare('SELECT * FROM generation_outputs').all() as any[];
  console.log(`\nFound ${outputs.length} generation outputs`);

  let outputCount = 0;
  for (const o of outputs) {
    const newGenId = genIdMap.get(o.generation_id);
    if (!newGenId) {
      continue;
    }
    await dest.execute({
      sql: `INSERT INTO generation_outputs (generation_id, platform, section, content, version_label, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        newGenId,
        o.platform || '',
        o.section || '',
        o.content || '',
        o.version_label || null,
        o.created_at || new Date().toISOString(),
      ],
    });
    outputCount++;
  }
  console.log(`  Inserted ${outputCount} generation outputs`);

  // --- Copy Archive ---
  const copies = src.prepare('SELECT * FROM copy_archive').all() as any[];
  console.log(`\nFound ${copies.length} copy archive entries`);

  for (const c of copies) {
    const newClientId = c.client_id ? clientIdMap.get(c.client_id) : null;
    await dest.execute({
      sql: `INSERT INTO copy_archive (client_id, text, platform, notes, is_global, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        newClientId || null,
        c.text,
        c.platform || '',
        c.notes || '',
        c.is_global || 0,
        c.created_at || new Date().toISOString(),
      ],
    });
  }
  console.log(`  Inserted ${copies.length} copy archive entries`);

  src.close();
  console.log('\n✅ MultiWrite migration complete!');
}

migrate().catch(console.error);
