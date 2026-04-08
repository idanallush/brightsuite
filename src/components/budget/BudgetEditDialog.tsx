import { useState, useEffect } from 'react'
import { DollarSign, ArrowLeft } from 'lucide-react'
import { Dialog } from '@/components/budget/ui/Dialog'
import { Input } from '@/components/budget/ui/Input'
import { Button } from '@/components/budget/ui/Button'
import { toast } from '@/components/budget/ui/Toast'
import { useUpdateBudget } from '@/hooks/budget/useCampaigns'
import { todayISO, formatCurrency, formatDateFull } from '@/lib/budget/format'
import type { CampaignWithBudget } from '@/lib/budget/types'

interface BudgetEditDialogProps {
  open: boolean
  onClose: () => void
  campaign: CampaignWithBudget | null
  clientId: string
}

export const BudgetEditDialog = ({ open, onClose, campaign, clientId }: BudgetEditDialogProps) => {
  const updateBudget = useUpdateBudget()
  const [newBudget, setNewBudget] = useState('')
  const [effectiveDate, setEffectiveDate] = useState(todayISO())
  const [endDate, setEndDate] = useState('')

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setNewBudget('')
      setEffectiveDate(todayISO())
      setEndDate('')
    }
  }, [open])

  const handleSubmit = async () => {
    if (!campaign || !newBudget) return
    const amount = Number(newBudget)
    if (amount <= 0 || amount === campaign.current_daily_budget) return

    try {
      await updateBudget.mutateAsync({
        campaign_id: campaign.id,
        client_id: clientId,
        new_budget: amount,
        effective_date: effectiveDate,
        end_date: endDate || undefined,
        old_budget: campaign.current_daily_budget,
      })
      toast.success(
        `התקציב שונה מ-${formatCurrency(campaign.current_daily_budget)} ל-${formatCurrency(amount)}, החל מ-${formatDateFull(effectiveDate)}`
      )
      onClose()
    } catch {
      toast.error('שגיאה בעדכון תקציב')
    }
  }

  if (!campaign) return null

  const hasChange = newBudget && Number(newBudget) > 0 && Number(newBudget) !== campaign.current_daily_budget

  return (
    <Dialog open={open} onClose={onClose} title="שינוי תקציב" maxWidth="420px">
      <div className="flex flex-col gap-5">
        {/* Campaign name + current budget */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-[rgba(37,99,235,0.15)] flex items-center justify-center shrink-0">
              <DollarSign size={18} className="text-accent" />
            </div>
            <div>
              <p className="font-medium text-sm">{campaign.name}</p>
              <p className="text-xs text-text-muted">{campaign.campaign_type ?? campaign.platform}</p>
            </div>
          </div>
          <div className="text-center py-2">
            <p className="text-xs text-text-muted mb-1">תקציב נוכחי</p>
            <p className="text-2xl font-semibold">{formatCurrency(campaign.current_daily_budget)} <span className="text-sm text-text-secondary font-normal">ליום</span></p>
          </div>
        </div>

        {/* New budget input */}
        <Input
          label="תקציב יומי חדש (₪)"
          type="number"
          placeholder={String(campaign.current_daily_budget)}
          value={newBudget}
          onChange={(e) => setNewBudget(e.target.value)}
          min={0}
        />

        {/* Effective date */}
        <Input
          label="החל מתאריך"
          type="date"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
        />

        {/* Optional end date */}
        <Input
          label="עד תאריך (אופציונלי)"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        {/* Change preview */}
        {hasChange && (
          <div className="glass-card p-4 flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-xs text-text-muted mb-1">קודם</p>
              <p className="font-semibold text-text-secondary">{formatCurrency(campaign.current_daily_budget)}</p>
            </div>
            <ArrowLeft size={18} className="text-accent" />
            <div className="text-center">
              <p className="text-xs text-text-muted mb-1">חדש</p>
              <p className="font-semibold text-accent">{formatCurrency(Number(newBudget))}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2 border-t border-[var(--glass-border)]">
          <Button variant="ghost" onClick={onClose}>ביטול</Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasChange || updateBudget.isPending}
          >
            {updateBudget.isPending ? 'מעדכן...' : 'שנה תקציב'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
