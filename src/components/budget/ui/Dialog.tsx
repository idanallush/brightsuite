'use client'

import { type ReactNode, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/budget/ui/Button'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  maxWidth?: string
}

export const Dialog = ({ open, onClose, title, children, maxWidth = '560px' }: DialogProps) => {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, handleEscape])

  if (!open) return null

  return createPortal(
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog animate-enter"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold leading-tight">{title}</h2>
            <Button variant="icon" onClick={onClose}>
              <X size={18} />
            </Button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  )
}
