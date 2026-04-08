import { X } from 'lucide-react'
import { useToast } from '@/components/writer/ToastContext'

const styles = {
  error: 'bg-red-500/90 text-white backdrop-blur-xl',
  success: 'bg-green-500/90 text-white backdrop-blur-xl',
  info: 'backdrop-blur-xl',
}

export default function Toast() {
  const { toasts, dismissToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 left-5 z-[100] flex flex-col gap-2 max-w-sm" dir="rtl">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium animate-[slideIn_0.3s_ease-out] border border-white/[0.08] ${styles[toast.type] || styles.error}`}
          style={toast.type === 'info' ? { background: 'var(--glass-bg-elevated)', color: 'var(--text-primary)' } : undefined}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
