"use client";

import useSWR from "swr";
import type { FBAdAccount } from "@/lib/facebook/types";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (res.status === 401) {
    window.location.href = "/";
    throw new Error("Not authenticated");
  }
  if (!res.ok) throw new Error("Failed to fetch accounts");
  const data = await res.json();
  return data.accounts as FBAdAccount[];
};

export function useFacebookAccounts() {
  const { data, error, isLoading } = useSWR("/api/ads/facebook/accounts", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute
  });

  return {
    accounts: data || [],
    error,
    isLoading,
  };
}
