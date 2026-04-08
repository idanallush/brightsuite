import { AlertTriangle } from 'lucide-react'
import { Dialog } from '@/components/budget/ui/Dialog'
import { Button } from '@/components/budget/ui/Button'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  isPending?: boolean
}

export const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'מחק',
  isPending = false,
}: ConfirmDialogProps) => {
  return (
    <Dialog open={open} onClose={onClose} title={title} maxWidth="400px">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[rgba(239,68,68,0.15)] flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-danger" />
          </div>
          <p className="text-sm leading-relaxed">{message}</p>
        </div>

        <div className="flex gap-3 justify-end pt-2 border-t border-[var(--glass-border)]">
          <Button variant="ghost" onClick={onClose}>ביטול</Button>
          <Button variant="danger" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'מוחק...' : confirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
