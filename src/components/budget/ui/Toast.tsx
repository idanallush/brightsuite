'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'

export type ToastType = 'success' | 'error'

interface ToastMessage {
  id: string
  type: ToastType
  message: string
}

let addToastFn: ((type: ToastType, message: string) => void) | null = null

export const toast = {
  success: (message: string) => addToastFn?.('success', message),
  error: (message: string) => addToastFn?.('error', message),
}

export const ToastContainer = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    addToastFn = (type: ToastType, message: string) => {
      const id = crypto.randomUUID()
      setToasts((prev) => [...prev, { id, type, message }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 4000)
    }
    return () => {
      addToastFn = null
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="bf-toast-stack" dir="rtl">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`bf-toast bf-toast--${t.type}`}
          role="status"
          aria-live={t.type === 'error' ? 'assertive' : 'polite'}
        >
          <span className="bf-toast__icon" aria-hidden="true">
            {t.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          </span>
          <span className="bf-toast__message">{t.message}</span>
          <button
            type="button"
            className="bf-toast__close"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            aria-label="סגור"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
