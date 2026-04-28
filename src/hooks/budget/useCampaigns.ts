import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { demoCampaigns, demoBudgetPeriods } from '@/lib/budget/demo-data'
import { enrichCampaignWithBudget } from '@/lib/budget/forecast'
import type { Campaign, CampaignWithBudget, CampaignStatus, BudgetPeriod } from '@/lib/budget/types'

// In BrightSuite, auth is cookie-based — no token needed.
// Demo mode uses the same flag from the demo-data module.
const isDemoMode = () => false

const fetchApi = async (url: string, options?: RequestInit): Promise<Response> => {
  return fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
}

export const useCampaigns = (clientId: string) => {
  return useQuery({
    queryKey: ['campaigns', clientId],
    queryFn: async (): Promise<CampaignWithBudget[]> => {
      if (isDemoMode()) {
        const campaigns = demoCampaigns.filter((c) => c.client_id === clientId)
        return campaigns.map((campaign) => {
          const periods = demoBudgetPeriods.filter((p) => p.campaign_id === campaign.id)
          return enrichCampaignWithBudget(campaign, periods)
        })
      }

      const res = await fetchApi(`/api/budget/campaigns?client_id=${clientId}`)
      if (!res.ok) throw new Error('Failed to fetch campaigns')

      const data = await res.json() as { campaigns: Campaign[]; budget_periods: BudgetPeriod[] }

      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      return data.campaigns.map((campaign) => {
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
    },
    enabled: !!clientId,
  })
}

export const useCreateCampaign = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      client_id: string
      name: string
      technical_name?: string
      platform: 'facebook' | 'google'
      campaign_type?: string
      daily_budget: number
      start_date: string
      ad_link?: string
      notes?: string
    }) => {
      if (isDemoMode()) {
        const newCampaign: Campaign = {
          id: crypto.randomUUID(),
          client_id: input.client_id,
          name: input.name,
          technical_name: input.technical_name ?? null,
          platform: input.platform,
          campaign_type: input.campaign_type ?? null,
          ad_link: input.ad_link ?? null,
          status: 'active',
          start_date: input.start_date,
          end_date: null,
          notes: input.notes ?? null,
          meta_campaign_id: null,
          actual_spend: 0,
          actual_spend_month: null,
          last_synced_at: null,
          created_at: new Date().toISOString(),
        }
        demoCampaigns.push(newCampaign)
        demoBudgetPeriods.push({
          id: crypto.randomUUID(),
          campaign_id: newCampaign.id,
          daily_budget: input.daily_budget,
          start_date: input.start_date,
          end_date: null,
          created_by: null,
          created_at: new Date().toISOString(),
        })
        return newCampaign
      }

      const res = await fetchApi('/api/budget/campaigns', {
        method: 'POST',
        body: JSON.stringify(input),
      })

      if (!res.ok) throw new Error('Failed to create campaign')
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', variables.client_id] })
    },
  })
}

export const useUpdateCampaignDetails = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      campaign_id: string
      client_id: string
      name: string
      technical_name: string | null
      campaign_type: string | null
      ad_link: string | null
      notes: string | null
    }) => {
      if (isDemoMode()) {
        const campaign = demoCampaigns.find((c) => c.id === input.campaign_id)
        if (campaign) {
          campaign.name = input.name
          campaign.technical_name = input.technical_name
          campaign.campaign_type = input.campaign_type
          campaign.ad_link = input.ad_link
          campaign.notes = input.notes
        }
        return
      }

      const res = await fetchApi(`/api/budget/campaigns/${input.campaign_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: input.name,
          technical_name: input.technical_name,
          campaign_type: input.campaign_type,
          ad_link: input.ad_link,
          notes: input.notes,
        }),
      })

      if (!res.ok) throw new Error('Failed to update campaign')
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', variables.client_id] })
    },
  })
}

export const useUpdateBudget = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      campaign_id: string
      client_id: string
      new_budget: number
      effective_date: string
      end_date?: string
      old_budget: number
    }) => {
      if (isDemoMode()) {
        const currentPeriod = demoBudgetPeriods.find(
          (p) => p.campaign_id === input.campaign_id && !p.end_date
        )
        if (currentPeriod) {
          const endDate = new Date(input.effective_date)
          endDate.setDate(endDate.getDate() - 1)
          currentPeriod.end_date = endDate.toISOString().split('T')[0]
        }
        demoBudgetPeriods.push({
          id: crypto.randomUUID(),
          campaign_id: input.campaign_id,
          daily_budget: input.new_budget,
          start_date: input.effective_date,
          end_date: input.end_date ?? null,
          created_by: null,
          created_at: new Date().toISOString(),
        })
        return
      }

      const res = await fetchApi(`/api/budget/campaigns/${input.campaign_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          action: 'budget',
          new_budget: input.new_budget,
          effective_date: input.effective_date,
          end_date: input.end_date,
          old_budget: input.old_budget,
        }),
      })

      if (!res.ok) throw new Error('Failed to update budget')
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', variables.client_id] })
    },
  })
}

