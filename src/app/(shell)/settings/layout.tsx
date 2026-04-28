'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { User, Users, ClipboardList, Link2, Cpu } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { motion } from 'motion/react';

interface TabItem {
  label: string;
  href: string;
  icon: typeof User;
  adminOnly?: boolean;
}

const tabs: TabItem[] = [
  { label: 'פרופיל', href: '/settings', icon: User },
  { label: 'ניהול צוות', href: '/settings/team', icon: Users, adminOnly: true },
  { label: 'חיבורים', href: '/settings/connections', icon: Link2 },
  { label: 'לוג פעילות', href: '/settings/audit', icon: ClipboardList },
  { label: 'מערכת', href: '/settings/system', icon: Cpu, adminOnly: true },
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

  const isActive = (href: string) => {
    if (href === '/settings') return pathname === '/settings';
    return pathname.startsWith(href);
  };

  return (
    <div>
      <motion.h1
        className="text-2xl font-semibold mb-1"
        style={{ color: 'var(--text-primary)' }}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        הגדרות
      </motion.h1>

      <motion.p
        className="text-sm mb-5"
        style={{ color: 'var(--text-muted)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.05 }}
      >
        ניהול פרופיל, צוות והרשאות
      </motion.p>

      <motion.div
        className="mb-6"
        style={{ borderBottom: '1px solid var(--glass-border)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.08 }}
      >
        <nav className="flex gap-1 -mb-px">
          {visibleTabs.map((tab) => {
            const active = isActive(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors"
                style={{
                  color: active ? 'var(--accent-fg)' : 'var(--text-secondary)',
                  borderBottomColor: active ? 'var(--accent)' : 'transparent',
                }}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.12 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
