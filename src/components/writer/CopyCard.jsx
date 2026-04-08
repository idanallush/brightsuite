import { useState, useRef } from 'react'
import { RefreshCw, Loader2 } from 'lucide-react'
import CopyButton from '@/components/writer/CopyButton'
import CharCounter from '@/components/writer/CharCounter'

const badgeStyles = {
  blue: 'border-white/[0.1]',
  teal: 'border-teal-500/30 text-teal-400',
  orange: 'border-orange-500/30 text-orange-400',
  purple: 'border-purple-500/30 text-purple-400',
}

export default function CopyCard({ text, badge, badgeColor = 'blue', charLimit, large = false, onTextChange, onRegenerate }) {
  const [editing, setEditing] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const ref = useRef(null)

  const handleDoubleClick = () => {
    if (!onTextChange) return
    setEditing(true)
  }

  const handleBlur = () => {
    if (!editing) return
    setEditing(false)
    const newText = ref.current?.innerText?.trim()
    if (newText && newText !== text) {
      onTextChange(newText)
    }
  }

  const handleRegenerate = async () => {
    if (!onRegenerate || regenerating) return
    setRegenerating(true)
    try {
      await onRegenerate()
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="group rounded-xl border border-white/[0.08] p-5 relative" style={{ background: 'var(--card-bg)' }}>
      {/* Top row: badge + actions */}
      <div className="flex items-center justify-between mb-3">
        <div>
          {badge && (
            <span
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${badgeStyles[badgeColor]}`}
              style={badgeColor === 'blue' ? { background: 'var(--accent-subtle)', color: 'var(--accent)' } : { background: 'rgba(255,255,255,0.05)' }}
            >
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onRegenerate && (
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              title="ייצור מחדש"
              className="p-1 rounded-md transition-colors disabled:opacity-50 cursor-pointer hover:bg-white/[0.08]"
              style={{ color: 'var(--text-disabled)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-disabled)'}
              aria-label="ייצור מחדש"
            >
              {regenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          {charLimit && <CharCounter current={text.length} max={charLimit} />}
          <CopyButton text={text} />
        </div>
      </div>
      {/* Body */}
      <p
        ref={ref}
        dir="rtl"
        contentEditable={editing}
        suppressContentEditableWarning
        onDoubleClick={handleDoubleClick}
        onBlur={handleBlur}
        className={`leading-[1.8] text-right whitespace-pre-line ${large ? 'text-[22px] font-medium' : 'text-sm'} ${
          editing ? 'border border-dashed rounded-lg px-2 py-1 outline-none' : onTextChange ? 'cursor-pointer' : ''
        }`}
        style={{
          color: 'var(--text-primary)',
          ...(editing ? { borderColor: 'var(--accent)' } : {}),
        }}
      >
        {text}
      </p>
    </div>
  )
}