export const useUpdateCampaignStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      campaign_id: string
      client_id: string
      status: CampaignStatus
      end_date?: string
    }) => {
      if (isDemoMode()) {
        const campaign = demoCampaigns.find((c) => c.id === input.campaign_id)
        if (campaign) {
          campaign.status = input.status
          if (input.end_date) campaign.end_date = input.end_date
          if (input.status === 'stopped') {
            const period = demoBudgetPeriods.find(
              (p) => p.campaign_id === input.campaign_id && !p.end_date
            )
            if (period) period.end_date = input.end_date ?? new Date().toISOString().split('T')[0]
          }
        }
        return
      }

      const res = await fetchApi(`/api/budget/campaigns/${input.campaign_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          action: 'status',
          status: input.status,
          end_date: input.end_date,
        }),
      })

      if (!res.ok) throw new Error('Failed to update campaign status')
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', variables.client_id] })
    },
  })
}

export const useRemoveFromPlan = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      campaign_id: string
      client_id: string
      effective_date: string
    }) => {
      if (isDemoMode()) {
        const campaign = demoCampaigns.find((c) => c.id === input.campaign_id)
        if (campaign) {
          campaign.end_date = input.effective_date
        }
        const period = demoBudgetPeriods.find(
          (p) => p.campaign_id === input.campaign_id && !p.end_date
        )
        if (period) {
          period.end_date = input.effective_date
        }
        return
      }

      const res = await fetchApi(`/api/budget/campaigns/${input.campaign_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          action: 'remove_from_plan',
          effective_date: input.effective_date,
        }),
      })

      if (!res.ok) throw new Error('Failed to remove from plan')
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', variables.client_id] })
    },
  })
}

export const useDeleteCampaign = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { campaign_id: string; client_id: string }) => {
      if (isDemoMode()) {
        const idx = demoCampaigns.findIndex((c) => c.id === input.campaign_id)
        if (idx !== -1) demoCampaigns.splice(idx, 1)
        return
      }

      const res = await fetchApi(`/api/budget/campaigns/${input.campaign_id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete campaign')
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', variables.client_id] })
    },
  })
}

export const useMetaSync = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { client_id: string; ad_account_id?: string }) => {
      const res = await fetchApi('/api/budget/meta/sync', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Sync failed')
      }
      return res.json() as Promise<{
        success: boolean
        ad_account_id: string
        total_meta_campaigns: number
        created: number
        updated: number
        synced_at: string
      }>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', variables.client_id] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

export const useGoogleSync = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { client_id: string; google_customer_id?: string; google_mcc_id?: string }) => {
      const res = await fetchApi('/api/budget/google/sync', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Google sync failed')
      }
      return res.json() as Promise<{
        success: boolean
        google_customer_id: string
        total_campaigns: number
        created: number
        updated: number
        synced_at: string
      }>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', variables.client_id] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

export type BulkActionType = 'status' | 'delete' | 'update_ad_link' | 'remove_from_plan'

export const useBulkAction = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      ids: string[]
      action: BulkActionType
      client_id: string
      status?: string
      end_date?: string
      ad_link?: string
      effective_date?: string
    }) => {
      if (isDemoMode()) {
        return { success: true, action: input.action, affected: input.ids.length }
      }

      const { client_id: _clientId, ...payload } = input
      const res = await fetchApi('/api/budget/campaigns/bulk', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Bulk action failed')
      }

      return res.json() as Promise<{ success: boolean; action: string; affected: number }>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', variables.client_id] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}
