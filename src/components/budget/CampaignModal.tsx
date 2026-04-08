import { useState, useEffect } from 'react'
import { Dialog } from '@/components/budget/ui/Dialog'
import { Input } from '@/components/budget/ui/Input'
import { Select } from '@/components/budget/ui/Select'
import { Button } from '@/components/budget/ui/Button'
import { toast } from '@/components/budget/ui/Toast'
import { useCreateCampaign, useUpdateCampaignDetails } from '@/hooks/budget/useCampaigns'
import { todayISO } from '@/lib/budget/format'
import type { CampaignWithBudget } from '@/lib/budget/types'

interface CampaignModalProps {
  open: boolean
  onClose: () => void
  clientId: string
  campaign?: CampaignWithBudget | null
}

const campaignTypes = [
  'Sales', 'Awareness', 'Shopping', 'Brand', 'GDN',
  'Search', 'PMax', 'Remarketing', 'Leads', 'Traffic',
  'Engagement', 'Video', 'App',
]

export const CampaignModal = ({ open, onClose, clientId, campaign }: CampaignModalProps) => {
  const isEditing = !!campaign
  const createCampaign = useCreateCampaign()
  const updateCampaign = useUpdateCampaignDetails()

  const [name, setName] = useState('')
  const [technicalName, setTechnicalName] = useState('')
  const [platform, setPlatform] = useState<'facebook' | 'google'>('facebook')
  const [campaignType, setCampaignType] = useState('')
  const [dailyBudget, setDailyBudget] = useState('')
  const [startDate, setStartDate] = useState(todayISO())
  const [adLink, setAdLink] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (campaign) {
      setName(campaign.name)
      setTechnicalName(campaign.technical_name ?? '')
      setPlatform(campaign.platform)
      setCampaignType(campaign.campaign_type ?? '')
      setDailyBudget('')
      setStartDate(campaign.start_date)
      setAdLink(campaign.ad_link ?? '')
      setNotes(campaign.notes ?? '')
    } else {
      setName('')
      setTechnicalName('')
      setPlatform('facebook')
      setCampaignType('')
      setDailyBudget('')
      setStartDate(todayISO())
      setAdLink('')
      setNotes('')
    }
  }, [campaign, open])

  const handleSubmit = async () => {
    if (!name.trim()) return
    if (!isEditing && !dailyBudget) return

    try {
      if (!isEditing) {
        await createCampaign.mutateAsync({
          client_id: clientId,
          name: name.trim(),
          technical_name: technicalName.trim() || undefined,
          platform,
          campaign_type: campaignType || undefined,
          daily_budget: Number(dailyBudget),
          start_date: startDate,
          ad_link: adLink.trim() || undefined,
          notes: notes.trim() || undefined,
        })
        toast.success('קמפיין חדש נוסף בהצלחה')
      } else {
        await updateCampaign.mutateAsync({
          campaign_id: campaign!.id,
          client_id: clientId,
          name: name.trim(),
          technical_name: technicalName.trim() || null,
          campaign_type: campaignType || null,
          ad_link: adLink.trim() || null,
          notes: notes.trim() || null,
        })
        toast.success('פרטי קמפיין עודכנו')
      }
      onClose()
    } catch {
      toast.error('שגיאה בשמירת קמפיין')
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? 'עריכת פרטי קמפיין' : 'הוסף קמפיין חדש'}
      maxWidth="560px"
    >
      <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pe-2">
        <Input
          label="שם קמפיין"
          placeholder="לדוגמה: קמפיין המרות - מבצע חורף"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Input
          label="שם טכני"
          placeholder="Bright | Conv | Winter | 01.01.26"
          value={technicalName}
          onChange={(e) => setTechnicalName(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="פלטפורמה"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as 'facebook' | 'google')}
            disabled={isEditing}
          >
            <option value="facebook">Meta (Facebook)</option>
            <option value="google">Google Ads</option>
          </Select>

          <Select
            label="סוג קמפיין"
            value={campaignType}
            onChange={(e) => setCampaignType(e.target.value)}
          >
            <option value="">בחר סוג</option>
            {campaignTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </Select>
        </div>

        {/* Budget + date only for new campaigns */}
        {!isEditing && (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="תקציב יומי התחלתי (₪)"
              type="number"
              placeholder="200"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
            />
            <Input
              label="תאריך התחלה"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        )}

        {isEditing && (
          <div className="glass-card p-3 text-xs text-text-muted text-center">
            לשינוי תקציב או סטטוס — השתמש בכפתורים בטבלה
          </div>
        )}

        <Input
          label="קישור למודעה"
          type="url"
          placeholder="https://..."
          value={adLink}
          onChange={(e) => setAdLink(e.target.value)}
        />

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium tracking-wider text-text-muted">הערות</label>
          <textarea
            className="glass-input glass-textarea"
            placeholder="הערות (אופציונלי)"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end mt-5 pt-4 border-t border-[var(--glass-border)]">
        <Button variant="ghost" onClick={onClose}>ביטול</Button>
        <Button
          onClick={handleSubmit}
          disabled={!name.trim() || (!isEditing && !dailyBudget) || createCampaign.isPending || updateCampaign.isPending}
        >
          {(createCampaign.isPending || updateCampaign.isPending) ? 'שומר...' : isEditing ? 'שמור שינויים' : 'הוסף קמפיין'}
        </Button>
      </div>
    </Dialog>
  )
}
