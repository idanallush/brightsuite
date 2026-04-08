'use client';

import { motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';

interface SyncProgressProps {
  /** Message to display, e.g. "מסנכרן נתונים..." */
  message?: string;
  /** Progress 0-100. If undefined, shows indeterminate animation */
  progress?: number;
  /** Subtitle text below message */
  subtitle?: string;
}

export const SyncProgress = ({
  message = 'מסנכרן נתונים...',
  progress,
  subtitle,
}: SyncProgressProps) => {
  const isIndeterminate = progress === undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 gap-4"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
      >
        <RefreshCw size={24} style={{ color: 'var(--accent)' }} />
      </motion.div>

      <div className="text-center">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {message}
        </p>
        {subtitle && (
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div
        className="w-48 h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--card-bg-active, rgba(0,0,0,0.04))' }}
      >
        {isIndeterminate ? (
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'var(--accent)', width: '40%' }}
            animate={{ x: ['-100%', '250%'] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
          />
        ) : (
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'var(--accent)' }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        )}
      </div>

      {progress !== undefined && (
        <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
          {Math.round(progress)}%
        </span>
      )}
    </motion.div>
  );
};

/**
 * Inline sync indicator — smaller, for use inside cards or sections
 */
export const SyncIndicator = ({ message = 'מסנכרן...' }: { message?: string }) => (
  <div className="flex items-center gap-2 py-2">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
    >
      <RefreshCw size={14} style={{ color: 'var(--accent)' }} />
    </motion.div>
    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
      {message}
    </span>
  </div>
);
