import type { BudgetPeriod, Campaign, CampaignWithBudget } from '@/lib/budget/types'

/**
 * Get days in a specific month
 */
export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate()
}

// Parse 'YYYY-MM-DD' as LOCAL midnight. `new Date('YYYY-MM-DD')` parses as
// UTC midnight, which silently drifts by the local TZ offset and breaks
// same-day comparisons against `new Date(year, month, day)` (local midnight).
// Concretely: on the last day of a month in any UTC+ zone, today's period
// would be filtered out as "after monthEnd" and render as ₪0.
const parseLocalDate = (str: string): Date => {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Calculate how many days a budget period overlaps with a given month.
 */
const getOverlapDays = (
  periodStart: string,
  periodEnd: string | null,
  monthStart: Date,
  monthEnd: Date
): number => {
  const pStart = parseLocalDate(periodStart)
  const pEnd = periodEnd ? parseLocalDate(periodEnd) : monthEnd

  const overlapStart = pStart > monthStart ? pStart : monthStart
  const overlapEnd = pEnd < monthEnd ? pEnd : monthEnd

  if (overlapStart > overlapEnd) return 0

  const diffMs = overlapEnd.getTime() - overlapStart.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1
}

/**
 * Calculate the monthly forecast for a campaign in a specific month.
 * Handles mid-month budget changes, campaign starts, stops, etc.
 */
export const calculateMonthlyForecast = (
  budgetPeriods: BudgetPeriod[],
  campaign: Campaign,
  year: number,
  month: number // 0-indexed
): {
  monthly_forecast: number
  spent_so_far: number
  remaining_forecast: number
  original_plan: number
  variance: number
  current_daily_budget: number
} => {
  const daysInMonth = getDaysInMonth(year, month)
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month, daysInMonth)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Filter periods that overlap with this month
  const relevantPeriods = budgetPeriods
    .filter((p) => {
      const pStart = parseLocalDate(p.start_date)
      const pEnd = p.end_date ? parseLocalDate(p.end_date) : monthEnd

      // Period must overlap with the month
      return pStart <= monthEnd && pEnd >= monthStart
    })
    .sort((a, b) => parseLocalDate(a.start_date).getTime() - parseLocalDate(b.start_date).getTime())

  if (relevantPeriods.length === 0) {
    return {
      monthly_forecast: 0,
      spent_so_far: 0,
      remaining_forecast: 0,
      original_plan: 0,
      variance: 0,
      current_daily_budget: 0,
    }
  }

  // Campaign effective end = min(campaign.end_date, monthEnd)
  const campaignEnd = campaign.end_date ? parseLocalDate(campaign.end_date) : null
  const effectiveEnd = campaignEnd && campaignEnd < monthEnd ? campaignEnd : monthEnd

  // Calculate total monthly forecast
  let totalForecast = 0
  let spentSoFar = 0
  let remainingForecast = 0

  for (const period of relevantPeriods) {
    const totalDays = getOverlapDays(
      period.start_date,
      period.end_date,
      monthStart,
      effectiveEnd
    )
    const periodAmount = period.daily_budget * totalDays
    totalForecast += periodAmount

    // Calculate spent (days up to today)
    if (today >= monthStart) {
      const spentEnd = today < effectiveEnd ? today : effectiveEnd
      const spentDays = getOverlapDays(
        period.start_date,
        period.end_date,
        monthStart,
        spentEnd
      )
      spentSoFar += period.daily_budget * spentDays
    }
  }

  // Current daily budget = the latest active period
  const currentPeriod = relevantPeriods
    .filter((p) => !p.end_date || parseLocalDate(p.end_date) >= today)
    .pop()
  const currentDailyBudget = currentPeriod?.daily_budget ?? 0

  // Remaining forecast
  if (today >= monthStart && today <= effectiveEnd) {
    remainingForecast = totalForecast - spentSoFar
  } else if (today < monthStart) {
    remainingForecast = totalForecast
  }

  // Original plan = first period's daily x total days in month
  const firstPeriod = relevantPeriods[0]
  const campaignStart = parseLocalDate(campaign.start_date)
  const campaignStartInMonth = campaignStart > monthStart ? campaignStart : monthStart
  const originalDays = campaignStartInMonth > effectiveEnd
    ? 0
    : Math.floor((effectiveEnd.getTime() - campaignStartInMonth.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const originalPlan = firstPeriod.daily_budget * originalDays

  return {
    monthly_forecast: Math.round(totalForecast),
    spent_so_far: Math.round(spentSoFar),
    remaining_forecast: Math.round(remainingForecast),
    original_plan: Math.round(originalPlan),
    variance: Math.round(totalForecast - originalPlan),
    current_daily_budget: currentDailyBudget,
  }
}

/**
 * Enrich a campaign with computed budget fields for current month.
 */
export const enrichCampaignWithBudget = (
  campaign: Campaign,
  budgetPeriods: BudgetPeriod[]
): CampaignWithBudget => {
  const now = new Date()
  const forecast = calculateMonthlyForecast(
    budgetPeriods,
    campaign,
    now.getFullYear(),
    now.getMonth()
  )

  return {
    ...campaign,
    ...forecast,
    budget_periods: budgetPeriods,
  }
}
