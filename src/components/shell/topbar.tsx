'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, Menu } from 'lucide-react';
import { TOOLS } from '@/lib/tools';
import { useSidebarStore } from '@/stores/sidebar';

const labelMap: Record<string, string> = {
  dashboard: 'דשבורד',
  ads: 'מודעות פייסבוק',
  budget: 'BudgetFlow',
  cpa: 'CPA Tracker',
  writer: 'MultiWrite',
  'ad-checker': 'בדיקת מודעות',
  settings: 'הגדרות',
  team: 'ניהול צוות',
  audit: 'יומן פעולות',
  reports: 'דוחות',
  campaigns: 'קמפיינים',
  clients: 'לקוחות',
  history: 'היסטוריה',
  archive: 'ארכיון',
  alerts: 'התראות',
  output: 'תוצאות',
};

function getSegmentLabel(segment: string): string {
  if (labelMap[segment]) return labelMap[segment];
  // Dynamic slug — decode URI-encoded Hebrew/Arabic so the breadcrumb
  // shows "שנקר-הנדסאים" instead of "%D7%A9%D7%A0..." gibberish.
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export const Topbar = () => {
  const pathname = usePathname();
  const toggle = useSidebarStore((s) => s.toggle);

  // Build breadcrumb segments
  const segments = pathname.split('/').filter(Boolean);
  // e.g. /ads/dashboard → ['ads', 'dashboard']

  const breadcrumbs = segments.map((seg, i) => ({
    label: getSegmentLabel(seg),
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));

  return (
    <div
      className="px-4 md:px-6 py-3 flex items-center gap-2"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--glass-border)',
      }}
    >
      {/* Hamburger — mobile only */}
      <button
        onClick={toggle}
        className="btn-icon md:hidden shrink-0"
        title="תפריט"
      >
        <Menu size={20} />
      </button>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
        <Link
          href="/dashboard"
          className="text-sm shrink-0 hover:underline"
          style={{ color: 'var(--text-tertiary)' }}
        >
          דשבורד
        </Link>

        {breadcrumbs
          .filter((b) => b.href !== '/dashboard')
          .map((crumb) => (
            <span key={crumb.href} className="flex items-center gap-1.5 min-w-0">
              <ChevronLeft
                size={14}
                className="shrink-0"
                style={{ color: 'var(--text-tertiary)' }}
              />
              {crumb.isLast ? (
                <span
                  className="text-sm font-medium truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-sm truncate hover:underline"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
      </div>
    </div>
  );
};
