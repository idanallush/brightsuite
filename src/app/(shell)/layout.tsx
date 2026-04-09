'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SWRConfig } from 'swr';
import { useAuth } from '@/hooks/use-auth';
import { Sidebar } from '@/components/shell/sidebar';
import { Topbar } from '@/components/shell/topbar';
import { ToastContainer } from '@/components/ui/toast';
import { useRouteMemory } from '@/hooks/use-route-memory';

/**
 * Global SWR cache provider that persists across navigation.
 * Without this, SWR cache is lost when components unmount (navigating between tools).
 */
function useGlobalSWRCache() {
  const cacheRef = useRef(new Map());
  const provider = useCallback(() => cacheRef.current, []);
  return provider;
}

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const cacheProvider = useGlobalSWRCache();
  useRouteMemory();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="page-bg min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            טוען...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SWRConfig
      value={{
        provider: cacheProvider,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 300000, // 5 minutes — don't re-fetch if same key was fetched recently
      }}
    >
      <div className="page-bg min-h-screen flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300">
          <Topbar />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
        <ToastContainer />
      </div>
    </SWRConfig>
  );
}
