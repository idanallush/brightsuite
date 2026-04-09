'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, Video, Settings } from 'lucide-react';

const navItems = [
  { href: '/ads-hub', label: 'סקירה', icon: BarChart3 },
  { href: '/ads-hub/video-library', label: 'ספריית וידאו', icon: Video },
  { href: '/ads-hub/settings', label: 'הגדרות', icon: Settings },
];

function AdsHubNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/ads-hub') {
      return pathname === '/ads-hub' || pathname.match(/^\/ads-hub\/\d/);
    }
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

export default function AdsHubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdsHubNav />
      {children}
    </div>
  );
}
