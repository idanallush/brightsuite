'use client';

import { useAuth } from '@/hooks/use-auth';
import { motion } from 'motion/react';
import { CheckCircle2, Calendar } from 'lucide-react';

const roleLabelMap: Record<string, string> = {
  admin: 'מנהל',
  manager: 'מנהל חשבון',
  viewer: 'צופה',
};

const roleColorMap: Record<string, { bg: string; text: string }> = {
  admin: { bg: 'var(--accent-subtle)', text: 'var(--accent)' },
  manager: { bg: 'var(--info-subtle)', text: 'var(--info-text)' },
  viewer: { bg: 'var(--warning-subtle)', text: 'var(--warning-text)' },
};

export default function ProfilePage() {
  const { user } = useAuth();

  const avatarUrl = user?.avatarUrl;
  const firstLetter = user?.name?.charAt(0)?.toUpperCase() || '?';
  const roleColors = roleColorMap[user?.role || ''] || roleColorMap.viewer;

  return (
    <div className="space-y-5 max-w-2xl">
      {/* User Profile Card */}
      <motion.div
        className="glass-card p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div className="flex items-center gap-5">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={user?.name || ''}
              className="w-16 h-16 rounded-full shrink-0 object-cover"
              style={{
                border: '2px solid var(--glass-border-strong)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold shrink-0"
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-text)',
                boxShadow: '0 2px 8px rgba(37,99,235,0.2)',
              }}
            >
              {firstLetter}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h2
              className="text-lg font-semibold leading-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {user?.name}
            </h2>
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              {user?.email}
            </p>
            <span
              className="inline-block mt-2.5 text-xs px-3 py-1 rounded-full font-medium"
              style={{
                background: roleColors.bg,
                color: roleColors.text,
              }}
            >
              {roleLabelMap[user?.role || ''] || user?.role}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Connected via Google */}
      <motion.div
        className="glass-card p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.08 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Google "G" icon */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border-strong)' }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            </div>

            <div>
              <h3
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                מחובר באמצעות Google
              </h3>
              <p
                className="text-xs mt-0.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                {user?.email}
              </p>
            </div>
          </div>

          <div
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
            style={{
              background: 'var(--success-subtle)',
              color: 'var(--success-text)',
            }}
          >
            <CheckCircle2 size={14} />
            <span>מאומת</span>
          </div>
        </div>
      </motion.div>

      {/* Account Info */}
      <motion.div
        className="glass-card p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.16 }}
      >
        <h3
          className="text-sm font-semibold mb-4"
          style={{ color: 'var(--text-primary)' }}
        >
          פרטי חשבון
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              שם מלא
            </span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {user?.name}
            </span>
          </div>

          <div style={{ height: 1, background: 'var(--glass-border)' }} />

          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              אימייל
            </span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }} dir="ltr">
              {user?.email}
            </span>
          </div>

          <div style={{ height: 1, background: 'var(--glass-border)' }} />

          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              תפקיד
            </span>
            <span
              className="text-xs px-2.5 py-0.5 rounded-full font-medium"
              style={{
                background: roleColors.bg,
                color: roleColors.text,
              }}
            >
              {roleLabelMap[user?.role || ''] || user?.role}
            </span>
          </div>

          <div style={{ height: 1, background: 'var(--glass-border)' }} />

          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              אימות
            </span>
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Google
              </span>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--glass-border)' }} />

          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              מזהה משתמש
            </span>
            <span
              className="text-xs font-mono px-2 py-0.5 rounded"
              style={{
                color: 'var(--text-muted)',
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
              }}
              dir="ltr"
            >
              #{user?.id}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
