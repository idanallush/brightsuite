import { useState, useRef, useEffect } from 'react'
import { ChevronLeft } from 'lucide-react'

export default function CollapsibleSection({ icon: Icon, title, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const contentRef = useRef(null)
  const [height, setHeight] = useState(defaultOpen ? 'auto' : '0px')

  useEffect(() => {
    if (isOpen) {
      const h = contentRef.current.scrollHeight
      setHeight(`${h}px`)
      const timer = setTimeout(() => setHeight('auto'), 250)
      return () => clearTimeout(timer)
    } else {
      if (height === 'auto') {
        setHeight(`${contentRef.current.scrollHeight}px`)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setHeight('0px'))
        })
      } else {
        setHeight('0px')
      }
    }
  }, [isOpen])

  return (
    <div className="rounded-xl border border-white/[0.08] overflow-hidden" style={{ background: 'var(--card-bg)' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-right hover:bg-white/[0.08] transition-colors"
      >
        <div className="w-1 h-5 rounded-full shrink-0" style={{ backgroundColor: 'var(--accent)' }} />
        <Icon className="w-[18px] h-[18px] shrink-0" style={{ color: 'var(--accent-fg)' }} />
        <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</span>
        <ChevronLeft
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? '-rotate-90' : ''}`}
          style={{ color: 'var(--text-muted)' }}
        />
      </button>
      <div
        ref={contentRef}
        style={{ height, overflow: 'hidden', transition: 'height 0.25s ease' }}
      >
        <div className="px-4 pb-4 pt-1">
          {children}
        </div>
      </div>
    </div>
  )
}
