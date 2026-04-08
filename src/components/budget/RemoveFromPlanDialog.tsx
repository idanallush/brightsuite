import { useState, useEffect } from 'react'
import { CalendarOff } from 'lucide-react'
import { Dialog } from '@/components/budget/ui/Dialog'
import { Input } from '@/components/budget/ui/Input'
import { Button } from '@/components/budget/ui/Button'
import { toast } from '@/components/budget/ui/Toast'
import { useRemoveFromPlan } from '@/hooks/budget/useCampaigns'
import { formatCurrency, formatDateFull, todayISO } from '@/lib/budget/format'
import type { CampaignWithBudget } from '@/lib/budget/types'

interface RemoveFromPlanDialogProps {
  open: boolean
  onClose: () => void
  campaign: CampaignWithBudget | null
  clientId: string
}

export const RemoveFromPlanDialog = ({ open, onClose, campaign, clientId }: RemoveFromPlanDialogProps) => {
  const removeFromPlan = useRemoveFromPlan()
  const [effectiveDate, setEffectiveDate] = useState('')

  useEffect(() => {
    if (open) {
      setEffectiveDate(todayISO())
    }
  }, [open])

  const handleConfirm = async () => {
    if (!campaign || !effectiveDate) return

    try {
      await removeFromPlan.mutateAsync({
        campaign_id: campaign.id,
        client_id: clientId,
        effective_date: effectiveDate,
      })
      toast.success(`"${campaign.name}" הוצא מתוכנית התקציב`)
      onClose()
    } catch {
      toast.error('שגיאה בהוצאה מהתוכנית')
    }
  }

  if (!campaign) return null

  // Calculate what forecast would be up to effective date
  const startDate = new Date(campaign.start_date)
  const endDate = new Date(effectiveDate)
  const today = new Date(todayISO())
  const daysActive = Math.max(0, Math.ceil((Math.min(endDate.getTime(), today.getTime()) - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
  const estimatedSpend = campaign.current_daily_budget * daysActive

  return (
    <Dialog open={open} onClose={onClose} title="הוצאה מתוכנית התקציב" maxWidth="420px">
      <div className="flex flex-col gap-5">
        {/* Campaign info */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[rgba(245,158,11,0.15)] flex items-center justify-center shrink-0">
              <CalendarOff size={18} className="text-warning" />
            </div>
            <div>
              <p className="font-medium text-sm">{campaign.name}</p>
              <p className="text-xs text-text-muted">
                תקציב יומי: {formatCurrency(campaign.current_daily_budget)} . צפי נוכחי: {formatCurrency(campaign.monthly_forecast)}
              </p>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <p className="text-sm text-text-secondary leading-relaxed" style={{ lineHeight: 1.7 }}>
          הקמפיין יוצא מתוכנית התקציב החודשית. הצפי יחושב רק עד התאריך שנבחר.
        </p>

        {/* Date picker */}
        <Input
          label="תאריך הוצאה מהתוכנית"
          type="date"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
        />

        {/* Preview */}
        {effectiveDate && (
          <div className="glass-card p-3 flex items-center justify-between">
            <span className="text-xs text-text-muted">צפי מעודכן (עד {formatDateFull(effectiveDate)})</span>
            <span className="text-sm font-semibold text-warning">{formatCurrency(estimatedSpend)}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2 border-t border-[var(--glass-border)]">
          <Button variant="ghost" onClick={onClose}>ביטול</Button>
          <Button onClick={handleConfirm} disabled={removeFromPlan.isPending || !effectiveDate}>
            {removeFromPlan.isPending ? 'מעדכן...' : 'הוצא מהתוכנית'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
