import { X, DollarSign, PlayCircle, PlusCircle, MinusCircle, FileText } from 'lucide-react'
import { useChangelog } from '@/hooks/budget/useChangelog'
import { Button } from '@/components/budget/ui/Button'
import { Skeleton } from '@/components/budget/ui/Skeleton'
import { formatDateTime } from '@/lib/budget/format'
import type { ChangelogAction } from '@/lib/budget/types'

interface ChangelogPanelProps {
  open: boolean
  onClose: () => void
  campaignId?: string
  clientId?: string
  title?: string
}

const actionIcons: Record<ChangelogAction, typeof DollarSign> = {
  budget_change: DollarSign,
  status_change: PlayCircle,
  campaign_added: PlusCircle,
  campaign_removed: MinusCircle,
  note_added: FileText,
}

const actionColors: Record<ChangelogAction, string> = {
  budget_change: 'text-accent',
  status_change: 'text-warning',
  campaign_added: 'text-success',
  campaign_removed: 'text-danger',
  note_added: 'text-text-secondary',
}

export const ChangelogPanel = ({ open, onClose, campaignId, clientId, title }: ChangelogPanelProps) => {
  const { data: entries, isLoading } = useChangelog(campaignId, clientId)

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-20"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 start-0 bottom-0 w-full max-w-md z-30 glass-elevated overflow-y-auto animate-enter p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold leading-tight">
            {title || 'היסטוריית שינויים'}
          </h2>
          <Button variant="icon" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton width="36px" height="36px" className="!rounded-lg shrink-0" />
                <div className="flex-1">
                  <Skeleton width="80%" height="16px" className="mb-2" />
                  <Skeleton width="50%" height="12px" />
                </div>
              </div>
            ))}
          </div>
        ) : !entries || entries.length === 0 ? (
          <p className="text-text-secondary text-sm">אין שינויים עדיין</p>
        ) : (
          <div className="flex flex-col gap-1">
            {entries.map((entry) => {
              const Icon = actionIcons[entry.action]
              const colorClass = actionColors[entry.action]

              return (
                <div key={entry.id} className="flex gap-3 p-3 rounded-xl hover:bg-[var(--glass-border)] transition-colors">
                  <div className={`w-9 h-9 rounded-lg bg-[var(--card-bg-hover)] flex items-center justify-center shrink-0 ${colorClass}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed">{entry.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-text-muted">
                        {formatDateTime(entry.performed_at)}
                      </span>
                      <span className="text-xs text-text-muted">.</span>
                      <span className="text-xs text-text-secondary">
                        {entry.performed_by}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
