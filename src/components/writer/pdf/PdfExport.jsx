import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'

// ─── Register Heebo font from Google Fonts CDN ───
Font.register({
  family: 'Heebo',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/heebo/v26/NGS6v5_NC0k9P9H0TbFhsqMA.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/heebo/v26/NGS6v5_NC0k9P9H2TbFhsqMA.ttf', fontWeight: 500 },
    { src: 'https://fonts.gstatic.com/s/heebo/v26/NGS6v5_NC0k9P9HSTbFhsqMA.ttf', fontWeight: 700 },
  ],
})

// Disable word hyphenation (breaks Hebrew)
Font.registerHyphenationCallback((word) => [word])

// ─── Styles ───
const s = StyleSheet.create({
  page: {
    fontFamily: 'Heebo',
    fontSize: 11,
    fontWeight: 400,
    direction: 'rtl',
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 45,
    backgroundColor: '#ffffff',
  },

  // Header
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#1877F2',
  },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { fontSize: 20, fontWeight: 700, color: '#1e3a5f' },
  headerSub: { fontSize: 10, color: '#6b7280', marginTop: 3 },
  headerLeft: { alignItems: 'flex-start' },
  headerBrand: { fontSize: 14, fontWeight: 700, color: '#1877F2' },
  headerBrandSub: { fontSize: 8, color: '#9ca3af', marginTop: 2 },

  // Platform section
  platformSection: { marginBottom: 24 },
  platformHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  platformBar: {
    width: 4,
    height: 20,
    backgroundColor: '#1877F2',
    borderRadius: 2,
    marginLeft: 8,
  },
  platformTitle: { fontSize: 16, fontWeight: 700, color: '#4e5290' },

  // Sub-section
  subSection: { marginBottom: 14 },
  subTitle: {
    fontSize: 12,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 6,
    textAlign: 'right',
  },

  // Cards
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardText: {
    fontSize: 11,
    fontWeight: 400,
    color: '#1f2937',
    textAlign: 'right',
    lineHeight: 1.6,
  },

  // Inline headline row
  headlineRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  headlineText: {
    fontSize: 11,
    fontWeight: 400,
    color: '#1f2937',
    textAlign: 'right',
    flex: 1,
  },
  charCount: { fontSize: 9, marginRight: 6 },
  charOk: { color: '#16a34a' },
  charOver: { color: '#dc2626' },

  // Badge
  badge: {
    fontSize: 8,
    fontWeight: 500,
    color: '#1877F2',
    backgroundColor: '#eeeef5',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginBottom: 5,
    alignSelf: 'flex-end',
  },
  badgeOrange: { color: '#ea580c', backgroundColor: '#fff7ed' },
  badgePurple: { color: '#7c3aed', backgroundColor: '#f5f3ff' },

  // CTA button style
  ctaRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  ctaChip: {
    backgroundColor: '#1877F2',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  ctaChipText: { fontSize: 10, fontWeight: 500, color: '#ffffff' },

  // Hero card (landing page)
  heroCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 10,
    fontWeight: 400,
    color: '#6b7280',
    textAlign: 'center',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 45,
    right: 45,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
  },
  footerText: { fontSize: 8, color: '#9ca3af' },
})

// ─── Helper: version badge ───
const versionBadgeMap = {
  unique: 'UNIQUE',
  variant: 'VARIANT',
  remarketing: 'REMARKETING',
}

function VersionBadge({ type, index }) {
  const label = versionBadgeMap[type] || `VERSION ${String(index + 1).padStart(2, '0')}`
  const isRemarketing = type === 'remarketing'
  return (
    <Text style={[s.badge, isRemarketing && s.badgeOrange]}>
      [{label}]
    </Text>
  )
}

function CharCountLabel({ current, max }) {
  const over = current > max
  return (
    <Text style={[s.charCount, over ? s.charOver : s.charOk]}>
      ({current}/{max})
    </Text>
  )
}

// ─── Platform renderers ───

