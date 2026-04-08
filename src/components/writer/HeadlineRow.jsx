import { useState, useRef } from 'react'
import { RefreshCw, Loader2 } from 'lucide-react'
import CopyButton from '@/components/writer/CopyButton'
import CharCounter from '@/components/writer/CharCounter'

export default function HeadlineRow({ text, max, onTextChange, onRegenerate }) {
  const [editing, setEditing] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const ref = useRef(null)
  const isOver = text.length > max

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
    <div className="group flex items-center gap-3 rounded-xl border border-white/[0.08] px-4 py-3" style={{ background: 'var(--card-bg)' }}>
      <p
        ref={ref}
        dir="rtl"
        contentEditable={editing}
        suppressContentEditableWarning
        onDoubleClick={handleDoubleClick}
        onBlur={handleBlur}
        className={`flex-1 text-sm text-right ${
          editing ? 'border border-dashed rounded-lg px-2 py-0.5 outline-none' : onTextChange ? 'cursor-pointer' : ''
        }`}
        style={{
          color: isOver ? '#f87171' : 'var(--text-primary)',
          ...(editing ? { borderColor: 'var(--accent)' } : {}),
        }}
      >
        {text}
      </p>
      <div className="flex items-center gap-2 shrink-0">
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
        <CharCounter current={text.length} max={max} />
        <CopyButton text={text} />
      </div>
    </div>
  )
}
