'use client';

import useSWR from 'swr';
import type { FBAdAccount } from '@/lib/facebook/types';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (res.status === 401) return [];
  if (!res.ok) return [];
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
    error,
    isLoading,
  };
}
