'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, AlertTriangle, Settings } from 'lucide-react';

const navItems = [
  { href: '/cpa', label: 'דשבורד', icon: LayoutDashboard },
  { href: '/cpa/alerts', label: 'התראות', icon: AlertTriangle },
  { href: '/cpa/settings', label: 'הגדרות', icon: Settings },
];

function CpaNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/cpa') return pathname === '/cpa';
    return pathname.startsWith(href);
  };

  return (
    <div className="px-6 mb-4" style={{ borderBottom: '1px solid var(--glass-border)' }}>
      <nav className="flex gap-1 -mb-px">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors"
              style={{
                color: active ? 'var(--accent-fg)' : 'var(--text-secondary)',
                borderBottomColor: active ? 'var(--accent)' : 'transparent',
              }}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function CpaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <CpaNav />
      {children}
    </div>
  );
}
