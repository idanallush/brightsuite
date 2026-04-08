import CopyCard from '@/components/writer/CopyCard'
import HeadlineRow from '@/components/writer/HeadlineRow'
import CharCounter from '@/components/writer/CharCounter'
import CopyButton from '@/components/writer/CopyButton'
import SectionHeader from '@/components/writer/SectionHeader'
import KeywordTags from '@/components/writer/KeywordTags'
import { RefreshCw, Loader2 } from 'lucide-react'
import { useState } from 'react'

function GoogleGridItem({ text, max, onRegenerate }) {
  const [regenerating, setRegenerating] = useState(false)

  const handleRegenerate = async () => {
    if (!onRegenerate || regenerating) return
    setRegenerating(true)
    try { await onRegenerate() } finally { setRegenerating(false) }
  }

  return (
    <div className="group glass-card px-3 py-2.5 flex items-start justify-between gap-1">
      <p dir="rtl" className="text-[13px] text-right flex-1" style={{ color: text.length > max ? '#f87171' : 'var(--text-primary)' }}>{text}</p>
      <div className="flex items-center gap-1 shrink-0">
        {onRegenerate && (
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            title="ייצור מחדש"
            className="p-0.5 rounded hover:bg-white/[0.08] transition-colors disabled:opacity-50 cursor-pointer"
            style={{ color: 'var(--text-disabled)' }}
            onMouseEnter={(e) => { if (!regenerating) e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-disabled)'}
            aria-label="ייצור מחדש"
          >
            {regenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </button>
        )}
        <CharCounter current={text.length} max={max} />
        <CopyButton text={text} />
      </div>
    </div>
  )
}

export default function GoogleTab({ data, onDataChange, onRegenerate, onBatchRegenerate }) {
  const [keywords, setKeywords] = useState([])
  const [regeneratingAll, setRegeneratingAll] = useState(false)

  if (!data) return null

  const shortHeadlines = data.headlines || []
  const longHeadlines = data.long_headlines || []
  const descriptions = data.descriptions || []
  const longDescription = data.long_description || []

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
    return () => onRegenerate('google', section, index, keywords)
  }

  const handleRegenerateAll = async () => {
    if (keywords.length === 0 || regeneratingAll) return
    setRegeneratingAll(true)
    try {
      if (onBatchRegenerate) {
        // Use batch endpoint — single AI call for diverse results
        await onBatchRegenerate(keywords, {
          headlines: shortHeadlines,
          long_headlines: longHeadlines,
          descriptions,
          long_description: longDescription,
        })
      } else if (onRegenerate) {
        // Fallback to per-item regeneration
        const calls = []
        shortHeadlines.forEach((_, i) => calls.push(onRegenerate('google', 'headlines', i, keywords)))
        longHeadlines.forEach((_, i) => calls.push(onRegenerate('google', 'long_headlines', i, keywords)))
        descriptions.forEach((_, i) => calls.push(onRegenerate('google', 'descriptions', i, keywords)))
        longDescription.forEach((_, i) => calls.push(onRegenerate('google', 'long_description', i, keywords)))
        await Promise.allSettled(calls)
      }
    } finally {
      setRegeneratingAll(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Keyword tags input */}
      <KeywordTags keywords={keywords} onChange={setKeywords} onRegenerateAll={handleRegenerateAll} regeneratingAll={regeneratingAll} />
      {/* Short headlines - 4-col grid */}
      <section>
        <SectionHeader title="כותרות (עד 30 תווים)" />
        <div className="grid grid-cols-4 gap-2">
          {shortHeadlines.map((h, i) => (
            <GoogleGridItem key={i} text={h.text} max={30} onRegenerate={regen('headlines', i)} />
          ))}
        </div>
      </section>

      {/* Long headlines */}
      <section>
        <SectionHeader title="כותרות ארוכות (עד 90 תווים)" />
        <div className="space-y-2">
          {longHeadlines.map((h, i) => (
            <HeadlineRow key={i} text={h.text} max={90} onTextChange={(t) => updateItem('long_headlines', i, t)} onRegenerate={regen('long_headlines', i)} />
          ))}
        </div>
      </section>

      {/* Descriptions */}
      <section>
        <SectionHeader title="תיאורים (עד 90 תווים)" />
        <div className="space-y-2">
          {descriptions.map((d, i) => (
            <HeadlineRow key={i} text={d.text} max={90} onTextChange={(t) => updateItem('descriptions', i, t)} onRegenerate={regen('descriptions', i)} />
          ))}
        </div>
      </section>

      {/* Long description */}
      {longDescription.length > 0 && (
        <section>
          <SectionHeader title="תיאור ארוך (עד 180 תווים)" />
          {longDescription.map((d, i) => (
            <CopyCard key={i} text={d.text} charLimit={180} onTextChange={(t) => updateItem('long_description', i, t)} onRegenerate={regen('long_description', i)} />
          ))}
        </section>
      )}
    </div>
  )
}
