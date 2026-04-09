'use client';

import useSWR from 'swr';

interface GoogleAdAccount {
  id: string;
  name: string;
  currency: string;
}

interface GoogleAccountsResponse {
  accounts: GoogleAdAccount[];
  mccId?: string;
}

const fetcher = async (url: string): Promise<GoogleAccountsResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch Google accounts');
  return res.json();
};

export function useGoogleAccounts() {
  const { data, error, isLoading } = useSWR('/api/ads-hub/google/accounts', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 3600000,
    revalidateIfStale: false,
  });

  return {
    accounts: data?.accounts || [],
    mccId: data?.mccId || '',
    error,
    isLoading,
  };
}
