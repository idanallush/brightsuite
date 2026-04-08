interface BuildPromptInputs {
  language: string;
  platforms: string[];
  clientProfile: string;
  winningAds: string;
  avoidNotes: string;
  archiveExamples: Array<{ text: string; platform?: string; notes?: string }>;
  url: string;
  fetchedContent: string;
  additionalNotes: string;
  toneOfVoice: string;
}

interface BuildRegeneratePromptInputs {
  language: string;
  toneOfVoice: string;
  clientProfile: string;
  winningAds: string;
  avoidNotes: string;
  archiveExamples: Array<{ text: string; platform?: string; notes?: string }>;
  url: string;
  fetchedContent: string;
  additionalNotes: string;
  platform: string;
  section: string;
  currentText: string;
  keywords?: string[];
}

interface BuildBatchRegeneratePromptInputs {
  language: string;
  toneOfVoice: string;
  clientProfile: string;
  winningAds: string;
  avoidNotes: string;
  url: string;
  fetchedContent: string;
  additionalNotes: string;
  keywords: string[];
  sections: Record<string, unknown[]>;
}

const toneDescriptions: Record<string, string> = {
  professional: 'Professional and authoritative — use formal language, data-driven arguments, and expert positioning.',
  warm: 'Warm and empathetic — speak to emotions, show understanding of the audience\'s struggles, and use caring language.',
  humorous: 'Humorous and witty — use clever wordplay, light jokes, and an entertaining tone while still driving conversions.',
  dramatic: 'Dramatic and bold — use powerful language, strong statements, and create a sense of significance and urgency.',
  inspirational: 'Inspirational and motivating — paint a vision of transformation, use aspirational language, and empower the reader.',
  direct: 'Direct and to-the-point — no fluff, no embellishment. Short sentences, clear benefits, immediate calls to action.',
}

