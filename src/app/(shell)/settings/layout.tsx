'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { User, Users, ClipboardList } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface TabItem {
  label: string;
  href: string;
  icon: typeof User;
  adminOnly?: boolean;
}

const tabs: TabItem[] = [
  { label: 'פרופיל', href: '/settings', icon: User },
  { label: 'ניהול צוות', href: '/settings/team', icon: Users, adminOnly: true },
  { label: 'לוג פעילות', href: '/settings/audit', icon: ClipboardList },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || isAdmin);

  return (
    <div>
      <h1
        className="text-2xl font-semibold mb-6"
        style={{ color: 'var(--text-primary)' }}
      >
        הגדרות
      </h1>

      <div className="flex gap-2 mb-6">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors"
              style={{
                background: isActive ? '#2563eb' : 'rgba(255,255,255,0.6)',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                border: isActive ? 'none' : '1px solid var(--border)',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
