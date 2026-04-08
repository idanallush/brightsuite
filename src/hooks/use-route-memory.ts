'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLastRouteStore } from '@/stores/last-route';

/** Tool base paths that we track */
const TOOL_BASES = ['/ads', '/budget', '/cpa', '/writer', '/settings'];

/**
 * Tracks the current route and saves it as the "last visited" route for the tool.
 * Place this in the shell layout so it runs on every navigation.
 */
export function useRouteMemory() {
  const pathname = usePathname();
  const setLastRoute = useLastRouteStore((s) => s.setLastRoute);

  useEffect(() => {
    const toolBase = TOOL_BASES.find((base) => pathname.startsWith(base));
    if (toolBase) {
      setLastRoute(toolBase, pathname);
    }
  }, [pathname, setLastRoute]);
}
