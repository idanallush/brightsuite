'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ToolSlug } from '@/types/auth';

interface SessionResponse {
  authenticated: boolean;
  user?: { id: number; email: string; name: string; role: string; avatarUrl?: string };
  tools?: ToolSlug[];
}

interface AuthState {
  user: { id: number; email: string; name: string; role: string; avatarUrl?: string } | null;
  tools: ToolSlug[];
  loading: boolean;
}

const DEMO_MODE = false;
const DEMO_USER = {
  id: 1,
  email: 'idan@bright.co.il',
  name: 'עידן',
  role: 'admin' as const,
};
const DEMO_TOOLS: ToolSlug[] = ['ad-checker', 'budget', 'cpa', 'ads', 'writer', 'ads-hub', 'ppc-retainer'];

export function useAuth() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({ user: null, tools: [], loading: true });

  useEffect(() => {
    if (DEMO_MODE) {
      setState({ user: DEMO_USER, tools: DEMO_TOOLS, loading: false });
      return;
    }
    fetch('/api/auth/session')
      .then(res => res.json())
      .then((data: SessionResponse) => {
        if (data.authenticated && data.user) {
          setState({ user: data.user, tools: data.tools || [], loading: false });
        } else {
          setState({ user: null, tools: [], loading: false });
        }
      })
      .catch(() => setState({ user: null, tools: [], loading: false }));
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }, [router]);

  const hasToolAccess = useCallback((toolSlug: ToolSlug) => {
    if (!state.user) return false;
    if (state.user.role === 'admin') return true;
    return state.tools.includes(toolSlug);
  }, [state]);

  return { ...state, logout, hasToolAccess };
}
