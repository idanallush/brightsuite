import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LastRouteState {
  /** Maps tool base path → last visited sub-path. e.g. '/ads' → '/ads/dashboard' */
  routes: Record<string, string>;
  setLastRoute: (toolBase: string, fullPath: string) => void;
  getLastRoute: (toolBase: string) => string | null;
}

export const useLastRouteStore = create<LastRouteState>()(
  persist(
    (set, get) => ({
      routes: {},
      setLastRoute: (toolBase, fullPath) => {
        // Only save if it's a sub-page (not the tool root itself)
        if (fullPath !== toolBase && fullPath.startsWith(toolBase)) {
          set((s) => ({ routes: { ...s.routes, [toolBase]: fullPath } }));
        }
      },
      getLastRoute: (toolBase) => {
        return get().routes[toolBase] || null;
      },
    }),
    {
      name: 'brightsuite-last-routes',
    },
  ),
);