export function buildPrompt(inputs: BuildPromptInputs) {
  const {
    language,
    platforms,
    clientProfile,
    winningAds,
    avoidNotes,
    archiveExamples,
    url,
    fetchedContent,
    additionalNotes,
    toneOfVoice,
  } = inputs

  const lang = language === 'he' ? 'Hebrew' : 'English'
  const platformList = platforms.join(', ')

  // Build tone instruction
  const toneInstruction = toneOfVoice && toneDescriptions[toneOfVoice]
    ? `\n\nTONE OF VOICE: ${toneDescriptions[toneOfVoice]}\nApply this tone consistently across ALL copy variations.`
    : ''

  // Build platform-specific output instructions
  const platformInstructions: string[] = []

  if (platforms.includes('facebook')) {
    platformInstructions.push(`
FACEBOOK ADS PRIMARY TEXT RULES:
- primary_text: exactly 5 items. Mark version_type as "unique", "variant", or "remarketing".
- Each primary_text MUST be 6-10 lines with line breaks (\\n) between sections.
- Structure: HOOK (1-2 lines that stop the scroll) → BODY (3-5 lines with benefits, proof, details) → CTA (1-2 lines with urgency)
- Version 1 (unique): Emotional/aspirational hook — speak to dreams and desires
- Version 2 (unique): Pain point hook — call out a problem the audience has, then present the solution
- Version 3 (variant): Rewrite of Version 1 with different wording but same emotional angle
- Version 4 (variant): Rewrite of Version 2 with different wording but same pain angle
- Version 5 (remarketing): Speak directly to someone who already visited. Be personal. Use phrases like "שמנו לב שהתעניינת..." or "חזרת אלינו? מעולה!" — shorter, more direct, assumes familiarity
- Use line breaks (\\n) between hook, body, and CTA for readability
- Include relevant emojis sparingly (1-3 per ad, at the start of lines)
- Write like a human, not a robot. Be conversational but professional.
- Every ad must include at least one concrete detail (number, timeframe, percentage, guarantee)
- NEVER use cliches like "אל תפספסו", "הזדמנות חד פעמית" without backing them up with WHY

FACEBOOK HEADLINES (30 chars max):
- headlines: exactly 5 items. Short, punchy, action-oriented.
- Include the brand name in at least 2 headlines.
- Mix between benefit-focused and curiosity-driven.

FACEBOOK CTA HEADLINES (15 chars max):
- cta_headlines: exactly 5 items. Direct action phrases.
- Mix: "הזמינו עכשיו", "לפרטים נוספים", "קבלו הנחה", etc.

FACEBOOK DESCRIPTION (30 chars max):
- description: exactly 1 item. Concise brand/offer summary.`)
  }

  if (platforms.includes('google')) {
    platformInstructions.push(`
GOOGLE ADS HEADLINES (30 chars max, 20 variations):
- headlines: exactly 20 items. Must include keywords from the URL content.
- Mix: brand name, benefits, offers, calls to action, questions.
- At least 3 should include numbers or percentages.

GOOGLE LONG HEADLINES (90 chars max, 5 variations):
- long_headlines: exactly 5 items. Expanded versions that combine benefit + brand + CTA.

GOOGLE DESCRIPTIONS (90 chars max, 5 variations):
- descriptions: exactly 5 items. Concise value propositions with concrete details.

GOOGLE LONG DESCRIPTION (180 chars max, 1 variation):
- long_description: exactly 1 item. Comprehensive pitch covering brand + product + benefits + CTA.`)
  }

  if (platforms.includes('copy-design') || platforms.includes('design')) {
    platformInstructions.push(`
DESIGN COPY (key "design" in JSON):
- visual_ideas: exactly 5 items. Describe scenes a designer can create, including mood, colors, composition. Be specific about layout and text placement.
- strong_headlines: exactly 5 items. Max 7 words each. Big, bold, memorable. Include word_count.
- sub_headlines: exactly 5 items. Max 60 chars. Supporting text that adds detail.
- cta_buttons: exactly 3 items. 2-4 words, action-oriented.`)
  }

  if (platforms.includes('landing')) {
    platformInstructions.push(`
LANDING PAGE:
- hero_headlines: exactly 5 items. Each has "text" (main headline, bold, benefit-driven, make the visitor want to stay, 3-7 words) and "subtitle" (explain the value proposition in one sentence).
- sub_headlines: exactly 3 items. Max 60 chars. Section headers for the page.
- cta_buttons: exactly 3 items. Clear action with implied benefit, 2-5 words.`)
  }

  const systemPrompt = `You are an elite Israeli digital marketing copywriter. You write high-converting ad copy in Hebrew and English for Facebook Ads, Google Ads, design briefs, and landing pages.

You will receive content scraped from a URL. From this content, you must extract and understand:
- What the business/brand is
- What product or service is being promoted
- Who the target audience is
- What the unique selling proposition is
- What offers or promotions exist

Then generate copy that SELLS. Not describes. SELLS.

WRITE ALL COPY IN: ${lang}
GENERATE ONLY FOR THESE PLATFORMS: ${platformList}
${toneInstruction}

${platformInstructions.join('\n')}

CRITICAL RULES:
- Count characters INCLUDING spaces for all character-limited fields.
- Hebrew character counting: each Hebrew letter, space, and punctuation mark counts as 1 character.
- NEVER exceed character limits. Double-check every count.
- char_count and word_count must be the ACTUAL count of the text you wrote.
- For Hebrew: write naturally, avoid literal translations from English.
- No cliches, no exaggeration, no generic fluff. Be specific to the brand and offer.
- Each variation should have a distinct angle or hook.
- Return ONLY valid JSON. No markdown, no code blocks, no explanation.

JSON STRUCTURE (include ONLY the platforms requested above — do NOT include platforms that were not requested):
{
  "facebook": {
    "primary_text": [{ "text": "...", "version_type": "unique|variant|remarketing" }],
    "headlines": [{ "text": "...", "char_count": 24 }],
    "cta_headlines": [{ "text": "...", "char_count": 12 }],
    "description": [{ "text": "...", "char_count": 28 }]
  },
  "google": {
    "headlines": [{ "text": "...", "char_count": 28 }],
    "long_headlines": [{ "text": "...", "char_count": 72 }],
    "descriptions": [{ "text": "...", "char_count": 85 }],
    "long_description": [{ "text": "...", "char_count": 165 }]
  },
  "design": {
    "visual_ideas": [{ "text": "..." }],
    "strong_headlines": [{ "text": "...", "word_count": 5 }],
    "sub_headlines": [{ "text": "..." }],
    "cta_buttons": [{ "text": "..." }]
  },
  "landing_page": {
    "hero_headlines": [{ "text": "...", "subtitle": "..." }],
    "sub_headlines": [{ "text": "..." }],
    "cta_buttons": [{ "text": "..." }]
  }
}`

  // Build user message
  const userParts: string[] = []

  if (clientProfile) {
    userParts.push(`CLIENT PROFILE:\n${clientProfile}`)
  }

  if (winningAds) {
    userParts.push(`WINNING ADS EXAMPLES (write in a similar style and energy to these):\n${winningAds}`)
  }

  if (avoidNotes) {
    userParts.push(`WHAT TO AVOID (never do these for this client):\n${avoidNotes}`)
  }

  if (archiveExamples && archiveExamples.length > 0) {
    const exampleLines = archiveExamples.map((ex, i) => {
      let line = `${i + 1}. "${ex.text}"`
      if (ex.platform) line += ` [${ex.platform}]`
      if (ex.notes) line += ` — ${ex.notes}`
      return line
    }).join('\n')
    userParts.push(`COPY STYLE REFERENCE (learn from the tone, structure, and style of these proven examples — do NOT copy them verbatim):\n${exampleLines}`)
  }

  if (url) {
    userParts.push(`SOURCE URL: ${url}`)
  }

  if (fetchedContent) {
    // Check if fetchedContent is structured JSON from AI analysis
    let parsedBrief: Record<string, unknown> | null = null
    try { parsedBrief = JSON.parse(fetchedContent) } catch { /* raw text */ }

    if (parsedBrief && parsedBrief.business_name) {
      // Structured brief — format for the copywriter
      const briefParts: string[] = []
      if (parsedBrief.business_name) briefParts.push(`Business: ${parsedBrief.business_name}`)
      if (parsedBrief.business_type) briefParts.push(`Type: ${parsedBrief.business_type}`)
      if (parsedBrief.product_or_service) briefParts.push(`Product/Service: ${parsedBrief.product_or_service}`)
      if (parsedBrief.target_audience) briefParts.push(`Target Audience: ${parsedBrief.target_audience}`)
      if ((parsedBrief.unique_selling_points as string[])?.length) briefParts.push(`USPs: ${(parsedBrief.unique_selling_points as string[]).join(', ')}`)
      if ((parsedBrief.pain_points as string[])?.length) briefParts.push(`Pain Points: ${(parsedBrief.pain_points as string[]).join(', ')}`)
      if (parsedBrief.offers_and_promotions) briefParts.push(`Offers: ${parsedBrief.offers_and_promotions}`)
      if (parsedBrief.social_proof) briefParts.push(`Social Proof: ${parsedBrief.social_proof}`)
      if (parsedBrief.tone_of_voice) briefParts.push(`Site Tone: ${parsedBrief.tone_of_voice}`)
      if ((parsedBrief.key_phrases as string[])?.length) briefParts.push(`Key Phrases: ${(parsedBrief.key_phrases as string[]).join(', ')}`)
      if (parsedBrief.call_to_action) briefParts.push(`Main CTA: ${parsedBrief.call_to_action}`)
      userParts.push(`ANALYZED WEBSITE BRIEF:\n${briefParts.join('\n')}`)
    } else {
      userParts.push(`SCRAPED WEBSITE CONTENT:\n${fetchedContent}`)
    }
  }

  if (additionalNotes) {
    userParts.push(`ADDITIONAL INSTRUCTIONS FROM THE USER:\n${additionalNotes}`)
  }

  userParts.push(`\nGenerate copy for: ${platformList}\nLanguage: ${lang}`)

  const userMessage = userParts.join('\n\n')

  return { systemPrompt, userMessage }
}

