import { create } from "zustand";
import { subDays, format } from "date-fns";

interface DateRange {
  since: string;
  until: string;
}

interface DashboardStore {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  isRefreshing: boolean;
  setIsRefreshing: (val: boolean) => void;
  lastUpdated: string | null;
  setLastUpdated: (val: string | null) => void;
}

const today = new Date();
const sevenDaysAgo = subDays(today, 7);

export const useDashboardStore = create<DashboardStore>((set) => ({
  dateRange: {
    since: format(sevenDaysAgo, "yyyy-MM-dd"),
    until: format(today, "yyyy-MM-dd"),
  },
  setDateRange: (range) => set({ dateRange: range }),
  isRefreshing: false,
  setIsRefreshing: (val) => set({ isRefreshing: val }),
  lastUpdated: null,
  setLastUpdated: (val) => set({ lastUpdated: val }),
}));
