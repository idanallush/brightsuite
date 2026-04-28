import { useState } from 'react'
import { X, Trash2, CalendarOff, Link2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/budget/ui/Button'
import type { CampaignStatus } from '@/lib/budget/types'

const statusOptions: { value: CampaignStatus; label: string }[] = [
  { value: 'active', label: 'פעיל' },
  { value: 'paused', label: 'מושהה' },
  { value: 'stopped', label: 'הופסק' },
  { value: 'scheduled', label: 'מתוזמן' },
]

interface BulkActionBarProps {
  count: number
  onClear: () => void
  onStatusChange: (status: CampaignStatus) => void
  onDelete: () => void
  onRemoveFromPlan: () => void
  onUpdateAdLink: (link: string) => void
  isPending: boolean
}

export const BulkActionBar = ({
  count,
  onClear,
  onStatusChange,
  onDelete,
  onRemoveFromPlan,
  onUpdateAdLink,
  isPending,
}: BulkActionBarProps) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkValue, setLinkValue] = useState('')

  if (count === 0) return null

  return (
    <div className="fixed bottom-6 inset-x-0 z-50 flex justify-center pointer-events-none">
      <div className="glass-panel border border-[var(--glass-border)] shadow-2xl px-5 py-3 flex items-center gap-3 pointer-events-auto">
        {/* Count + Clear */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {count} קמפיינים נבחרו
          </span>
          <button
            className="btn-icon !w-6 !h-6"
            onClick={onClear}
            title="ביטול בחירה"
          >
            <X size={14} />
          </button>
        </div>

        <div className="w-px h-6 bg-[var(--glass-border)]" />

        {/* Status change with dropdown */}
        <div className="relative">
          <Button
            variant="ghost"
            className="!text-xs !py-1.5 !px-3"
            onClick={() => {
              setShowStatusMenu(!showStatusMenu)
              setShowLinkInput(false)
            }}
            disabled={isPending}
          >
            שינוי סטטוס
            <ChevronDown size={12} />
          </Button>
          {showStatusMenu && (
            <div className="absolute bottom-full mb-1 start-0 glass-panel border border-[var(--glass-border)] rounded-lg py-1 min-w-[120px] z-50">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  className="w-full text-start px-3 py-1.5 text-sm hover:bg-[var(--card-bg-hover)] transition-colors"
                  onClick={() => {
                    onStatusChange(opt.value)
                    setShowStatusMenu(false)
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ad link update */}
        <div className="relative">
          <Button
            variant="ghost"
            className="!text-xs !py-1.5 !px-3"
            onClick={() => {
              setShowLinkInput(!showLinkInput)
              setShowStatusMenu(false)
            }}
            disabled={isPending}
          >
            <Link2 size={13} />
            עדכון לינק
          </Button>
          {showLinkInput && (
            <div className="absolute bottom-full mb-1 start-0 glass-panel border border-[var(--glass-border)] rounded-lg p-3 min-w-[280px] z-50">
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  className="glass-input flex-1 !text-xs !py-1.5"
                  placeholder="הזן URL..."
                  value={linkValue}
                  onChange={(e) => setLinkValue(e.target.value)}
                  autoFocus
                  dir="ltr"
                />
                <Button
                  className="!text-xs !py-1.5 !px-3"
                  onClick={() => {
                    if (linkValue) {
                      onUpdateAdLink(linkValue)
                      setLinkValue('')
                      setShowLinkInput(false)
                    }
                  }}
                  disabled={!linkValue || isPending}
                >
                  שמור
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Remove from plan */}
        <Button
          variant="ghost"
          className="!text-xs !py-1.5 !px-3 hover:!text-warning"
          onClick={onRemoveFromPlan}
          disabled={isPending}
        >
          <CalendarOff size={13} />
          הוצאה מתוכנית
        </Button>

        {/* Delete */}
        <Button
          variant="ghost"
          className="!text-xs !py-1.5 !px-3 hover:!text-danger"
          onClick={onDelete}
          disabled={isPending}
        >
          <Trash2 size={13} />
          מחיקה
        </Button>

        {isPending && (
          <span className="text-xs text-text-muted animate-pulse">מבצע...</span>
        )}
      </div>
    </div>
  )
}
