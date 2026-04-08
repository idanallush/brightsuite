import { useState } from 'react'
import { Pencil, Megaphone, ChevronDown, DollarSign, PlayCircle, PlusCircle, Trash2, ExternalLink, CalendarOff } from 'lucide-react'
import type { CampaignWithBudget, Platform, CampaignStatus, ChangelogAction } from '@/lib/budget/types'
import { useChangelog } from '@/hooks/budget/useChangelog'
import { StatusDropdown } from '@/components/budget/StatusDropdown'
import { PlatformIcon } from '@/components/budget/ui/PlatformIcon'
import { Button } from '@/components/budget/ui/Button'
import { EmptyState } from '@/components/budget/ui/EmptyState'
import { Skeleton } from '@/components/budget/ui/Skeleton'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/budget/format'

/* -- Inline changelog row -- */

const actionIcons: Record<ChangelogAction, typeof DollarSign> = {
  budget_change: DollarSign,
  status_change: PlayCircle,
  campaign_added: PlusCircle,
  campaign_removed: PlusCircle,
  note_added: PlusCircle,
}

const actionColors: Record<ChangelogAction, string> = {
  budget_change: 'text-accent',
  status_change: 'text-warning',
  campaign_added: 'text-success',
  campaign_removed: 'text-danger',
  note_added: 'text-text-secondary',
}