// ─── Batch regenerate all Google sections with keywords ───
const batchSectionMeta: Record<string, { label: string; charLimit: number; count: number }> = {
  headlines: { label: 'Short Headlines', charLimit: 30, count: 20 },
  long_headlines: { label: 'Long Headlines', charLimit: 90, count: 5 },
  descriptions: { label: 'Descriptions', charLimit: 90, count: 5 },
  long_description: { label: 'Long Description', charLimit: 180, count: 1 },
}

export function buildBatchRegeneratePrompt(inputs: BuildBatchRegeneratePromptInputs) {
  const {
    language,
    toneOfVoice,
    clientProfile,
    winningAds,
    avoidNotes,
    url,
    fetchedContent,
    additionalNotes,
    keywords,
    sections, // { headlines: [...items], long_headlines: [...], descriptions: [...], long_description: [...] }
  } = inputs

  const lang = language === 'he' ? 'Hebrew' : 'English'

  const toneInstruction = toneOfVoice && toneDescriptions[toneOfVoice]
    ? `\nTONE OF VOICE: ${toneDescriptions[toneOfVoice]}`
    : ''

  // Build section instructions
  const sectionInstructions = Object.entries(sections).map(([section]) => {
    const meta = batchSectionMeta[section]
    if (!meta) return ''
    return `- "${section}": ${meta.count} items, max ${meta.charLimit} chars each`
  }).filter(Boolean).join('\n')

  const systemPrompt = `You are an elite Israeli digital marketing copywriter specializing in Google Ads.

Write in: ${lang}${toneInstruction}

You must regenerate ALL Google Ads copy items in a single batch. The user will provide target keywords/search terms that must be naturally incorporated.

CRITICAL DIVERSITY RULES:
- Every headline MUST use a DIFFERENT angle. Angles include: benefit, question, social proof, urgency, feature, stat/number, brand name, pain point, transformation, comparison, guarantee, testimonial, how-to, fear of missing out, exclusivity.
- NEVER write two headlines that are word-shuffled versions of each other.
- If headline 1 says "שירות X מקצועי בעיר Y" — do NOT write "שירות X בעיר Y מקצועי" as another headline.
- Mix sentence structures: questions, statements, imperatives, exclamations.
- At least 3 headlines must contain numbers or percentages.
- At least 2 headlines must include the brand name.
- At least 2 headlines must be questions.

BAD EXAMPLE (repetitive — NEVER do this):
1. "שיפוץ דירות מקצועי בתל אביב"
2. "שיפוץ מקצועי לדירות בתל אביב"
3. "שיפוץ דירות בתל אביב מקצועי"

GOOD EXAMPLE (diverse angles):
1. "שיפוץ הדירה? קבלו הצעה ב-24 שעות" (urgency + question)
2. "98% מלקוחותינו ממליצים עלינו" (social proof + stat)
3. "מהמטבח ועד הסלון — שיפוץ מלא" (feature scope)

OUTPUT FORMAT:
Return ONLY valid JSON with this exact structure:
{
  "google": {
${Object.entries(sections).map(([section, items]) => {
    const meta = batchSectionMeta[section]
    if (meta?.charLimit) {
      return `    "${section}": [{ "text": "...", "char_count": <number> }]  // exactly ${meta.count} items, max ${meta.charLimit} chars`
    }
    return `    "${section}": [{ "text": "..." }]  // exactly ${meta?.count || (items as unknown[]).length} items`
  }).join(',\n')}
  }
}