function FacebookSection({ data }) {
  const primaryTexts = data.primary_text || []
  const headlines = data.headlines || []
  const ctaHeadlines = data.cta_headlines || []
  const descriptions = data.description || []

  return (
    <View style={s.platformSection}>
      <View style={s.platformHeader}>
        <View style={s.platformBar} />
        <Text style={s.platformTitle}>Facebook Ads</Text>
      </View>

      {primaryTexts.length > 0 && (
        <View style={s.subSection}>
          <Text style={s.subTitle}>Primary Text</Text>
          {primaryTexts.map((item, i) => (
            <View key={i} style={s.card}>
              <VersionBadge type={item.version_type} index={i} />
              <Text style={s.cardText}>{item.text}</Text>
            </View>
          ))}
        </View>
      )}

      {headlines.length > 0 && (
        <View style={s.subSection}>
          <Text style={s.subTitle}>Headlines</Text>
          {headlines.map((h, i) => (
            <View key={i} style={s.headlineRow}>
              <Text style={s.headlineText}>{h.text}</Text>
              <CharCountLabel current={h.char_count || h.text.length} max={30} />
            </View>
          ))}
        </View>
      )}

      {ctaHeadlines.length > 0 && (
        <View style={s.subSection}>
          <Text style={s.subTitle}>CTA Headlines</Text>
          {ctaHeadlines.map((c, i) => (
            <View key={i} style={s.headlineRow}>
              <Text style={s.headlineText}>{c.text}</Text>
              <CharCountLabel current={c.char_count || c.text.length} max={15} />
            </View>
          ))}
        </View>
      )}

      {descriptions.length > 0 && (
        <View style={s.subSection}>
          <Text style={s.subTitle}>Description</Text>
          {descriptions.map((d, i) => (
            <View key={i} style={s.headlineRow}>
              <Text style={s.headlineText}>{d.text}</Text>
              <CharCountLabel current={d.char_count || d.text.length} max={30} />
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function GoogleSection({ data }) {
  const headlines = data.headlines || []
  const longHeadlines = data.long_headlines || []
  const descriptions = data.descriptions || []
  const longDescription = data.long_description || []

  return (
    <View style={s.platformSection}>
      <View style={s.platformHeader}>
        <View style={s.platformBar} />
        <Text style={s.platformTitle}>Google Ads</Text>
      </View>

      {headlines.length > 0 && (
        <View style={s.subSection}>
          <Text style={s.subTitle}>Headlines (30 chars)</Text>
          {headlines.map((h, i) => (
            <View key={i} style={s.headlineRow}>
              <Text style={s.headlineText}>{h.text}</Text>
              <CharCountLabel current={h.char_count || h.text.length} max={30} />
            </View>
          ))}
        </View>
      )}

      {longHeadlines.length > 0 && (
        <View style={s.subSection}>
          <Text style={s.subTitle}>Long Headlines (90 chars)</Text>
          {longHeadlines.map((h, i) => (
            <View key={i} style={s.headlineRow}>
              <Text style={s.headlineText}>{h.text}</Text>
              <CharCountLabel current={h.char_count || h.text.length} max={90} />
            </View>
          ))}
        </View>
      )}

      {descriptions.length > 0 && (
        <View style={s.subSection}>
          <Text style={s.subTitle}>Descriptions (90 chars)</Text>
          {descriptions.map((d, i) => (
            <View key={i} style={s.headlineRow}>
              <Text style={s.headlineText}>{d.text}</Text>
              <CharCountLabel current={d.char_count || d.text.length} max={90} />
            </View>
          ))}
        </View>
      )}

      {longDescription.length > 0 && (
        <View style={s.subSection}>
          <Text style={s.subTitle}>Long Description (180 chars)</Text>
          {longDescription.map((d, i) => (
            <View key={i} style={s.card}>
              <Text style={s.cardText}>{d.text}</Text>
              <CharCountLabel current={d.char_count || d.text.length} max={180} />
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function DesignSection({ data }) {
  const visualIdeas = data.visual_ideas || []
  const strongHeadlines = data.strong_headlines || []
  const subHeadlines = data.sub_headlines || []
  const ctaButtons = data.cta_buttons || []

  return (
    <View style={s.platformSection}>
      <View style={s.platformHeader}>
        <View style={s.platformBar} />
        <Text style={s.platformTitle}>Design Copy</Text>
      </View>

      {visualIdeas.length > 0 && (
        <View style={s.subSection}>
          <Text style={s.subTitle}>Visual Ideas</Text>
          {visualIdeas.map((item, i) => (
            <View key={i} style={s.card}>
              <Text style={[s.badge, s.badgePurple]}>[CONCEPT {i + 1}]</Text>
              <Text style={s.cardText}>{item.text}</Text>
            </View>
          ))}
        </View>
      )}

      {strongHeadlines.length > 0 && (
        <View style={s.subSection}>
          <Text style={s.subTitle}>Strong Headlines</Text>
          {strongHeadlines.map((h, i) => (
            <View key={i} style={s.headlineRow}>
              <Text style={[s.headlineText, { fontSize: 13, fontWeight: 500 }]}>{h.text}</Text>
              <Text style={[s.charCount, s.charOk]}>{h.word_count || '?'} words</Text>
            </View>
          ))}
        </View>
      )}

      {subHeadlines.length > 0 && (
        <View style={s.subSection}>
          <Text style={s.subTitle}>Sub Headlines</Text>
          {subHeadlines.map((sh, i) => (
            <View key={i} style={s.headlineRow}>
              <Text style={s.headlineText}>{sh.text}</Text>
            </View>
          ))}
        </View>
      )}

      {ctaButtons.length > 0 && (
        <View style={s.subSection}>
          <Text style={s.subTitle}>CTA Buttons</Text>
          <View style={s.ctaRow}>
            {ctaButtons.map((cta, i) => (
              <View key={i} style={s.ctaChip}>
                <Text style={s.ctaChipText}>{cta.text}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}

function LandingSection({ data }) {
  const heroHeadlines = data.hero_headlines || []
  const subHeadlines = data.sub_headlines || []
  const ctaButtons = data.cta_buttons || []

  return (
    <View style={s.platformSection}>
      <View style={s.platformHeader}>
        <View style={s.platformBar} />
        <Text style={s.platformTitle}>Landing Page</Text>
      </View>

      {heroHeadlines.length > 0 && (
        <View style={s.subSection}>
          <Text style={s.subTitle}>Hero Headlines</Text>
          {heroHeadlines.map((opt, i) => (
            <View key={i} style={s.heroCard}>
              <Text style={[s.badge]}>[OPTION {String(i + 1).padStart(2, '0')}]</Text>
              <Text style={s.heroTitle}>{opt.text}</Text>
              {opt.subtitle && <Text style={s.heroSub}>{opt.subtitle}</Text>}
            </View>
          ))}
        </View>
      )}

      {subHeadlines.length > 0 && (
        <View style={s.subSection}>
          <Text style={s.subTitle}>Sub Headlines</Text>
          {subHeadlines.map((sh, i) => (
            <View key={i} style={s.headlineRow}>
              <Text style={s.headlineText}>{sh.text}</Text>
            </View>
          ))}
        </View>
      )}

      {ctaButtons.length > 0 && (
        <View style={s.subSection}>
          <Text style={s.subTitle}>CTA Buttons</Text>
          <View style={s.ctaRow}>
            {ctaButtons.map((cta, i) => (
              <View key={i} style={s.ctaChip}>
                <Text style={s.ctaChipText}>{cta.text}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}

// ─── Map output keys to renderers ───
const outputKeyToTab = {
  facebook: 'facebook',
  google: 'google',
  'copy-design': 'design',
  copy_design: 'design',
  design: 'design',
  landing: 'landing',
  landing_page: 'landing',
}

const sectionRenderers = {
  facebook: FacebookSection,
  google: GoogleSection,
  design: DesignSection,
  landing: LandingSection,
}

// ─── Main Document ───

export default function PdfReport({ outputData, clientName, date }) {
  // Resolve which platforms have data
  const sections = []
  const seen = new Set()
  for (const [key, data] of Object.entries(outputData || {})) {
    const tabId = outputKeyToTab[key] || key
    if (sectionRenderers[tabId] && !seen.has(tabId)) {
      seen.add(tabId)
      sections.push({ tabId, data })
    }
  }

  const displayDate = date || new Date().toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header} fixed>
          <View style={s.headerRight}>
            <Text style={s.headerTitle}>MultiWrite Report</Text>
            <Text style={s.headerSub}>
              {clientName || 'Client'} | {displayDate}
            </Text>
          </View>
          <View style={s.headerLeft}>
            <Text style={s.headerBrand}>MultiWrite</Text>
            <Text style={s.headerBrandSub}>AI Copywriter</Text>
          </View>
        </View>

        {/* Platform sections */}
        {sections.map(({ tabId, data }) => {
          const Renderer = sectionRenderers[tabId]
          return <Renderer key={tabId} data={data} />
        })}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Generated by MultiWrite | Bright Agency</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}
