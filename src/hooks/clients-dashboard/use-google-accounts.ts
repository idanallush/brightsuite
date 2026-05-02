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
  // 401 means the user hasn't connected Google yet — treat as empty list,
  // not an error (avoids spurious "load failed" toasts on first visit).
  if (res.status === 401) return { accounts: [] };
  if (!res.ok) throw new Error(`Failed to fetch Google accounts (${res.status})`);
  return res.json();
};

export function useGoogleAccounts() {
  const { data, error, isLoading } = useSWR('/api/clients-dashboard/google/accounts', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 3600000,
    revalidateIfStale: false,
  });

  return {
    accounts: data?.accounts || [],
    mccId: data?.mccId || '',
    error: error as Error | undefined,
    isLoading,
  };
}
