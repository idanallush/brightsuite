import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getTurso } from '@/lib/db/turso';
import { buildBatchRegeneratePrompt } from '@/lib/writer/prompts';

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

// POST /api/writer/generate/regenerate-batch — regenerate all Google sections with keywords
export async function POST(request: NextRequest) {
  const {
    clientId,
    url,
    fetchedContent,
    additionalNotes,
    language,
    toneOfVoice,
    keywords,
    sections, // { headlines: [...], long_headlines: [...], descriptions: [...], long_description: [...] }
  } = await request.json();

  if (!keywords || keywords.length === 0 || !sections) {
    return NextResponse.json({ error: 'keywords and sections are required' }, { status: 400 });
  }

  try {
    const db = getTurso();

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

    const { systemPrompt, userMessage } = buildBatchRegeneratePrompt({
      language: language || 'he',
      toneOfVoice,
      clientProfile,
      winningAds,
      avoidNotes,
      url,
      fetchedContent,
      additionalNotes,
      keywords,
      sections,
    });

    const rawResponse = await callAI(systemPrompt, userMessage, 8192);
    const parsed = parseAIResponse(rawResponse);

    return NextResponse.json({ output: parsed.google || parsed });
  } catch (err) {
    console.error('Batch regenerate error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
