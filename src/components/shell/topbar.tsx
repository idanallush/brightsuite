'use client';

import { usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { TOOLS } from '@/lib/tools';

const pageTitles: Record<string, string> = {
  '/dashboard': 'דשבורד',
  '/settings': 'הגדרות',
  ...Object.fromEntries(TOOLS.map((t) => [t.href, t.name])),
};

export const Topbar = () => {
  const pathname = usePathname();

  const currentTitle =
    pageTitles[pathname] ||
    Object.entries(pageTitles).find(([path]) =>
      pathname.startsWith(path)
    )?.[1] ||
    '';

  const isDashboard = pathname === '/dashboard';

  return (
    <div
      className="px-6 py-3 flex items-center gap-2"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--glass-border)',
      }}
    >
      <span
        className="text-sm"
        style={{ color: 'var(--text-tertiary)' }}
      >
        דשבורד
      </span>

      {!isDashboard && (
        <>
          <ChevronLeft
            size={14}
            style={{ color: 'var(--text-tertiary)' }}
          />
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            {currentTitle}
          </span>
        </>
      )}
    </div>
  );
};
