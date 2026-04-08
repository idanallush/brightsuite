import { useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/budget/format'
import type { CampaignWithBudget } from '@/lib/budget/types'

interface BudgetEvent {
  date: Date
  dayOfMonth: number
  campaignName: string
  dailyBudget: number
  type: 'start' | 'change' | 'end'
}

interface MonthProgressBarProps {
  daysInMonth: number
  monthProgress: number
  campaigns: CampaignWithBudget[]
  year: number
  month: number // 0-indexed
}

const eventTypeLabels: Record<string, string> = {
  start: 'התחלה',
  change: 'שינוי תקציב',
  end: 'סיום',
}

const eventTypeDotColors: Record<string, string> = {
  start: 'bg-success',
  change: 'bg-accent',
  end: 'bg-warning',
}

export const MonthProgressBar = ({
  daysInMonth,
  monthProgress,
  campaigns,
  year,
  month,
}: MonthProgressBarProps) => {
  const [hoveredEvent, setHoveredEvent] = useState<{ events: BudgetEvent[]; x: number } | null>(null)

  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month, daysInMonth)

  // Collect budget events from all campaigns within this month
  const events: BudgetEvent[] = []

  for (const campaign of campaigns) {
    if (!campaign.budget_periods) continue

    const sorted = [...campaign.budget_periods].sort(
      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    )

    for (let i = 0; i < sorted.length; i++) {
      const period = sorted[i]
      const pStart = new Date(period.start_date)

      // Only include events within this month and not on the 1st (that's just a continuation)
      if (pStart >= monthStart && pStart <= monthEnd && pStart.getDate() > 1) {
        events.push({
          date: pStart,
          dayOfMonth: pStart.getDate(),
          campaignName: campaign.name,
          dailyBudget: period.daily_budget,
          type: i === 0 ? 'start' : 'change',
        })
      }

      // End date events
      if (period.end_date) {
        const pEnd = new Date(period.end_date)
        if (pEnd >= monthStart && pEnd <= monthEnd && pEnd.getDate() < daysInMonth) {
          // Only show end if it's the last period for this campaign
          if (i === sorted.length - 1) {
            events.push({
              date: pEnd,
              dayOfMonth: pEnd.getDate(),
              campaignName: campaign.name,
              dailyBudget: period.daily_budget,
              type: 'end',
            })
          }
        }
      }
    }

    // Campaign start mid-month
    const cStart = new Date(campaign.start_date)
    if (cStart >= monthStart && cStart <= monthEnd && cStart.getDate() > 1) {
      const alreadyHasStart = events.some(
        (e) => e.campaignName === campaign.name && e.type === 'start' && e.dayOfMonth === cStart.getDate()
      )
      if (!alreadyHasStart) {
        events.push({
          date: cStart,
          dayOfMonth: cStart.getDate(),
          campaignName: campaign.name,
          dailyBudget: campaign.current_daily_budget,
          type: 'start',
        })
      }
    }
  }

  // Group events by day
  const eventsByDay = new Map<number, BudgetEvent[]>()
  for (const event of events) {
    const day = event.dayOfMonth
    if (!eventsByDay.has(day)) eventsByDay.set(day, [])
    eventsByDay.get(day)!.push(event)
  }

  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-muted">התקדמות החודש</span>
        <span className="text-xs font-semibold">{monthProgress}%</span>
      </div>

      {/* Progress track with markers */}
      <div className="relative group">
        {/* Track background */}
        <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--glass-border)' }}>
          <div
            className="h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${monthProgress}%`, background: 'var(--color-accent)' }}
          />
        </div>

        {/* Event markers */}
        {Array.from(eventsByDay.entries()).map(([day, dayEvents]) => {
          const position = ((day - 0.5) / daysInMonth) * 100

          return (
            <div
              key={day}
              className="absolute top-1/2 -translate-y-1/2 cursor-pointer"
              style={{ insetInlineStart: `${position}%` }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const parentRect = e.currentTarget.parentElement?.getBoundingClientRect()
                const x = parentRect ? rect.left - parentRect.left + rect.width / 2 : 0
                setHoveredEvent({ events: dayEvents, x })
              }}
              onMouseLeave={() => setHoveredEvent(null)}
            >
              {/* Marker dot */}
              <div className="relative flex items-center justify-center">
                <div
                  className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                    dayEvents.some((e) => e.type === 'change')
                      ? eventTypeDotColors.change
                      : dayEvents.some((e) => e.type === 'end')
                        ? eventTypeDotColors.end
                        : eventTypeDotColors.start
                  }`}
                />
                {dayEvents.length > 1 && (
                  <span
                    className="absolute -top-3 text-[9px] font-bold text-text-muted"
                  >
                    {dayEvents.length}
                  </span>
                )}
              </div>
            </div>
          )
        })}

        {/* Tooltip */}
        {hoveredEvent && (
          <div
            className="absolute bottom-full mb-3 z-50 pointer-events-none"
            style={{
              left: `${hoveredEvent.x}px`,
              transform: 'translateX(-50%)',
            }}
          >
            <div
              className="rounded-lg px-3 py-2.5 text-xs whitespace-nowrap"
              style={{
                background: 'var(--glass-bg-solid)',
                border: '1px solid var(--glass-border)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              }}
            >
              {hoveredEvent.events.map((event, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 ${i > 0 ? 'mt-1.5 pt-1.5 border-t border-[var(--card-bg-hover)]' : ''}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${eventTypeDotColors[event.type]}`} />
                  <span className="text-text-secondary">{event.campaignName}</span>
                  <span className="text-text-muted">.</span>
                  <span className="font-medium">{eventTypeLabels[event.type]}</span>
                  <span className="text-text-muted">.</span>
                  <span className="text-accent font-semibold">{formatCurrency(event.dailyBudget)}</span>
                  <span className="text-text-muted text-[10px]">{formatDate(event.date.toISOString())}</span>
                </div>
              ))}
            </div>
            {/* Arrow */}
            <div
              className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45"
              style={{
                background: 'var(--glass-bg-solid)',
                borderRight: '1px solid var(--glass-border)',
                borderBottom: '1px solid var(--glass-border)',
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
