'use client';

import Link from 'next/link';
import {
  Shield,
  Wallet,
  Target,
  Image,
  PenLine,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { TOOLS } from '@/lib/tools';

const iconMap: Record<string, LucideIcon> = {
  Shield,
  Wallet,
  Target,
  Image,
  PenLine,
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'בוקר טוב';
  if (hour >= 12 && hour < 17) return 'צהריים טובים';
  return 'ערב טוב';
};

export default function DashboardPage() {
  const { user, hasToolAccess } = useAuth();

  const accessibleTools = TOOLS.filter((tool) => hasToolAccess(tool.slug));
  const greeting = getGreeting();
  const userName = user?.name || '';

  return (
    <div>
      <div className="mb-6">
        <h1
          className="text-2xl font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {greeting}, {userName}
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          מה נעשה היום?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accessibleTools.map((tool) => {
          const Icon = iconMap[tool.icon] || Shield;

          return (
            <Link
              key={tool.slug}
              href={tool.href}
              className="glass-card block p-5"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: tool.color }}
                >
                  <Icon size={20} color="#ffffff" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {tool.name}
                  </h3>
                  <p
                    className="text-sm mt-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {tool.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
