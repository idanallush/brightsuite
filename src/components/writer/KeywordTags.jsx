import { useState, useRef } from 'react'
import { X, Search, RotateCcw, Loader2 } from 'lucide-react'

export default function KeywordTags({ keywords, onChange, onRegenerateAll, regeneratingAll }) {
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  const addKeyword = (text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    if (keywords.includes(trimmed)) return
    onChange([...keywords, trimmed])
    setInput('')
  }

  const removeKeyword = (index) => {
    onChange(keywords.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addKeyword(input)
    }
    if (e.key === 'Backspace' && !input && keywords.length > 0) {
      removeKeyword(keywords.length - 1)
    }
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Search className="w-4 h-4" style={{ color: 'var(--accent-fg)' }} />
        <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>מילות מפתח / ביטויי חיפוש</label>
        <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>(יוזנו לפרומפט בעת ייצור מחדש)</span>
      </div>
      <div className="flex items-center gap-2">
      <div
        className="flex-1 flex flex-wrap items-center gap-1.5 min-h-[42px] px-3 py-2 border border-white/[0.08] rounded-xl cursor-text transition-all focus-within:border-white/[0.2]"
        style={{ background: 'var(--card-bg)' }}
        onClick={() => inputRef.current?.focus()}
      >
        {keywords.map((kw, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[13px] font-medium rounded-full bg-white/[0.08] border border-white/[0.1]"
            style={{ color: 'var(--text-secondary)' }}
          >
            {kw}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeKeyword(i) }}
              className="p-0.5 hover:bg-white/[0.1] rounded-full transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={keywords.length === 0 ? 'הקלידו מילת מפתח ולחצו Enter...' : ''}
          dir="rtl"
          className="flex-1 min-w-[120px] text-sm outline-none bg-transparent"
          style={{ color: 'var(--text-primary)' }}
        />
      </div>
      {onRegenerateAll && (
        <button
          type="button"
          onClick={onRegenerateAll}
          disabled={keywords.length === 0 || regeneratingAll}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-white text-[13px] font-medium rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {regeneratingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          <span>ייצר מחדש עם ביטויים</span>
        </button>
      )}
      </div>
    </div>
  )
}
