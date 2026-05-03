import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { enrichCampaignWithBudget } from '@/lib/budget/forecast'
import type { Client, Campaign, BudgetPeriod, CampaignWithBudget } from '@/lib/budget/types'

interface ShareData {
  client: Client
  campaigns: CampaignWithBudget[]
}

/**
 * Fetch all share data (client + campaigns + budget_periods) in a single API call.
 * Does not require authentication -- the share token is the auth.
 */
export const useShareData = (token: string) => {
  return useQuery({
    queryKey: ['share', token],
    queryFn: async (): Promise<ShareData | null> => {
      const res = await fetch(`/api/budget/share/${token}`)
      if (res.status === 404) return null
      if (!res.ok) throw new Error('Failed to fetch shared data')

      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      const data = await res.json() as {
        client: Client
        campaigns: Campaign[]
        budget_periods: BudgetPeriod[]
      }

      const enrichedCampaigns = data.campaigns
        .map((campaign) => {
          const periods = data.budget_periods
            .filter((p) => p.campaign_id === campaign.id)
            .map((p) => ({ ...p, daily_budget: Number(p.daily_budget) }))

          const enriched = enrichCampaignWithBudget(campaign, periods)

          const spendMonth = campaign.actual_spend_month
          if (Number(campaign.actual_spend) > 0 && (!spendMonth || spendMonth !== currentMonth)) {
            return { ...enriched, actual_spend: 0 }
          }
          return enriched
        })
        .filter((c) => Number(c.actual_spend) > 0 || c.current_daily_budget > 0)

      return { client: data.client, campaigns: enrichedCampaigns }
    },
    enabled: !!token,
  })
}

export const useShareUpdateNotes = (token: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { campaign_id: string; notes: string }) => {
      const res = await fetch(`/api/budget/share/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!res.ok) throw new Error('Failed to update notes')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share', token] })
    },
  })
}
