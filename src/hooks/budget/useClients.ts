import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { demoClients } from '@/lib/budget/demo-data'
import { slugify, generateShareToken } from '@/lib/budget/format'
import type { Client } from '@/lib/budget/types'

const isDemoMode = () => false

const fetchApi = async (url: string, options?: RequestInit): Promise<Response> => {
  return fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
}

export const useClients = () => {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async (): Promise<Client[]> => {
      if (isDemoMode()) return demoClients

      const res = await fetchApi('/api/budget/clients')
      if (!res.ok) throw new Error('Failed to fetch clients')
      return res.json()
    },
  })
}

export const useClient = (slug: string) => {
  return useQuery({
    queryKey: ['clients', slug],
    queryFn: async (): Promise<Client | null> => {
      if (isDemoMode()) return demoClients.find((c) => c.slug === slug) ?? null

      const res = await fetchApi(`/api/budget/clients/${slug}`)
      if (res.status === 404) return null
      if (!res.ok) throw new Error('Failed to fetch client')
      return res.json()
    },
    enabled: !!slug,
  })
}

export const useClientByShareToken = (token: string) => {
  return useQuery({
    queryKey: ['clients', 'share', token],
    queryFn: async (): Promise<Client | null> => {
      if (isDemoMode()) return demoClients.find((c) => c.share_token === token) ?? null

      const res = await fetch(`/api/budget/share/${token}`)
      if (res.status === 404) return null
      if (!res.ok) throw new Error('Failed to fetch shared client')
      const data = await res.json()
      return data.client
    },
    enabled: !!token,
  })
}

export const useCreateClient = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { name: string; notes?: string }) => {
      if (isDemoMode()) {
        const newClient: Client = {
          id: crypto.randomUUID(),
          name: input.name,
          slug: slugify(input.name),
          share_token: generateShareToken(),
          is_active: true,
          created_at: new Date().toISOString(),
          notes: input.notes ?? null,
          meta_ad_account_id: null,
          google_customer_id: null,
          google_mcc_id: null,
        }
        demoClients.push(newClient)
        return newClient
      }

      const res = await fetchApi('/api/budget/clients', {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          slug: slugify(input.name),
          share_token: generateShareToken(),
          notes: input.notes ?? null,
        }),
      })

      if (!res.ok) throw new Error('Failed to create client')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

export const useUpdateClient = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { id: string; slug: string; name?: string; notes?: string; is_active?: boolean }) => {
      if (isDemoMode()) {
        const client = demoClients.find((c) => c.id === input.id)
        if (client) Object.assign(client, input)
        return client
      }

      const res = await fetchApi(`/api/budget/clients/${input.slug}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      })

      if (!res.ok) throw new Error('Failed to update client')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

export const useDeleteClient = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (slug: string) => {
      if (isDemoMode()) {
        const idx = demoClients.findIndex((c) => c.slug === slug)
        if (idx !== -1) demoClients.splice(idx, 1)
        return
      }

      const res = await fetchApi(`/api/budget/clients/${slug}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete client')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}
