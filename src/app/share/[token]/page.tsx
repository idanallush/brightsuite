'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { ExternalLink, MessageSquare, Eye, EyeOff, Check } from 'lucide-react'
import { useShareData, useShareUpdateNotes } from '@/hooks/budget/useShareData'
import { GlassPanel } from '@/components/budget/ui/GlassPanel'
import { PlatformIcon } from '@/components/budget/ui/PlatformIcon'
import { StatusBadge } from '@/components/budget/ui/StatusBadge'
import { SkeletonCard } from '@/components/budget/ui/Skeleton'
import { formatCurrency } from '@/lib/budget/format'
import type { CampaignWithBudget, Platform } from '@/lib/budget/types'

const platformLabels: Record<Platform, string> = {
  facebook: 'Meta (Facebook)',
  google: 'Google Ads',
}

/* -- Editable notes cell -- */

const EditableNotes = ({
  campaignId,
  initialNotes,
  onSave,
}: {
  campaignId: string
  initialNotes: string | null
  onSave: (campaignId: string, notes: string) => void
}) => {
  const [value, setValue] = useState(initialNotes ?? '')
  const [saved, setSaved] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync when data refreshes from server
  useEffect(() => {
    setValue(initialNotes ?? '')
  }, [initialNotes])

  const debouncedSave = useCallback(
    (text: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onSave(campaignId, text)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }, 800)
    },
    [campaignId, onSave],
  )

  const handleChange = (text: string) => {
    setValue(text)
    debouncedSave(text)
  }

  return (
    <div className="relative min-w-[160px]">
      <textarea
        className="w-full bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-lg px-2.5 py-2 text-xs text-text-secondary leading-[1.7] resize-none outline-none focus:border-accent focus:bg-[var(--card-bg-hover)] transition-colors placeholder:text-text-muted min-h-[36px]"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="השאירו הערה..."
        rows={1}
        onInput={(e) => {
          const el = e.currentTarget
          el.style.height = 'auto'
          el.style.height = el.scrollHeight + 'px'
        }}
      />
      {saved && (
        <span className="absolute top-1 end-1 text-success">
          <Check size={12} />
        </span>
      )}
    </div>
  )
}

/* -- Share Table -- */

