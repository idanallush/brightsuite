import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DashboardState {
  startDate: string;
  endDate: string;
  platform: string | null; // null = all platforms
  setDateRange: (start: string, end: string) => void;
  setPlatform: (platform: string | null) => void;
}

function getMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      startDate: getMonthStart(),
      endDate: getToday(),
      platform: null,
      setDateRange: (start, end) => set({ startDate: start, endDate: end }),
      setPlatform: (platform) => set({ platform }),
    }),
    {
      name: 'ads-hub-dashboard',
    }
  )
);
