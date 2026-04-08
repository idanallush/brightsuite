'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Settings,
  LogOut,
  Shield,
  Wallet,
  Target,
  Image,
  PenLine,
  type LucideIcon,
} from 'lucide-react';
import { TOOLS } from '@/lib/tools';
import { useAuth } from '@/hooks/use-auth';

const iconMap: Record<string, LucideIcon> = {
  Shield,
  Wallet,
  Target,
  Image,
  PenLine,
};

export const Sidebar = () => {
  const pathname = usePathname();
  const { user, logout, hasToolAccess } = useAuth();

  const accessibleTools = TOOLS.filter((tool) => hasToolAccess(tool.slug));

  const firstLetter = user?.name?.charAt(0) || '?';

  return (
    <aside className="glass-panel w-64 shrink-0 flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className="p-5 pb-4">
        <h1
          className="text-lg font-semibold"
          style={{ color: 'var(--accent)' }}
        >
          BrightSuite
        </h1>
        <p
          className="text-xs mt-0.5"
          style={{ color: 'var(--text-tertiary)' }}
        >
          כלים לסוכנות
        </p>
      </div>

      {/* Divider */}
      <div
        className="mx-4"
        style={{ borderBottom: '1px solid var(--glass-border)', opacity: 0.5 }}
      />

      {/* Navigation */}
      <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
        {accessibleTools.map((tool) => {
          const Icon = iconMap[tool.icon] || Shield;
          const isActive = pathname.startsWith(tool.href);

          return (
            <Link
              key={tool.slug}
              href={tool.href}
              className="flex items-center gap-3 py-2 px-3 rounded-xl transition-colors"
              style={{
                background: isActive ? 'var(--accent-subtle)' : undefined,
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                borderInlineStart: isActive
                  ? '3px solid var(--accent)'
                  : '3px solid transparent',
              }}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{tool.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div
        className="mx-4"
        style={{ borderBottom: '1px solid var(--glass-border)', opacity: 0.5 }}
      />

      {/* Bottom section */}
      <div className="p-3 flex flex-col gap-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 py-2 px-3 rounded-xl transition-colors"
          style={{
            background: pathname === '/settings' ? 'var(--accent-subtle)' : undefined,
            color: pathname === '/settings' ? 'var(--accent)' : 'var(--text-secondary)',
          }}
        >
          <Settings size={18} />
          <span className="text-sm font-medium">הגדרות</span>
        </Link>

        {user && (
          <div className="flex items-center gap-3 py-2 px-3">
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
              style={{ background: 'var(--accent)' }}
            >
              {firstLetter}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium truncate"
                style={{ color: 'var(--text-primary)' }}
              >
                {user.name}
              </p>
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  color: 'var(--accent)',
                  background: 'var(--accent-subtle)',
                }}
              >
                {user.role === 'admin' ? 'אדמין' : 'משתמש'}
              </span>
            </div>
            <button
              onClick={logout}
              className="btn-icon shrink-0"
              title="התנתק"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
