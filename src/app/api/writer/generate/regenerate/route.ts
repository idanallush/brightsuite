import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getTurso } from '@/lib/db/turso';
import { buildRegeneratePrompt } from '@/lib/writer/prompts';

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

// POST /api/writer/generate/regenerate — regenerate a single block
export async function POST(request: NextRequest) {
  const {
    clientId,
    url,
    fetchedContent,
    additionalNotes,
    language,
    toneOfVoice,
    platform,
    section,
    index,
    currentText,
    keywords,
  } = await request.json();

  if (!platform || !section) {
    return NextResponse.json({ error: 'platform and section are required' }, { status: 400 });
  }

  try {
    const db = getTurso();

    // Get client profile (optional)
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

    // Fetch archive examples
    let archiveExamples: Array<{ text: string; platform: string; notes: string }> = [];
    try {
      const archiveResult = clientId
        ? await db.execute({ sql: 'SELECT * FROM copy_archive WHERE client_id = ? OR is_global = 1 ORDER BY created_at DESC', args: [clientId] })
        : await db.execute('SELECT * FROM copy_archive WHERE is_global = 1 ORDER BY created_at DESC');
      if (archiveResult.rows.length > 0) {
        const matching = archiveResult.rows.filter((r) => r.platform === platform);
        const others = archiveResult.rows.filter((r) => r.platform !== platform);
        archiveExamples = [...matching, ...others].slice(0, 5).map((r) => ({
          text: r.text as string, platform: (r.platform as string) || '', notes: (r.notes as string) || '',
        }));
      }
    } catch { /* continue without archive */ }

    const { systemPrompt, userMessage } = buildRegeneratePrompt({
      language: language || 'he',
      toneOfVoice,
      clientProfile,
      winningAds,
      avoidNotes,
      archiveExamples,
      url,
      fetchedContent,
      additionalNotes,
      platform,
      section,
      currentText,
      keywords,
    });

    const rawResponse = await callAI(systemPrompt, userMessage, 1024);
    const parsed = parseAIResponse(rawResponse);

    return NextResponse.json({ item: parsed });
  } catch (err) {
    console.error('Regenerate error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
