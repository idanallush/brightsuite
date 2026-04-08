import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import type { CampaignStatus } from '@/lib/budget/types'

interface StatusDropdownProps {
  status: CampaignStatus
  onChange: (status: CampaignStatus) => void
}

const statusConfig: Record<CampaignStatus, { label: string; className: string }> = {
  active: { label: 'פעיל', className: 'status-active' },
  scheduled: { label: 'מתוזמן', className: 'status-scheduled' },
  paused: { label: 'מושהה', className: 'status-paused' },
  stopped: { label: 'הופסק', className: 'status-stopped' },
}

const allStatuses: CampaignStatus[] = ['active', 'scheduled', 'paused', 'stopped']

export const StatusDropdown = ({ status, onChange }: StatusDropdownProps) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const current = statusConfig[status]

  return (
    <div ref={ref} className="relative">
      <button
        className={`chip ${current.className} cursor-pointer flex items-center gap-1`}
        onClick={() => setOpen(!open)}
      >
        {current.label}
        <ChevronDown size={12} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 end-0 z-20 glass-elevated rounded-xl p-1 min-w-[120px] animate-enter">
          {allStatuses.map((s) => {
            const config = statusConfig[s]
            return (
              <button
                key={s}
                className={`w-full text-start px-3 py-2 rounded-lg text-sm transition-colors hover:bg-[var(--glass-border)] ${
                  s === status ? 'bg-[var(--card-bg-hover)]' : ''
                }`}
                onClick={() => {
                  if (s !== status) onChange(s)
                  setOpen(false)
                }}
              >
                <span className={`chip ${config.className} text-xs`}>{config.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
