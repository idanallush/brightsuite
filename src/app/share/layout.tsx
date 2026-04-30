'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

// Public share view lives outside the (shell) tree, so it doesn't inherit
// the budget layout's QueryClientProvider. Without this wrapper, useShareData
// throws "No QueryClient set" on first render and the page 500s.
export default function ShareLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
