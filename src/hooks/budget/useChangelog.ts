import { useQuery } from '@tanstack/react-query'
import { demoChangelog } from '@/lib/budget/demo-data'
import type { ChangelogEntry } from '@/lib/budget/types'

const isDemoMode = () => false

const fetchApi = async (url: string): Promise<Response> => {
  return fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  })
}

export const useChangelog = (campaignId?: string, clientId?: string) => {
  return useQuery({
    queryKey: ['changelog', campaignId ?? clientId],
    queryFn: async (): Promise<ChangelogEntry[]> => {
      if (isDemoMode()) {
        if (campaignId) {
          return demoChangelog
            .filter((c) => c.campaign_id === campaignId)
            .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime())
        }
        return demoChangelog
          .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime())
      }

      const params = campaignId
        ? `campaign_id=${campaignId}`
        : `client_id=${clientId}`

      const res = await fetchApi(`/api/budget/changelog?${params}`)
      if (!res.ok) throw new Error('Failed to fetch changelog')
      return res.json()
    },
    enabled: !!(campaignId || clientId),
  })
}
