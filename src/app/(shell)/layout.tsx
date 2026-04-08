'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Sidebar } from '@/components/shell/sidebar';
import { Topbar } from '@/components/shell/topbar';

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

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
    <div className="page-bg min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
