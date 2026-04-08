import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import Anthropic from '@anthropic-ai/sdk';
import { requireApiAuth } from '@/lib/auth/require-auth-api';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const EXTRACTION_PROMPT = `You are a marketing analyst. Analyze this webpage content and extract a structured brief for an ad copywriter.

Return ONLY a valid JSON object with these fields:
{
  "business_name": "Name of the business or brand",
  "business_type": "Type of business (e.g. SaaS, e-commerce, clinic, restaurant)",
  "product_or_service": "What is being sold or offered",
  "target_audience": "Who is the ideal customer",
  "unique_selling_points": ["USP 1", "USP 2", "USP 3"],
  "pain_points": ["Pain point the product solves 1", "Pain point 2"],
  "offers_and_promotions": "Any current offers, discounts, or promotions mentioned",
  "social_proof": "Testimonials, reviews, numbers, awards mentioned",
  "tone_of_voice": "The tone used on the site (e.g. professional, casual, luxury)",
  "key_phrases": ["Important phrases or slogans from the site"],
  "call_to_action": "The main CTA on the page"
}

If a field has no data, use an empty string or empty array. Return ONLY valid JSON. No markdown, no code blocks, no explanation.`;

// POST /api/writer/fetch-url — extract text content from a URL + AI analysis
export async function POST(request: NextRequest) {
  const { error } = await requireApiAuth();
  if (error) return error;

  const { url } = await request.json();
  if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 });

  try {
    // ── Step 1: Cheerio scrape ──
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MultiWrite/1.0)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch URL: ${response.status}` }, { status: 400 });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove script, style, nav, footer, header elements
    $('script, style, nav, footer, header, iframe, noscript').remove();

    // Extract useful text
    const title = $('title').text().trim();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const h1 = $('h1').first().text().trim();
    const h2s = $('h2').map((_, el) => $(el).text().trim()).get().slice(0, 5);

    // Get main content text (more generous limit for AI analysis)
    const bodyText = $('main, article, [role="main"], .content, #content, body')
      .first()
      .text()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000);

    const raw = { title, metaDescription, h1, h2s, bodyText };

    // ── Step 2: AI analysis ──
    let analyzed = null;
    try {
      if (process.env.ANTHROPIC_API_KEY) {
        const rawText = [
          title && `Title: ${title}`,
          metaDescription && `Meta Description: ${metaDescription}`,
          h1 && `Main Heading: ${h1}`,
          h2s.length && `Sub Headings: ${h2s.join(' | ')}`,
          bodyText && `Page Content: ${bodyText}`,
        ].filter(Boolean).join('\n');

        const aiResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          temperature: 0.3,
          system: EXTRACTION_PROMPT,
          messages: [{ role: 'user', content: rawText }],
        });

        let aiText = (aiResponse.content[0] as { type: 'text'; text: string }).text.trim();
        // Strip markdown fences if present
        if (aiText.startsWith('```')) {
          aiText = aiText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        analyzed = JSON.parse(aiText);
      }
    } catch (aiErr) {
      console.error('AI analysis failed (returning raw only):', (aiErr as Error).message);
      // Continue without AI analysis — raw data still returned
    }

    return NextResponse.json({ raw, analyzed });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
