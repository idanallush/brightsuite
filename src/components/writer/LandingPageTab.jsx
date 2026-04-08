import HeadlineRow from '@/components/writer/HeadlineRow'
import CopyButton from '@/components/writer/CopyButton'
import SectionHeader from '@/components/writer/SectionHeader'
import { RefreshCw, Loader2 } from 'lucide-react'
import { useState } from 'react'

function HeroCard({ opt, index, onRegenerate }) {
  const [regenerating, setRegenerating] = useState(false)

  const handleRegenerate = async () => {
    if (!onRegenerate || regenerating) return
    setRegenerating(true)
    try { await onRegenerate() } finally { setRegenerating(false) }
  }

  return (
    <div className="group glass-card p-6 text-center relative">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full border" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', borderColor: 'rgba(101, 105, 167, 0.3)' }}>
          OPTION {String(index + 1).padStart(2, '0')}
        </span>
        <div className="flex items-center gap-2">
          {onRegenerate && (
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              title="ייצור מחדש"
              className="p-1 rounded-md hover:bg-white/[0.08] transition-colors disabled:opacity-50"
              style={{ color: 'var(--text-disabled)' }}
              onMouseEnter={(e) => { if (!regenerating) e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-disabled)'}
            >
              {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            </button>
          )}
          <CopyButton text={`${opt.text}\n${opt.subtitle || ''}`} />
        </div>
      </div>
      <p dir="rtl" className="text-[22px] font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{opt.text}</p>
      {opt.subtitle && <p dir="rtl" className="text-sm" style={{ color: 'var(--text-secondary)' }}>{opt.subtitle}</p>}
    </div>
  )
}

export default function LandingPageTab({ data, onDataChange, onRegenerate }) {
  if (!data) return null

  const heroOptions = data.hero_headlines || []
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
    return () => onRegenerate('landing_page', section, index)
  }

  return (
    <div className="space-y-8">
      {/* Hero headlines */}
      <section>
        <SectionHeader title="כותרות להירו סקשן" />
        <div className="space-y-3">
          {heroOptions.map((opt, i) => (
            <HeroCard key={i} opt={opt} index={i} onRegenerate={regen('hero_headlines', i)} />
          ))}
        </div>
      </section>

      {/* Subtitles */}
      {subtitles.length > 0 && (
        <section>
          <SectionHeader title="תת כותרות" />
          <div className="space-y-2">
            {subtitles.map((s, i) => (
              <HeadlineRow key={i} text={s.text} max={60} onTextChange={(t) => updateItem('sub_headlines', i, t)} onRegenerate={regen('sub_headlines', i)} />
            ))}
          </div>
        </section>
      )}

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
