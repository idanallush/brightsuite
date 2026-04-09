import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useOverview(startDate: string, endDate: string) {
  const params = new URLSearchParams({ startDate, endDate });
  return useSWR(`/api/ads-hub/clients?${params}`, fetcher);
}

export function useClientDetail(clientId: string, startDate: string, endDate: string, platform?: string | null) {
  const params = new URLSearchParams({ startDate, endDate });
  if (platform) params.set('platform', platform);
  return useSWR(`/api/ads-hub/clients/${clientId}?${params}`, fetcher);
}

export function usePerformance(clientId: string, startDate: string, endDate: string, platform?: string | null) {
  const params = new URLSearchParams({ clientId, startDate, endDate });
  if (platform) params.set('platform', platform);
  return useSWR(`/api/ads-hub/performance?${params}`, fetcher);
}

export function useCampaigns(clientId: string, startDate: string, endDate: string, platform?: string | null) {
  const params = new URLSearchParams({ clientId, startDate, endDate });
  if (platform) params.set('platform', platform);
  return useSWR(`/api/ads-hub/campaigns?${params}`, fetcher);
}

export function useVideoLibrary(clientId?: string, search?: string, filter?: string) {
  const params = new URLSearchParams();
  if (clientId) params.set('clientId', clientId);
  if (search) params.set('search', search);
  if (filter) params.set('filter', filter);
  return useSWR(`/api/ads-hub/video-library?${params}`, fetcher);
}

export function useVideoDetail(id: string) {
  return useSWR(`/api/ads-hub/video-library/${id}`, fetcher);
}

export function useSyncStatus(limit = 50) {
  return useSWR(`/api/ads-hub/sync/status?limit=${limit}`, fetcher);
}

export function usePlatformStatus() {
  return useSWR('/api/ads-hub/settings', fetcher);
}