SECTIONS TO GENERATE:
${sectionInstructions}

No markdown, no code blocks, no explanation. ONLY the JSON object.`

  // Build user message
  const userParts: string[] = []
  if (clientProfile) userParts.push(`CLIENT: ${clientProfile}`)
  if (winningAds) userParts.push(`WINNING ADS EXAMPLES (write in a similar style and energy to these):\n${winningAds}`)
  if (avoidNotes) userParts.push(`WHAT TO AVOID (never do these for this client):\n${avoidNotes}`)
  if (url) userParts.push(`SOURCE URL: ${url}`)
  if (fetchedContent) {
    let parsedBrief: Record<string, unknown> | null = null
    try { parsedBrief = JSON.parse(fetchedContent) } catch { /* raw text */ }
    if (parsedBrief && parsedBrief.business_name) {
      const bp: string[] = []
      if (parsedBrief.business_name) bp.push(`Business: ${parsedBrief.business_name}`)
      if (parsedBrief.product_or_service) bp.push(`Product/Service: ${parsedBrief.product_or_service}`)
      if (parsedBrief.target_audience) bp.push(`Target Audience: ${parsedBrief.target_audience}`)
      if ((parsedBrief.unique_selling_points as string[])?.length) bp.push(`USPs: ${(parsedBrief.unique_selling_points as string[]).join(', ')}`)
      if ((parsedBrief.pain_points as string[])?.length) bp.push(`Pain Points: ${(parsedBrief.pain_points as string[]).join(', ')}`)
      userParts.push(`ANALYZED BRIEF:\n${bp.join('\n')}`)
    } else {
      userParts.push(`WEBSITE CONTENT:\n${(fetchedContent as string).slice(0, 2000)}`)
    }
  }
  if (additionalNotes) userParts.push(`USER NOTES: ${additionalNotes}`)
  if (keywords && keywords.length > 0) {
    userParts.push(`TARGET KEYWORDS / SEARCH TERMS (naturally incorporate these across the copy):\n${keywords.join(', ')}`)
  }

  const userMessage = userParts.join('\n\n')

  return { systemPrompt, userMessage }
}

// ─── Regenerate a single block ───
const sectionMeta: Record<string, { label: string; charLimit?: number; wordLimit?: number; hasVersionType?: boolean; hasSubtitle?: boolean }> = {
  // Facebook
  primary_text: { label: 'Facebook primary text (6-10 lines with \\n line breaks, HOOK → BODY → CTA structure)', hasVersionType: true },
  headlines: { label: 'Facebook headline (max 30 chars)', charLimit: 30 },
  cta_headlines: { label: 'Facebook CTA headline (max 15 chars)', charLimit: 15 },
  description: { label: 'Facebook description (max 30 chars)', charLimit: 30 },
  // Google
  'google_headlines': { label: 'Google Ads headline (max 30 chars)', charLimit: 30 },
  long_headlines: { label: 'Google Ads long headline (max 90 chars)', charLimit: 90 },
  descriptions: { label: 'Google Ads description (max 90 chars)', charLimit: 90 },
  long_description: { label: 'Google Ads long description (max 180 chars)', charLimit: 180 },
  // Design
  visual_ideas: { label: 'Design visual concept (detailed scene description for a designer)' },
  strong_headlines: { label: 'Design strong headline (max 7 words)', wordLimit: 7 },
  sub_headlines: { label: 'Sub-headline (max 60 chars)', charLimit: 60 },
  cta_buttons: { label: 'CTA button text (2-4 words)' },
  // Landing page
  hero_headlines: { label: 'Landing page hero headline with subtitle', hasSubtitle: true },
}

export function buildRegeneratePrompt(inputs: BuildRegeneratePromptInputs) {
  const {
    language,
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
  } = inputs

  const lang = language === 'he' ? 'Hebrew' : 'English'

  const toneInstruction = toneOfVoice && toneDescriptions[toneOfVoice]
    ? `\nTONE OF VOICE: ${toneDescriptions[toneOfVoice]}`
    : ''

  // Determine section metadata
  const lookupKey = platform === 'google' && section === 'headlines' ? 'google_headlines' : section
  const meta = sectionMeta[lookupKey] || sectionMeta[section] || { label: section }

  let formatInstruction = ''
  if (meta.charLimit) {
    formatInstruction = `\nThe text MUST be at most ${meta.charLimit} characters (including spaces). Include "char_count" in the JSON.`
  } else if (meta.wordLimit) {
    formatInstruction = `\nThe text MUST be at most ${meta.wordLimit} words. Include "word_count" in the JSON.`
  }

  let jsonFormat = '{ "text": "..." }'
  if (meta.charLimit) jsonFormat = `{ "text": "...", "char_count": <number> }`
  if (meta.wordLimit) jsonFormat = `{ "text": "...", "word_count": <number> }`
  if (meta.hasVersionType) jsonFormat = `{ "text": "...", "version_type": "unique" }`
  if (meta.hasSubtitle) jsonFormat = `{ "text": "...", "subtitle": "..." }`

  const systemPrompt = `You are an elite Israeli digital marketing copywriter. You must regenerate a single piece of copy.

