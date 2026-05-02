'use client';

import useSWR from 'swr';
import type { FBAdAccount } from '@/lib/facebook/types';

const fetcher = async (url: string): Promise<FBAdAccount[]> => {
  const res = await fetch(url);
  // 401 means the user hasn't connected Facebook yet — treat as empty list,
  // not an error (avoids spurious "load failed" toasts on first visit).
  if (res.status === 401) return [];
  if (!res.ok) throw new Error(`Failed to fetch Facebook accounts (${res.status})`);
  const data = await res.json();
  return data.accounts as FBAdAccount[];
};

export function useFacebookAccounts() {
  const { data, error, isLoading } = useSWR('/api/ads/facebook/accounts', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 3600000,
    revalidateIfStale: false,
  });

  return {
    accounts: data || [],
    error: error as Error | undefined,
    isLoading,
  };
}