const ShareTable = ({
  campaigns,
  platform,
  showActualSpend,
  onNoteSave,
}: {
  campaigns: CampaignWithBudget[]
  platform: Platform
  showActualSpend: boolean
  onNoteSave: (campaignId: string, notes: string) => void
}) => {
  const filtered = campaigns.filter((c) => c.platform === platform)
  if (filtered.length === 0) return null

  const totalDaily = filtered.reduce((sum, c) => sum + c.current_daily_budget, 0)
  const totalForecast = filtered.reduce((sum, c) => sum + c.monthly_forecast, 0)
  const totalActualSpend = filtered.reduce((sum, c) => sum + (Number(c.actual_spend) || 0), 0)

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3 px-1">
        <PlatformIcon platform={platform} size={20} />
        <h3 className="text-lg font-semibold leading-tight">{platformLabels[platform]}</h3>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--glass-border)]">
        <table className="glass-table">
          <thead>
            <tr>
              <th>קמפיין</th>
              <th>סטטוס</th>
              <th>תקציב יומי</th>
              <th>צפי חודשי</th>
              {showActualSpend && <th>הוצאה בפועל</th>}
              <th>
                <div className="flex items-center gap-1.5">
                  <MessageSquare size={12} />
                  הערות לקוח
                </div>
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((campaign) => (
              <tr key={campaign.id}>
                <td className="font-medium">{campaign.name}</td>
                <td><StatusBadge status={campaign.status} /></td>
                <td>{formatCurrency(campaign.current_daily_budget)}</td>
                <td className="font-semibold">{formatCurrency(campaign.monthly_forecast)}</td>
                {showActualSpend && (
                  <td className="font-semibold">
                    {Number(campaign.actual_spend) > 0 ? formatCurrency(Number(campaign.actual_spend)) : '--'}
                  </td>
                )}
                <td>
                  <EditableNotes
                    campaignId={campaign.id}
                    initialNotes={campaign.notes}
                    onSave={onNoteSave}
                  />
                </td>
                <td>
                  {campaign.ad_link && (
                    <a
                      href={campaign.ad_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-icon !w-8 !h-8 !text-[#2563eb] hover:!bg-[rgba(37,99,235,0.15)]"
                      title="צפה במודעה"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </td>
              </tr>
            ))}
            <tr className="summary-row">
              <td colSpan={2}>סה״כ {platformLabels[platform]}</td>
              <td className="font-semibold">{formatCurrency(totalDaily)}</td>
              <td className="font-semibold">{formatCurrency(totalForecast)}</td>
              {showActualSpend && (
                <td className="font-semibold">
                  {totalActualSpend > 0 ? formatCurrency(totalActualSpend) : '--'}
                </td>
              )}
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ShareViewPage() {
  const params = useParams<{ token: string }>()
  const token = params.token ?? ''
  const { data, isLoading } = useShareData(token)
  const updateNotes = useShareUpdateNotes(token)
  const [showActualSpend, setShowActualSpend] = useState(false)

  const client = data?.client
  const campaigns = data?.campaigns ?? []

  const totalForecast = campaigns.reduce((sum, c) => sum + c.monthly_forecast, 0)
  const totalDaily = campaigns.reduce((sum, c) => sum + c.current_daily_budget, 0)
  const totalActualSpend = campaigns.reduce((sum, c) => sum + (Number(c.actual_spend) || 0), 0)
  const hasActualSpend = campaigns.some((c) => Number(c.actual_spend) > 0)

  const handleNoteSave = useCallback(
    (campaignId: string, notes: string) => {
      updateNotes.mutate({ campaign_id: campaignId, notes })
    },
    [updateNotes],
  )

  const now = new Date()
  const monthNames = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
  ]

  if (!isLoading && !client) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassPanel className="p-8 text-center max-w-md">
          <p className="text-lg text-text-secondary">הקישור אינו תקף או שפג תוקפו</p>
        </GlassPanel>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <span className="text-white text-sm font-semibold">B</span>
              </div>
              <span className="text-sm text-text-muted">Bright Agency</span>
            </div>
            <h1 className="text-2xl font-semibold leading-tight">
              {client?.name ?? '...'}
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              תחזית תקציב -- {monthNames[now.getMonth()]} {now.getFullYear()}
            </p>
          </div>

          <div className="text-end">
            <p className="text-xs text-text-muted mb-1">תחזית חודשית כוללת</p>
            <p className="text-3xl font-semibold text-accent">{formatCurrency(totalForecast)}</p>
            <p className="text-sm text-text-secondary mt-1">
              {formatCurrency(totalDaily)} / יום
            </p>
          </div>
        </div>

        {/* Actual spend toggle */}
        {hasActualSpend && (
          <div className="flex items-center justify-end gap-3 mb-4">
            <span className="text-xs text-text-muted">נתוני הוצאה מסונכרנים מהפלטפורמות</span>
            <button
              className={`chip text-sm cursor-pointer inline-flex items-center gap-1.5 ${showActualSpend ? 'active' : ''}`}
              onClick={() => setShowActualSpend(!showActualSpend)}
            >
              {showActualSpend ? <EyeOff size={13} /> : <Eye size={13} />}
              {showActualSpend ? 'הסתר הוצאה בפועל' : 'הצג הוצאה בפועל'}
            </button>
          </div>
        )}

        {/* Notes hint */}
        <div className="flex items-center gap-2 mb-4 px-1">
          <MessageSquare size={14} className="text-accent shrink-0" />
          <span className="text-xs text-text-secondary">
            ניתן להשאיר הערות לכל קמפיין -- ההערות נשמרות אוטומטית
          </span>
        </div>

        {/* Tables */}
        <GlassPanel className="p-6 animate-enter">
          {isLoading ? (
            <div className="flex flex-col gap-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (
            <>
              <ShareTable campaigns={campaigns} platform="facebook" showActualSpend={showActualSpend} onNoteSave={handleNoteSave} />
              <ShareTable campaigns={campaigns} platform="google" showActualSpend={showActualSpend} onNoteSave={handleNoteSave} />

              {campaigns.length > 0 && (
                <div className="glass-card p-5 mt-2">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <span className="font-semibold text-lg">סה״כ כללי</span>
                    <div className="flex items-center gap-6">
                      <div className="text-end">
                        <p className="text-xs text-text-muted">יומי</p>
                        <p className="font-semibold">{formatCurrency(totalDaily)}</p>
                      </div>
                      <div className="text-end">
                        <p className="text-xs text-text-muted">חודשי</p>
                        <p className="text-2xl font-semibold text-accent">{formatCurrency(totalForecast)}</p>
                      </div>
                      {showActualSpend && totalActualSpend > 0 && (
                        <div className="text-end">
                          <p className="text-xs text-text-muted">הוצאה בפועל</p>
                          <p className="font-semibold">{formatCurrency(totalActualSpend)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </GlassPanel>

        <footer className="text-center text-xs py-6" style={{ color: 'var(--color-text-muted)' }}>
          BudgetFlow -- Bright Agency &copy; {now.getFullYear()}
        </footer>
      </div>
    </div>
  )
}
