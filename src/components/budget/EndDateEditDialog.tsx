import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { Dialog } from '@/components/budget/ui/Dialog'
import { Input } from '@/components/budget/ui/Input'
import { Button } from '@/components/budget/ui/Button'
import { toast } from '@/components/budget/ui/Toast'
import { formatDateFull } from '@/lib/budget/format'
import { useQueryClient } from '@tanstack/react-query'
import type { CampaignWithBudget } from '@/lib/budget/types'

interface EndDateEditDialogProps {
  open: boolean
  onClose: () => void
  campaign: CampaignWithBudget | null
  clientId: string
}

export const EndDateEditDialog = ({ open, onClose, campaign, clientId }: EndDateEditDialogProps) => {
  const queryClient = useQueryClient()
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && campaign) {
      setEndDate(campaign.end_date ?? '')
    }
  }, [open, campaign])

  const handleSubmit = async () => {
    if (!campaign) return

    setSaving(true)
    try {
      const res = await fetch(`/api/budget/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ end_date: endDate || null }),
      })
      if (!res.ok) throw new Error('Failed to update')

      queryClient.invalidateQueries({ queryKey: ['campaigns', clientId] })

      if (endDate) {
        toast.success(`תאריך סיום עודכן ל-${formatDateFull(endDate)}`)
      } else {
        toast.success('תאריך סיום הוסר -- הקמפיין רץ ללא הגבלה')
      }
      onClose()
    } catch {
      toast.error('שגיאה בעדכון תאריך סיום')
    } finally {
      setSaving(false)
    }
  }

  if (!campaign) return null

  return (
    <Dialog open={open} onClose={onClose} title="עריכת תאריך סיום" maxWidth="400px">
      <div className="flex flex-col gap-5">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--card-bg-hover)] flex items-center justify-center shrink-0">
              <Calendar size={18} className="text-text-secondary" />
            </div>
            <div>
              <p className="font-medium text-sm">{campaign.name}</p>
              <p className="text-xs text-text-muted">
                {campaign.end_date
                  ? `תאריך סיום נוכחי: ${formatDateFull(campaign.end_date)}`
                  : 'אין תאריך סיום -- רץ ללא הגבלה'}
              </p>
            </div>
          </div>
        </div>

        <Input
          label="תאריך סיום"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        {endDate && (
          <button
            className="text-xs text-text-muted hover:text-text-secondary transition-colors text-start"
            onClick={() => setEndDate('')}
          >
            הסר תאריך סיום (רץ ללא הגבלה)
          </button>
        )}

        <div className="flex gap-3 justify-end pt-2 border-t border-[var(--glass-border)]">
          <Button variant="ghost" onClick={onClose}>ביטול</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'שומר...' : 'שמור'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