Write in: ${lang}
Type: ${meta.label}${toneInstruction}${formatInstruction}

The user will give you context about the brand/product and the current text. Generate ONE new alternative that is COMPLETELY DIFFERENT in wording and angle from the current text, but equally compelling and conversion-focused.

Return ONLY valid JSON with this exact format:
${jsonFormat}

No markdown, no code blocks, no explanation. ONLY the JSON object.`

  // Build user message
  const userParts: string[] = []
  if (clientProfile) userParts.push(`CLIENT: ${clientProfile}`)
  if (winningAds) userParts.push(`WINNING ADS EXAMPLES (write in a similar style and energy to these):\n${winningAds}`)
  if (avoidNotes) userParts.push(`WHAT TO AVOID (never do these for this client):\n${avoidNotes}`)
  if (archiveExamples && archiveExamples.length > 0) {
    const exampleLines = archiveExamples.map((ex, i) => {
      let line = `${i + 1}. "${ex.text}"`
      if (ex.platform) line += ` [${ex.platform}]`
      if (ex.notes) line += ` — ${ex.notes}`
      return line
    }).join('\n')
    userParts.push(`COPY STYLE REFERENCE (learn from the tone, structure, and style of these proven examples — do NOT copy them verbatim):\n${exampleLines}`)
  }
  if (url) userParts.push(`SOURCE URL: ${url}`)
  if (fetchedContent) {
    let parsedBrief: Record<string, unknown> | null = null
    try { parsedBrief = JSON.parse(fetchedContent) } catch { /* raw text */ }
    if (parsedBrief && parsedBrief.business_name) {
      const bp: string[] = []
      if (parsedBrief.business_name) bp.push(`Business: ${parsedBrief.business_name}`)
      if (parsedBrief.product_or_service) bp.push(`Product/Service: ${parsedBrief.product_or_service}`)
      if (parsedBrief.target_audience) bp.push(`Target Audience: ${parsedBrief.target_audience}`)
      if ((parsedBrief.unique_selling_points as string[])?.length) bp.push(`USPs: ${(parsedBrief.unique_selling_points as string[]).join(', ')}`)
      if ((parsedBrief.pain_points as string[])?.length) bp.push(`Pain Points: ${(parsedBrief.pain_points as string[]).join(', ')}`)
      userParts.push(`ANALYZED BRIEF:\n${bp.join('\n')}`)
    } else {
      userParts.push(`WEBSITE CONTENT:\n${(fetchedContent as string).slice(0, 2000)}`)
    }
  }
  if (additionalNotes) userParts.push(`USER NOTES: ${additionalNotes}`)
  if (keywords && keywords.length > 0) {
    userParts.push(`TARGET KEYWORDS / SEARCH TERMS (try to naturally incorporate these):\n${keywords.join(', ')}`)
  }
  userParts.push(`\nCURRENT TEXT (write something DIFFERENT):\n"${currentText}"`)

  const userMessage = userParts.join('\n\n')

  return { systemPrompt, userMessage }
}
