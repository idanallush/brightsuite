import CopyCard from '@/components/writer/CopyCard'
import HeadlineRow from '@/components/writer/HeadlineRow'
import CopyButton from '@/components/writer/CopyButton'
import SectionHeader from '@/components/writer/SectionHeader'

function countWords(text) {
  return text.trim().split(/\s+/).length
}

export default function DesignTab({ data, onDataChange, onRegenerate }) {
  if (!data) return null

  const visualConcepts = data.visual_ideas || []
  const strongHeadlines = data.strong_headlines || []
  const subtitles = data.sub_headlines || []
  const ctaButtons = data.cta_buttons || []

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
    return () => onRegenerate('design', section, index)
  }

  return (
    <div className="space-y-8">
      {/* Visual concepts */}
      <section>
        <SectionHeader title="רעיונות ויזואליים" />
        <div className="space-y-3">
          {visualConcepts.map((item, i) => (
            <CopyCard
              key={i}
              text={item.text}
              badge={`CONCEPT ${i + 1}`}
              badgeColor="purple"
              onTextChange={(t) => updateItem('visual_ideas', i, t)}
              onRegenerate={regen('visual_ideas', i)}
            />
          ))}
        </div>
      </section>

      {/* Strong headlines */}
      <section>
        <SectionHeader title="כותרות חזקות (עד 7 מילים)" />
        <div className="space-y-2">
          {strongHeadlines.map((h, i) => (
            <div key={i} className="group glass-card px-5 py-4 flex items-center justify-between">
              <p dir="rtl" className="text-xl font-medium flex-1 text-right" style={{ color: 'var(--text-primary)' }}>{h.text}</p>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  countWords(h.text) <= 7 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {h.word_count || countWords(h.text)} מילים
                </span>
                <CopyButton text={h.text} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Subtitles */}
      <section>
        <SectionHeader title="תת כותרות" />
        <div className="space-y-2">
          {subtitles.map((s, i) => (
            <HeadlineRow key={i} text={s.text} max={60} onTextChange={(t) => updateItem('sub_headlines', i, t)} onRegenerate={regen('sub_headlines', i)} />
          ))}
        </div>
      </section>

      {/* CTA buttons */}
      {ctaButtons.length > 0 && (
        <section>
          <SectionHeader title="כפתורי CTA" />
          <div className="flex gap-3">
            {ctaButtons.map((cta, i) => (
              <div key={i} className="group relative">
                <button
                  className="px-6 py-3 text-white rounded-xl text-sm font-medium transition-colors"
                  style={{ backgroundColor: 'var(--accent)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
                >
                  {cta.text}
                </button>
                <div className="absolute -top-1 -start-1">
                  <CopyButton text={cta.text} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
