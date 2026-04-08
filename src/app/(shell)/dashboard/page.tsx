'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import {
  Shield,
  Wallet,
  Target,
  Image,
  PenLine,
  ArrowLeft,
  Sparkles,
  Users,
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
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
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
      </motion.div>

      {accessibleTools.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="glass-card p-8 max-w-lg mx-auto text-center">
            <motion.div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--accent-purple, #6d4c9e)' }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
            >
              <Sparkles size={24} color="#ffffff" />
            </motion.div>
            <h2
              className="text-xl font-semibold mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              ברוך הבא ל-BrightSuite!
            </h2>
            <p
              className="text-sm mb-6 leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              המנהל יקצה לך גישה לכלים בקרוב. בינתיים, תוכל לעדכן את הפרופיל שלך בהגדרות.
            </p>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: 'var(--accent-purple, #6d4c9e)',
                color: '#ffffff',
              }}
            >
              עבור להגדרות
              <ArrowLeft size={16} />
            </Link>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accessibleTools.map((tool, i) => {
            const Icon = iconMap[tool.icon] || Shield;

            return (
              <motion.div
                key={tool.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: i * 0.08,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
              >
                <Link
                  href={tool.href}
                  className="glass-card block p-5 group"
                >
                  <div className="flex items-start gap-4">
                    <motion.div
                      className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: tool.color }}
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                      <Icon size={20} color="#ffffff" />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3
                          className="text-lg font-semibold"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {tool.name}
                        </h3>
                        <ArrowLeft
                          size={16}
                          className="opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-x-1 group-hover:translate-x-0"
                          style={{ color: tool.color }}
                        />
                      </div>
                      <p
                        className="text-sm mt-1"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {tool.description}
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {user?.role === 'admin' && (
        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Link
            href="/settings/team"
            className="inline-flex items-center gap-1.5 text-xs transition-colors hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Users size={14} />
            ניהול צוות והרשאות
          </Link>
        </motion.div>
      )}
    </div>
  );
}
