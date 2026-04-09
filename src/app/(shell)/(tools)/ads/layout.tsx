'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutGrid, FileText, Settings } from 'lucide-react';
import { TokenExpiryBanner } from "@/components/ads/auth/token-expiry-banner";

const navItems = [
  { href: '/ads/dashboard', label: 'ספריית מודעות', icon: LayoutGrid },
  { href: '/ads/reports', label: 'דוחות', icon: FileText },
  { href: '/ads/settings', label: 'הגדרות', icon: Settings },
];

function AdsNav() {
  const pathname = usePathname();

  // Don't show nav on landing/login page
  if (pathname === '/ads') return null;

  const isActive = (href: string) => {
    if (href === '/ads/dashboard') {
      return pathname === '/ads/dashboard' || pathname === '/ads/campaigns';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="px-6" style={{ borderBottom: '1px solid var(--glass-border)' }}>
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

export default function AdsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-full">
      <TokenExpiryBanner />
      <AdsNav />
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
