"use client";

import useSWR from "swr";
import type { AdCreativeRow, DateRange } from "@/lib/ads/types/ad";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (res.status === 401) {
    window.location.href = "/";
    throw new Error("Not authenticated");
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "Failed to fetch ads");
  }
  const data = await res.json();
  return data.ads as AdCreativeRow[];
};

export function useFacebookAds(
  accountId: string | null,
  dateRange: DateRange | null,
) {
  const shouldFetch = accountId && dateRange;

  const params = new URLSearchParams();
  if (accountId) params.set("account_id", accountId);
  if (dateRange?.since) params.set("since", dateRange.since);
  if (dateRange?.until) params.set("until", dateRange.until);

  const key = shouldFetch ? `/api/ads/facebook/ads?${params.toString()}` : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 600000, // 10 minutes — ads data cached between tool switches
    revalidateIfStale: false,
  });

  return {
    ads: data || [],
    error,
    isLoading: shouldFetch ? isLoading : false,
    refresh: mutate,
  };
}
