'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  Globe,
  Clock,
  Loader2,
  ExternalLink,
} from 'lucide-react';

interface FacebookStatus {
  connected: boolean;
  userName?: string;
  tokenExpiry?: string;
}

export default function ConnectionsPage() {
  const { user } = useAuth();
  const [fbStatus, setFbStatus] = useState<FacebookStatus | null>(null);
  const [fbLoading, setFbLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchFbStatus = useCallback(async () => {
    setFbLoading(true);
    try {
      const res = await fetch('/api/account/facebook/status');
      const data = await res.json();
      setFbStatus(data);
    } catch {
      setFbStatus({ connected: false });
    } finally {
      setFbLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFbStatus();
  }, [fetchFbStatus]);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch('/api/account/facebook/disconnect', { method: 'POST' });
      setFbStatus({ connected: false });
    } catch {
      // silently fail
    } finally {
      setDisconnecting(false);
    }
  };

  const formatExpiry = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('he-IL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Facebook Connection Card */}
      <motion.div
        className="glass-card p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Facebook icon */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: '#1877F2',
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="white"
                aria-hidden="true"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </div>

            <div>
              <h3
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Facebook
              </h3>
              <p
                className="text-xs mt-0.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                חיבור לחשבון מודעות Facebook
              </p>
            </div>
          </div>

          {!fbLoading && (
            <div
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
              style={{
                background: fbStatus?.connected
                  ? 'var(--success-subtle)'
                  : 'var(--danger-subtle)',
                color: fbStatus?.connected
                  ? 'var(--success-text)'
                  : 'var(--danger-text)',
              }}
            >
              {fbStatus?.connected ? (
                <>
                  <Wifi size={14} />
                  <span>מחובר</span>
                </>
              ) : (
                <>
                  <WifiOff size={14} />
                  <span>לא מחובר</span>
                </>
              )}
            </div>
          )}

          {fbLoading && (
            <Loader2
              size={16}
              className="animate-spin"
              style={{ color: 'var(--text-muted)' }}
            />
          )}
        </div>

        {/* Connected state details */}
        {!fbLoading && fbStatus?.connected && (
          <div className="space-y-3 mb-4">
            <div style={{ height: 1, background: 'var(--glass-border)' }} />

            <div className="flex items-center justify-between">
              <span
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                שם משתמש
              </span>
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {fbStatus.userName}
              </span>
            </div>

            {fbStatus.tokenExpiry && (
              <>
                <div
                  style={{ height: 1, background: 'var(--glass-border)' }}
                />
                <div className="flex items-center justify-between">
                  <span
                    className="text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    תוקף טוקן
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Clock
                      size={14}
                      style={{ color: 'var(--text-muted)' }}
                    />
                    <span
                      className="text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                      dir="ltr"
                    >
                      {formatExpiry(fbStatus.tokenExpiry)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Info text */}
        <div
          className="text-xs rounded-lg px-3 py-2.5 mb-4"
          style={{
            background: 'var(--info-subtle)',
            color: 'var(--info-text)',
          }}
        >
          החיבור משותף לכלי FB Ads Tool ו-CPA Tracker
        </div>

        {/* Action button */}
        {!fbLoading && (
          <>
            {fbStatus?.connected ? (
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex items-center justify-center gap-2 w-full text-sm font-medium py-2.5 rounded-xl transition-colors"
                style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border-strong)',
                  color: 'var(--danger-text)',
                  opacity: disconnecting ? 0.6 : 1,
                  cursor: disconnecting ? 'not-allowed' : 'pointer',
                }}
              >
                {disconnecting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <XCircle size={16} />
                )}
                <span>{disconnecting ? 'מנתק...' : 'נתק חיבור'}</span>
              </button>
            ) : (
              <a
                href="/api/ads/auth/facebook"
                className="flex items-center justify-center gap-2 w-full text-sm font-medium py-2.5 rounded-xl transition-colors"
                style={{
                  background: '#1877F2',
                  color: '#ffffff',
                  border: 'none',
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={16} />
                <span>חבר חשבון Facebook</span>
              </a>
            )}
          </>
        )}
      </motion.div>

      {/* Google Connection Card (read-only) */}
      <motion.div
        className="glass-card p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.08 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Google "G" icon */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border-strong)',
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
            </div>

            <div>
              <h3
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Google
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
            <span>מחובר</span>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div style={{ height: 1, background: 'var(--glass-border)' }} />

          <div className="flex items-center justify-between">
            <span
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              אימייל
            </span>
            <span
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
              dir="ltr"
            >
              {user?.email}
            </span>
          </div>

          <div style={{ height: 1, background: 'var(--glass-border)' }} />

          <div className="flex items-center justify-between">
            <span
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              סוג חיבור
            </span>
            <div className="flex items-center gap-1.5">
              <Globe size={14} style={{ color: 'var(--text-muted)' }} />
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                התחברות ראשית
              </span>
            </div>
          </div>
        </div>

        {/* Info text */}
        <div
          className="text-xs rounded-lg px-3 py-2.5"
          style={{
            background: 'var(--info-subtle)',
            color: 'var(--info-text)',
          }}
        >
          חשבון Google משמש להתחברות ולסנכרון נתוני BudgetFlow
        </div>
      </motion.div>
    </div>
  );
}
