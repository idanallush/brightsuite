"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { format, subDays } from "date-fns";
import type { DateRange } from "@/lib/ads/types/ad";
import { DEFAULT_VISIBLE_METRICS } from "@/lib/ads/types/metrics";

interface AdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  business_name?: string;
}

interface AdFilters {
  searchQuery: string;
  objectiveFilter: string;
  campaignFilter: string;
  sortBy: string;
  sortDirection: "asc" | "desc";
}

interface AdStoreState {
  // Account selection
  selectedAccountId: string | null;
  availableAccounts: AdAccount[];

  // Date range
  dateRange: DateRange;

  // Filters
  filters: AdFilters;

  // Visible metrics
  visibleMetrics: string[];

  // Active tab
  activeTab: string;

  // Export
  exportLoading: boolean;
}

interface AdStoreActions {
  setSelectedAccountId: (id: string | null) => void;
  setAvailableAccounts: (accounts: AdAccount[]) => void;
  setDateRange: (range: DateRange) => void;
  setFilters: (filters: Partial<AdFilters>) => void;
  resetFilters: () => void;
  setVisibleMetrics: (metrics: string[]) => void;
  toggleMetric: (key: string) => void;
  setActiveTab: (tab: string) => void;
  setExportLoading: (loading: boolean) => void;
}

const defaultFilters: AdFilters = {
  searchQuery: "",
  objectiveFilter: "all",
  campaignFilter: "all",
  sortBy: "spend",
  sortDirection: "desc",
};

export const useAdStore = create<AdStoreState & AdStoreActions>()(
  persist(
    (set) => ({
      // Initial state
      selectedAccountId: null,
      availableAccounts: [],
      dateRange: {
        since: format(subDays(new Date(), 7), "yyyy-MM-dd"),
        until: format(new Date(), "yyyy-MM-dd"),
      },
      filters: defaultFilters,
      visibleMetrics: DEFAULT_VISIBLE_METRICS,
      activeTab: "ads",
      exportLoading: false,

      // Actions
      setSelectedAccountId: (id) => set({ selectedAccountId: id }),
      setAvailableAccounts: (accounts) => set({ availableAccounts: accounts }),
      setDateRange: (range) => set({ dateRange: range }),
      setFilters: (partial) =>
        set((state) => ({
          filters: { ...state.filters, ...partial },
        })),
      resetFilters: () => set({ filters: defaultFilters }),
      setVisibleMetrics: (metrics) => set({ visibleMetrics: metrics }),
      toggleMetric: (key) =>
        set((state) => ({
          visibleMetrics: state.visibleMetrics.includes(key)
            ? state.visibleMetrics.filter((m) => m !== key)
            : [...state.visibleMetrics, key],
        })),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setExportLoading: (loading) => set({ exportLoading: loading }),
    }),
    {
      name: "fb-ads-store",
      // Only persist user preferences, not ephemeral state
      partialize: (state) => ({
        selectedAccountId: state.selectedAccountId,
        dateRange: state.dateRange,
        visibleMetrics: state.visibleMetrics,
        activeTab: state.activeTab,
        filters: {
          sortBy: state.filters.sortBy,
          sortDirection: state.filters.sortDirection,
          // Don't persist search / campaign / objective filters
          searchQuery: "",
          objectiveFilter: "all",
          campaignFilter: "all",
        },
      }),
    }
  )
);
