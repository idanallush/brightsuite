import type { CampaignStatus } from '@/lib/budget/types'

const statusLabels: Record<CampaignStatus, string> = {
  active: 'פעיל',
  paused: 'מושהה',
  stopped: 'הופסק',
  scheduled: 'מתוזמן',
}

const statusClasses: Record<CampaignStatus, string> = {
  active: 'status-active',
  paused: 'status-paused',
  stopped: 'status-stopped',
  scheduled: 'status-scheduled',
}

interface StatusBadgeProps {
  status: CampaignStatus
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  return (
    <span className={`chip ${statusClasses[status]}`}>
      {statusLabels[status]}
    </span>
  )
}
