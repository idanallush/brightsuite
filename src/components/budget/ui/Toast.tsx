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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="toast flex items-center gap-3 animate-enter">
          {t.type === 'success' ? (
            <CheckCircle size={18} className="text-success" />
          ) : (
            <AlertCircle size={18} className="text-danger" />
          )}
          <span>{t.message}</span>
          <button
            className="btn-icon !w-6 !h-6"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