const ChangelogRow = ({ campaignId, colSpan }: { campaignId: string; colSpan: number }) => {
  const { data: entries, isLoading } = useChangelog(campaignId)

  return (
    <tr>
      <td colSpan={colSpan} className="!p-0">
        <div className="bg-[var(--card-bg)] border-t border-[var(--glass-border)] px-5 py-3">
          {isLoading ? (
            <div className="flex flex-col gap-2 py-2">
              <Skeleton width="70%" height="14px" />
              <Skeleton width="50%" height="14px" />
            </div>
          ) : !entries || entries.length === 0 ? (
            <p className="text-xs text-text-muted py-1">אין שינויים עדיין</p>
          ) : (
            <div className="flex flex-col gap-1">
              {entries.slice(0, 5).map((entry) => {
                const Icon = actionIcons[entry.action] ?? PlusCircle
                const color = actionColors[entry.action] ?? 'text-text-secondary'
                return (
                  <div key={entry.id} className="flex items-center gap-3 py-1.5">
                    <div className={`w-6 h-6 rounded-md bg-[var(--card-bg-hover)] flex items-center justify-center shrink-0 ${color}`}>
                      <Icon size={12} />
                    </div>
                    <span className="text-xs flex-1">{entry.description}</span>
                    <span className="text-xs text-text-muted shrink-0">
                      {formatDateTime(entry.performed_at)}
                    </span>
                  </div>
                )
              })}
              {entries.length > 5 && (
                <p className="text-xs text-text-muted pt-1">ועוד {entries.length - 5} שינויים...</p>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

/* -- Campaign Table -- */

interface CampaignTableProps {
  campaigns: CampaignWithBudget[]
  platform: Platform
  onEditCampaign: (campaign: CampaignWithBudget) => void
  onViewChangelog: (campaignId: string) => void
  onBudgetEdit: (campaign: CampaignWithBudget) => void
  onStatusChange: (campaignId: string, status: CampaignStatus) => void
  onEndDateEdit: (campaign: CampaignWithBudget) => void
  onDeleteCampaign: (campaign: CampaignWithBudget) => void
  onRemoveFromPlan: (campaign: CampaignWithBudget) => void
}

const platformLabels: Record<Platform, string> = {
  facebook: 'Meta (Facebook)',
  google: 'Google Ads',
}

const COL_COUNT = 8

const getEndDateUrgency = (endDate: string | null): 'expired' | 'soon' | 'ok' | null => {
  if (!endDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'expired'
  if (diffDays <= 3) return 'soon'
  return 'ok'
}

const urgencyStyles: Record<string, string> = {
  expired: 'text-danger font-semibold',
  soon: 'text-warning font-medium',
  ok: 'text-text-secondary',
}

export const CampaignTable = ({
  campaigns,
  platform,
  onEditCampaign,
  onBudgetEdit,
  onStatusChange,
  onEndDateEdit,
  onDeleteCampaign,
  onRemoveFromPlan,
}: CampaignTableProps) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [nameMode, setNameMode] = useState<'name' | 'technical'>('name')
  const statusOrder: Record<string, number> = { active: 0, scheduled: 1, paused: 2, stopped: 3 }
  const platformCampaigns = campaigns
    .filter((c) => c.platform === platform)
    .sort((a, b) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3))

  if (platformCampaigns.length === 0) return null

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalDaily = platformCampaigns.reduce((sum, c) => sum + c.current_daily_budget, 0)
  const totalForecast = platformCampaigns.reduce((sum, c) => sum + c.monthly_forecast, 0)
  const totalActualSpend = platformCampaigns.reduce((sum, c) => sum + (Number(c.actual_spend) || 0), 0)

  return (
    <div className="mb-8">
      {/* Platform header */}
      <div className="flex items-center gap-3 mb-3 px-1">
        <PlatformIcon platform={platform} size={20} />
        <h3 className="text-lg font-semibold leading-tight">
          {platformLabels[platform]}
        </h3>
        <span className="chip text-xs">{platformCampaigns.length} קמפיינים</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--glass-border)]">
        <table className="glass-table">
          <thead>
            <tr>
              <th>
                <button
                  className="flex items-center gap-1 text-text-muted hover:text-text-primary transition-colors cursor-pointer bg-transparent border-none p-0 text-xs font-medium uppercase tracking-wider"
                  onClick={() => setNameMode(prev => prev === 'name' ? 'technical' : 'name')}
                  title="החלף בין שם קמפיין לשם טכני"
                >
                  {nameMode === 'name' ? 'קמפיין' : 'שם טכני'}
                  <ChevronDown size={12} />
                </button>
              </th>
              <th>תאריך התחלה</th>
              <th>תאריך סיום</th>
              <th>סטטוס</th>
              <th>תקציב יומי</th>
              <th>צפי חודשי</th>
              <th>הוצאה בפועל</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {platformCampaigns.map((campaign) => {
              const isExpanded = expandedIds.has(campaign.id)
              return (
                <>
                  <tr key={campaign.id}>
                    {/* Campaign name + changes badge */}
                    <td>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-nowrap">
                          <span className="font-medium truncate">
                            {nameMode === 'name' ? campaign.name : (campaign.technical_name || campaign.name)}
                          </span>
                          {campaign.budget_periods.length > 1 && (
                            <span
                              className="chip text-xs shrink-0 whitespace-nowrap"
                              title={`${campaign.budget_periods.length - 1} שינויי תקציב`}
                              style={{ padding: '1px 6px', fontSize: '0.65rem' }}
                            >
                              {campaign.budget_periods.length - 1}x
                            </span>
                          )}
                        </div>
                        {nameMode === 'name' && campaign.campaign_type && (
                          <span className="text-xs text-text-muted">{campaign.campaign_type}</span>
                        )}
                      </div>
                    </td>

                    {/* Start date */}
                    <td className="text-text-secondary text-sm">
                      {formatDate(campaign.start_date)}
                    </td>

                    {/* End date with urgency color -- clickable */}
                    <td className="text-sm">
                      <button
                        className="group flex items-center gap-1.5 bg-transparent border-none p-0 cursor-pointer"
                        onClick={() => onEndDateEdit(campaign)}
                        title="עריכת תאריך סיום"
                      >
                        {campaign.end_date ? (
                          <span className={urgencyStyles[getEndDateUrgency(campaign.end_date) ?? 'ok']}>
                            {formatDate(campaign.end_date)}
                          </span>
                        ) : (
                          <span className="text-text-muted text-xs">Always on</span>
                        )}
                        <Pencil
                          size={10}
                          className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </button>
                    </td>

                    {/* Status dropdown */}
                    <td>
                      <StatusDropdown
                        status={campaign.status}
                        onChange={(s) => onStatusChange(campaign.id, s)}
                      />
                    </td>

                    {/* Daily budget -- clickable */}
                    <td>
                      <button
                        className="group flex items-center gap-2 bg-transparent border-none p-0 cursor-pointer"
                        onClick={() => onBudgetEdit(campaign)}
                        title="שינוי תקציב"
                      >
                        <span className="font-semibold text-accent">
                          {formatCurrency(campaign.current_daily_budget)}
                        </span>
                        <Pencil
                          size={12}
                          className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </button>
                    </td>

                    {/* Monthly forecast */}
                    <td className="font-semibold">
                      {formatCurrency(campaign.monthly_forecast)}
                    </td>

                    {/* Actual spend */}
                    <td>
                      {Number(campaign.actual_spend) > 0 ? (
                        <span className="font-semibold">{formatCurrency(Number(campaign.actual_spend))}</span>
                      ) : (
                        <span className="text-text-muted text-xs">--</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td>
                      <div className="flex items-center gap-1">
                        {campaign.ad_link && (
                          <a
                            href={campaign.ad_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-icon !w-8 !h-8 !text-accent hover:!bg-[rgba(37,99,235,0.15)]"
                            title="צפה במודעה"
                          >
                            <ExternalLink size={15} />
                          </a>
                        )}
                        <Button
                          variant="icon"
                          className="!w-8 !h-8"
                          onClick={() => onEditCampaign(campaign)}
                          title="עריכת קמפיין"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="icon"
                          className="!w-8 !h-8 hover:!text-warning"
                          onClick={() => onRemoveFromPlan(campaign)}
                          title="הוצאה מתוכנית התקציב"
                        >
                          <CalendarOff size={14} />
                        </Button>
                        <Button
                          variant="icon"
                          className="!w-8 !h-8 hover:!text-danger"
                          onClick={() => onDeleteCampaign(campaign)}
                          title="מחיקת קמפיין"
                        >
                          <Trash2 size={14} />
                        </Button>
                        <Button
                          variant="icon"
                          className={`!w-8 !h-8 ${isExpanded ? '!bg-[var(--glass-border)]' : ''}`}
                          onClick={() => toggleExpand(campaign.id)}
                          title="היסטוריית שינויים"
                        >
                          <ChevronDown
                            size={14}
                            className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {/* Expandable changelog row */}
                  {isExpanded && (
                    <ChangelogRow key={`${campaign.id}-log`} campaignId={campaign.id} colSpan={COL_COUNT} />
                  )}
                </>
              )
            })}

            {/* Summary row */}
            <tr className="summary-row">
              <td colSpan={4}>סה״כ {platformLabels[platform]}</td>
              <td className="font-semibold">{formatCurrency(totalDaily)}</td>
              <td className="font-semibold">{formatCurrency(totalForecast)}</td>
              <td className="font-semibold">
                {totalActualSpend > 0 ? formatCurrency(totalActualSpend) : '--'}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Empty state shown when a client has no campaigns yet */
export const NoCampaignsState = ({ onAdd }: { onAdd: () => void }) => (
  <EmptyState
    icon={<Megaphone size={40} />}
    title="אין קמפיינים עדיין"
    description="הוסף קמפיין ראשון כדי להתחיל לנהל תקציבים"
    action={
      <Button onClick={onAdd}>
        <Megaphone size={18} />
        הוסף קמפיין
      </Button>
    }
  />
)
