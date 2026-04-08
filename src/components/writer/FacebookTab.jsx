import CopyCard from '@/components/writer/CopyCard'
import HeadlineRow from '@/components/writer/HeadlineRow'
import SectionHeader from '@/components/writer/SectionHeader'

const versionBadge = {
  unique: { badge: 'VERSION 01', color: 'blue' },
  variant: { badge: 'VERSION 02', color: 'blue' },
  remarketing: { badge: 'REMARKETING', color: 'orange' },
}

export default function FacebookTab({ data, onDataChange, onRegenerate }) {
  if (!data) return null

  const primaryTexts = data.primary_text || []
  const headlines = data.headlines || []
  const ctaHeadlines = data.cta_headlines || []
  const descriptions = data.description || []

  const updateItem = (section, index, newText) => {
    if (!onDataChange) return
    const updated = { ...data }
    const arr = [...(updated[section] || [])]
    arr[index] = { ...arr[index], text: newText }
    updated[section] = arr
    onDataChange(updated)
  }

  const regen = (section, index) => {
    if (!onRegenerate) return null
    return () => onRegenerate('facebook', section, index)
  }

  return (
    <div className="space-y-8">
      {/* Primary Texts */}
      <section>
        <SectionHeader title="מלל ראשי (Primary Text)" />
        <div className="space-y-3">
          {primaryTexts.map((item, i) => {
            const badgeInfo = versionBadge[item.version_type] || { badge: `VERSION ${String(i + 1).padStart(2, '0')}`, color: i < 2 ? 'blue' : 'teal' }
            return (
              <CopyCard
                key={i}
                text={item.text}
                badge={badgeInfo.badge}
                badgeColor={badgeInfo.color}
                onTextChange={(newText) => updateItem('primary_text', i, newText)}
                onRegenerate={regen('primary_text', i)}
              />
            )
          })}
        </div>
      </section>

      {/* Headlines */}
      <section>
        <SectionHeader title="כותרות (Headlines)" />
        <div className="space-y-2">
          {headlines.map((h, i) => (
            <HeadlineRow
              key={i}
              text={h.text}
              max={30}
              onTextChange={(t) => updateItem('headlines', i, t)}
              onRegenerate={regen('headlines', i)}
            />
          ))}
        </div>
      </section>

      {/* CTAs */}
      {ctaHeadlines.length > 0 && (
        <section>
          <SectionHeader title="קריאה לפעולה (CTA)" />
          <div className="space-y-2">
            {ctaHeadlines.map((c, i) => (
              <HeadlineRow
                key={i}
                text={c.text}
                max={15}
                onTextChange={(t) => updateItem('cta_headlines', i, t)}
                onRegenerate={regen('cta_headlines', i)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Description */}
      {descriptions.length > 0 && (
        <section>
          <SectionHeader title="תיאור" />
          {descriptions.map((d, i) => (
            <HeadlineRow
              key={i}
              text={d.text}
              max={30}
              onTextChange={(t) => updateItem('description', i, t)}
              onRegenerate={regen('description', i)}
            />
          ))}
        </section>
      )}
    </div>
  )
}
