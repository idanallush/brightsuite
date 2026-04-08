import { useState } from 'react'
import { Copy } from 'lucide-react'

export default function CopyButton({ text, className = '' }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        onClick={handleCopy}
        className="p-1 rounded hover:bg-white/[0.08] opacity-40 group-hover:opacity-100 transition-opacity cursor-pointer"
        title="העתק"
        aria-label="העתק טקסט"
      >
        <Copy className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
      </button>
      {copied && (
        <div className="absolute -top-8 start-1/2 -translate-x-1/2 bg-green-500 text-white text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap z-10">
          הועתק!
        </div>
      )}
    </div>
  )
}
