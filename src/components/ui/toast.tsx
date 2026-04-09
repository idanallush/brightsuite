'use client';

import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useToastStore, type Toast } from '@/stores/toast';

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
} as const;

const iconColors = {
  success: '#22c55e',
  error: '#ef4444',
  info: '#3b82f6',
} as const;

const ToastItem = ({ toast }: { toast: Toast }) => {
  const removeToast = useToastStore((s) => s.removeToast);
  const Icon = icons[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      dir="rtl"
      className="pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md"
      style={{
        background: 'rgba(255, 255, 255, 0.85)',
        borderColor: '#e5e5e0',
        minWidth: 280,
        maxWidth: 400,
      }}
    >
      <Icon
        size={20}
        strokeWidth={2}
        style={{ color: iconColors[toast.type], flexShrink: 0 }}
      />
      <span
        className="flex-1 text-sm leading-relaxed"
        style={{ color: '#1a1a1a' }}
      >
        {toast.message}
      </span>
      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 rounded-md p-1 transition-colors hover:bg-black/5"
        style={{ color: '#8a877f' }}
        aria-label="סגור"
      >
        <X size={14} strokeWidth={2} />
      </button>
    </motion.div>
  );
};

export const ToastContainer = () => {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      className="pointer-events-none fixed bottom-4 left-4 z-[9999] flex flex-col-reverse gap-2"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
};
