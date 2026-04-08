import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getTurso } from '@/lib/db/turso';
import { buildPrompt } from '@/lib/writer/prompts';

const toNum = (v: unknown): number => typeof v === 'bigint' ? Number(v) : v as number;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function callAI(systemPrompt: string, userMessage: string, maxTokens = 8192) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    temperature: 0.7,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  return (response.content[0] as { type: 'text'; text: string }).text;
}

function parseAIResponse(raw: string) {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return JSON.parse(cleaned);
}

// POST /api/writer/generate
export async function POST(request: NextRequest) {
  const {
    clientId,
    url,
    fetchedContent,
    additionalNotes,
    language,
    platforms,
    toneOfVoice,
  } = await request.json();

  if (!platforms || platforms.length === 0) {
    return NextResponse.json({ error: 'platforms are required' }, { status: 400 });
  }

  try {
    const db = getTurso();

    // Get client profile from database (optional)
    let clientProfile = '';
    let winningAds = '';
    let avoidNotes = '';
    if (clientId) {
      const clientResult = await db.execute({ sql: 'SELECT * FROM clients WHERE id = ?', args: [clientId] });
      const client = clientResult.rows[0];
      if (client) {
        clientProfile = `${client.name}: ${client.about}`;
        winningAds = (client.winning_ads as string) || '';
        avoidNotes = (client.avoid_notes as string) || '';
      }
    }

    // Fetch archive examples for this client (client-specific + global, max 5, prefer matching platforms)
    let archiveExamples: Array<{ text: string; platform: string; notes: string }> = [];
    try {
      const archiveResult = clientId
        ? await db.execute({ sql: 'SELECT * FROM copy_archive WHERE client_id = ? OR is_global = 1 ORDER BY created_at DESC', args: [clientId] })
        : await db.execute('SELECT * FROM copy_archive WHERE is_global = 1 ORDER BY created_at DESC');
      if (archiveResult.rows.length > 0) {
        // Sort: platform-matching first, then the rest, limit to 5
        const matching = archiveResult.rows.filter((r) => r.platform && platforms.includes(r.platform));
        const others = archiveResult.rows.filter((r) => !r.platform || !platforms.includes(r.platform));
        archiveExamples = [...matching, ...others].slice(0, 5).map((r) => ({
          text: r.text as string,
          platform: (r.platform as string) || '',
          notes: (r.notes as string) || '',
        }));
      }
    } catch { /* archive fetch failed — continue without it */ }

    // Build prompt
    const { systemPrompt, userMessage } = buildPrompt({
      language: language || 'he',
      platforms,
      clientProfile,
      winningAds,
      avoidNotes,
      archiveExamples,
      url,
      fetchedContent,
      additionalNotes,
      toneOfVoice,
    });

    // Call AI
    const rawResponse = await callAI(systemPrompt, userMessage);
    const parsed = parseAIResponse(rawResponse);

    // Save to database
    const genResult = await db.execute({
      sql: 'INSERT INTO generations (client_id, brief, campaign, platforms, language) VALUES (?, ?, ?, ?, ?)',
      args: [clientId || null, url || '', additionalNotes || '', JSON.stringify(platforms), language || 'he'],
    });

    const generationId = toNum(genResult.lastInsertRowid);

    // Save outputs per platform/section using batch
    const batchStmts: Array<{ sql: string; args: (string | number | null)[] }> = [];
    for (const [platform, sections] of Object.entries(parsed)) {
      for (const [section, items] of Object.entries(sections as Record<string, unknown[]>)) {
        if (Array.isArray(items)) {
          for (const item of items) {
            batchStmts.push({
              sql: 'INSERT INTO generation_outputs (generation_id, platform, section, content, version_label) VALUES (?, ?, ?, ?, ?)',
              args: [generationId, platform, section, JSON.stringify(item), ((item as Record<string, unknown>).version_type as string) || ((item as Record<string, unknown>).badge as string) || null],
            });
          }
        }
      }
    }
    if (batchStmts.length > 0) {
      await db.batch(batchStmts);
    }

    return NextResponse.json({
      generationId,
      output: parsed,
    });
  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
