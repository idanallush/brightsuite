'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Plus, History, Copy, Check, X, Trash2, RefreshCw, Pencil, StickyNote, Clock } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useClient, useDeleteClient, useUpdateClient } from '@/hooks/budget/useClients'
import { useCampaigns, useUpdateCampaignStatus, useUpdateCampaignDetails, useDeleteCampaign, useMetaSync, useGoogleSync, useBulkAction } from '@/hooks/budget/useCampaigns'
import { GlassPanel } from '@/components/budget/ui/GlassPanel'
import { Button } from '@/components/budget/ui/Button'
import { MetricCard } from '@/components/budget/ui/MetricCard'
import { SkeletonCard } from '@/components/budget/ui/Skeleton'
import { CampaignTable, NoCampaignsState } from '@/components/budget/CampaignTable'
import { CampaignModal } from '@/components/budget/CampaignModal'
import { BudgetEditDialog } from '@/components/budget/BudgetEditDialog'
import { RemoveFromPlanDialog } from '@/components/budget/RemoveFromPlanDialog'
import { EndDateEditDialog } from '@/components/budget/EndDateEditDialog'
import { ChangelogPanel } from '@/components/budget/ChangelogPanel'
import { ConfirmDialog } from '@/components/budget/ConfirmDialog'
import { BulkActionBar } from '@/components/budget/BulkActionBar'
import { MonthProgressBar } from '@/components/budget/MonthProgressBar'
import { toast } from '@/components/budget/ui/Toast'
import { formatCurrency, formatDateTime, todayISO, getDaysInMonth } from '@/lib/budget/format'
import type { CampaignWithBudget, CampaignStatus } from '@/lib/budget/types'

const hebrewMonths = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]

const getMonthlyBudgetKey = (clientId: string) => {
  const now = new Date()
  return `bf_monthly_budget_${clientId}_${now.getFullYear()}_${now.getMonth()}`
}

export default function ClientViewPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const { hasToolAccess, loading: authLoading } = useAuth()
  const slug = params.slug ?? ''
  const { data: client, isLoading: clientLoading } = useClient(slug)
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns(client?.id ?? '')
  const updateStatus = useUpdateCampaignStatus()
  const updateCampaignDetails = useUpdateCampaignDetails()
  const deleteCampaign = useDeleteCampaign()
  const deleteClient = useDeleteClient()
  const updateClient = useUpdateClient()
  const metaSync = useMetaSync()
  const googleSync = useGoogleSync()
  const bulkAction = useBulkAction()

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<CampaignWithBudget | null>(null)
  const [budgetEditCampaign, setBudgetEditCampaign] = useState<CampaignWithBudget | null>(null)
  const [changelogCampaignId, setChangelogCampaignId] = useState<string | null>(null)
  const [showClientChangelog, setShowClientChangelog] = useState(false)
  const [endDateCampaign, setEndDateCampaign] = useState<CampaignWithBudget | null>(null)
  const [deletingCampaign, setDeletingCampaign] = useState<CampaignWithBudget | null>(null)
  const [removeFromPlanCampaign, setRemoveFromPlanCampaign] = useState<CampaignWithBudget | null>(null)
  const [showDeleteClient, setShowDeleteClient] = useState(false)
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set())
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)

  // Client notes editing
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesInput, setNotesInput] = useState('')

  // Monthly budget goal (persisted in localStorage per client+month)
  const [monthlyBudgetGoal, setMonthlyBudgetGoal] = useState<number | null>(null)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('')

  useEffect(() => {
    if (!client) return
    const saved = localStorage.getItem(getMonthlyBudgetKey(client.id))
    setMonthlyBudgetGoal(saved ? Number(saved) : null)
  }, [client])

  // All hooks above -- conditional returns below
  if (authLoading) return null
  if (!hasToolAccess('budget')) {
    return (
      <GlassPanel className="p-8 text-center">
        <p className="text-lg text-text-secondary">אין לך גישה לכלי זה</p>
      </GlassPanel>
    )
  }

  const saveGoal = () => {
    if (!client || !goalInput) return
    const val = Number(goalInput)
    if (val <= 0) return
    localStorage.setItem(getMonthlyBudgetKey(client.id), String(val))
    setMonthlyBudgetGoal(val)
    setEditingGoal(false)
    setGoalInput('')
    toast.success('תקציב חודשי נשמר')
  }

  const isLoading = clientLoading || campaignsLoading

  const totalDaily = campaigns?.reduce((sum, c) => sum + c.current_daily_budget, 0) ?? 0
  const totalForecast = campaigns?.reduce((sum, c) => sum + c.monthly_forecast, 0) ?? 0
  const fbForecast = campaigns?.filter((c) => c.platform === 'facebook')
    .reduce((sum, c) => sum + c.monthly_forecast, 0) ?? 0
  const googleForecast = campaigns?.filter((c) => c.platform === 'google')
    .reduce((sum, c) => sum + c.monthly_forecast, 0) ?? 0
  const now = new Date()
  const daysInMonth = getDaysInMonth(now.getFullYear(), now.getMonth())
  const daysPassed = now.getDate()
  const daysRemaining = daysInMonth - daysPassed
  const monthProgress = Math.round((daysPassed / daysInMonth) * 100)
  const monthStr = String(now.getMonth() + 1).padStart(2, '0')
  const yearStr = String(now.getFullYear()).slice(2)
  const dateRangeText = `01.${monthStr}.${yearStr} -- ${daysInMonth}.${monthStr}.${yearStr}`

  const totalActualSpend = campaigns?.reduce((sum, c) => sum + (Number(c.actual_spend) || 0), 0) ?? 0
  const lastSyncedCampaign = campaigns
    ?.filter((c) => c.last_synced_at)
    .sort((a, b) => new Date(b.last_synced_at!).getTime() - new Date(a.last_synced_at!).getTime())[0]

  const hasCampaigns = campaigns && campaigns.length > 0
  const hasFb = campaigns?.some((c) => c.platform === 'facebook')
  const hasGoogle = campaigns?.some((c) => c.platform === 'google')

  const handleStatusChange = async (campaignId: string, status: CampaignStatus) => {
    if (!client) return
    try {
      await updateStatus.mutateAsync({
        campaign_id: campaignId,
        client_id: client.id,
        status,
        end_date: status === 'stopped' ? todayISO() : undefined,
      })
      const labels: Record<CampaignStatus, string> = { active: 'פעיל', paused: 'מושהה', stopped: 'הופסק', scheduled: 'מתוזמן' }
      toast.success(`סטטוס שונה ל${labels[status]}`)
    } catch {
      toast.error('שגיאה בשינוי סטטוס')
    }
  }

  const copyShareLink = () => {
    if (!client) return
    const url = `${window.location.origin}/share/${client.share_token}`
    navigator.clipboard.writeText(url)
    toast.success('קישור שיתוף הועתק')
  }

  const handleDeleteCampaign = async () => {
    if (!deletingCampaign || !client) return
    try {
      await deleteCampaign.mutateAsync({ campaign_id: deletingCampaign.id, client_id: client.id })
      toast.success(`הקמפיין "${deletingCampaign.name}" נמחק`)
      setDeletingCampaign(null)
    } catch {
      toast.error('שגיאה במחיקת קמפיין')
    }
  }

  const handleDeleteClient = async () => {
    if (!client) return
    try {
      await deleteClient.mutateAsync(client.slug)
      toast.success(`הלקוח "${client.name}" נמחק`)
      router.push('/budget')
    } catch {
      toast.error('שגיאה במחיקת לקוח')
    }
  }

  const handleSync = async () => {
    if (!client) return
    let adAccountId = client.meta_ad_account_id
    if (!adAccountId) {
      const input = prompt('הזן Meta Ad Account ID (למשל: act_123456789):')
      if (input === null) {
        return
      }
      if (!input.trim()) {
        toast.error('סנכרון בוטל — חסר Meta Ad Account ID')
        return
      }
      adAccountId = input.trim()
    }
    try {
      const result = await metaSync.mutateAsync({
        client_id: client.id,
        ad_account_id: adAccountId || undefined,
      })
      toast.success(`סונכרנו ${result.created} חדשים, ${result.updated} עודכנו`)
    } catch (err) {
      toast.error(`שגיאת סנכרון: ${(err as Error).message}`)
    }
  }

  const handleGoogleSync = async () => {
    if (!client) return

    let customerId = client.google_customer_id
    let mccId = client.google_mcc_id

    if (!customerId) {
      const input = prompt('הזן Google Ads Customer ID (10 ספרות, בלי מקפים):')
      if (input === null) {
        return
      }
      if (!input.trim()) {
        toast.error('סנכרון Google בוטל — חסר Customer ID')
        return
      }
      customerId = input.trim().replace(/-/g, '')
    }

    if (!mccId) {
      const input = prompt('הזן Google MCC ID (10 ספרות, בלי מקפים):')
      if (input === null) {
        return
      }
      if (!input.trim()) {
        toast.error('סנכרון Google בוטל — חסר MCC ID')
        return
      }
      mccId = input.trim().replace(/-/g, '')
    }

    try {
      const result = await googleSync.mutateAsync({
        client_id: client.id,
        google_customer_id: customerId || undefined,
        google_mcc_id: mccId || undefined,
      })
      toast.success(`Google: ${result.created} חדשים, ${result.updated} עודכנו`)
    } catch (err) {
      toast.error(`שגיאת Google: ${(err as Error).message}`)
    }
  }

  const handleBulkStatusChange = async (status: CampaignStatus) => {
    if (!client || selectedCampaignIds.size === 0) return
    try {
      await bulkAction.mutateAsync({
        ids: [...selectedCampaignIds],
        action: 'status',
        client_id: client.id,
        status,
        end_date: status === 'stopped' ? todayISO() : undefined,
      })
      const labels: Record<CampaignStatus, string> = { active: 'פעיל', paused: 'מושהה', stopped: 'הופסק', scheduled: 'מתוזמן' }
      toast.success(`${selectedCampaignIds.size} קמפיינים שונו ל${labels[status]}`)
      setSelectedCampaignIds(new Set())
    } catch {
      toast.error('שגיאה בשינוי סטטוס')
    }
  }

  const handleBulkDelete = async () => {
    if (!client || selectedCampaignIds.size === 0) return
    try {
      await bulkAction.mutateAsync({
        ids: [...selectedCampaignIds],
        action: 'delete',
        client_id: client.id,
      })
      toast.success(`${selectedCampaignIds.size} קמפיינים נמחקו`)
      setSelectedCampaignIds(new Set())
      setShowBulkDeleteConfirm(false)
    } catch {
      toast.error('שגיאה במחיקה')
    }
  }

  const handleBulkRemoveFromPlan = async () => {
    if (!client || selectedCampaignIds.size === 0) return
    try {
      await bulkAction.mutateAsync({
        ids: [...selectedCampaignIds],
        action: 'remove_from_plan',
        client_id: client.id,
        effective_date: todayISO(),
      })
      toast.success(`${selectedCampaignIds.size} קמפיינים הוצאו מהתוכנית`)
      setSelectedCampaignIds(new Set())
    } catch {
      toast.error('שגיאה בהוצאה מתוכנית')
    }
  }

  const handleBulkUpdateAdLink = async (link: string) => {
    if (!client || selectedCampaignIds.size === 0) return
    try {
      await bulkAction.mutateAsync({
        ids: [...selectedCampaignIds],
        action: 'update_ad_link',
        client_id: client.id,
        ad_link: link,
      })
      toast.success(`לינק עודכן ל-${selectedCampaignIds.size} קמפיינים`)
      setSelectedCampaignIds(new Set())
    } catch {
      toast.error('שגיאה בעדכון לינק')
    }
  }

  const handleCampaignNotesUpdate = async (campaignId: string, notes: string) => {
    if (!client) return
    const campaign = campaigns?.find(c => c.id === campaignId)
    if (!campaign) return
    try {
      await updateCampaignDetails.mutateAsync({
        campaign_id: campaignId,
        client_id: client.id,
        name: campaign.name,
        technical_name: campaign.technical_name,
        campaign_type: campaign.campaign_type,
        ad_link: campaign.ad_link,
        notes: notes || null,
      })
      toast.success('הערה נשמרה')
    } catch {
      toast.error('שגיאה בשמירת הערה')
    }
  }

  const handleSaveNotes = async () => {
    if (!client) return
    try {
      await updateClient.mutateAsync({ id: client.id, slug: client.slug, notes: notesInput || undefined })
      setEditingNotes(false)
      toast.success('הערות נשמרו')
    } catch {
      toast.error('שגיאה בשמירת הערות')
    }
  }

  if (!isLoading && !client) {
    return (
      <GlassPanel className="p-8 text-center">
        <p className="text-lg text-text-secondary">לקוח לא נמצא</p>
        <Link href="/budget" className="btn-ghost inline-flex mt-4">חזרה לדשבורד</Link>
      </GlassPanel>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-enter">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/budget" className="btn-icon">
            <ArrowRight size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold leading-tight">
              {client?.name ?? '...'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" className="hover:!text-danger hover:!border-danger/30" onClick={() => setShowDeleteClient(true)}>
            <Trash2 size={16} />
            מחק לקוח
          </Button>
          <Button variant="ghost" onClick={() => setShowClientChangelog(true)}>
            <History size={16} />
            היסטוריית שינויים
          </Button>
          <Button variant="ghost" onClick={copyShareLink}>
            <Copy size={16} />
            קישור שיתוף
          </Button>
          <Button variant="ghost" onClick={handleSync} disabled={metaSync.isPending}>
            <RefreshCw size={16} className={metaSync.isPending ? 'animate-spin' : ''} />
            {metaSync.isPending ? 'מסנכרן...' : 'סנכרן Meta'}
          </Button>
          <Button variant="ghost" onClick={handleGoogleSync} disabled={googleSync.isPending}>
            <RefreshCw size={16} className={googleSync.isPending ? 'animate-spin' : ''} />
            {googleSync.isPending ? 'מסנכרן...' : 'סנכרן Google'}
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            הוסף קמפיין
          </Button>
        </div>
      </div>

      {/* Monthly Budget Panel */}
      <GlassPanel className="p-5">
        {/* Row 1: Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">
              תקציב לחודש {hebrewMonths[now.getMonth()]} {now.getFullYear()}
            </span>
            <span className="text-xs text-text-muted">({dateRangeText})</span>
          </div>
          <div className="flex items-center gap-3">
            {client?.meta_ad_account_id && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                <span className="text-xs text-text-muted">Meta</span>
              </div>
            )}
            {client?.google_customer_id && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                <span className="text-xs text-text-muted">Google</span>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Three big numbers */}
        <div className="grid grid-cols-3 gap-0 mb-4" style={{ border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)' }}>
          <div className="text-center py-4 px-3">
            <p className="text-xs text-text-muted mb-1">תקציב מוסכם</p>
            {editingGoal ? (
              <div className="flex items-center justify-center gap-1">
                <input
                  className="glass-input !py-1 !px-2 !text-sm w-24 text-center"
                  type="number"
                  placeholder="50000"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') saveGoal(); if (e.key === 'Escape') setEditingGoal(false) }}
                />
                <Button variant="icon" className="!w-6 !h-6" onClick={saveGoal}><Check size={12} className="text-success" /></Button>
                <Button variant="icon" className="!w-6 !h-6" onClick={() => setEditingGoal(false)}><X size={12} /></Button>
              </div>
            ) : (
              <button
                className="text-xl font-semibold bg-transparent border-none cursor-pointer p-0 hover:text-accent transition-colors"
                onClick={() => { setGoalInput(monthlyBudgetGoal ? String(monthlyBudgetGoal) : ''); setEditingGoal(true) }}
                title="עריכת תקציב מוסכם"
              >
                {monthlyBudgetGoal ? formatCurrency(monthlyBudgetGoal) : '--'}
              </button>
            )}
          </div>
          <div className="text-center py-4 px-3" style={{ borderInlineStart: '1px solid var(--glass-border)' }}>
            <p className="text-xs text-text-muted mb-1">צפי חודשי</p>
            <p className="text-xl font-semibold text-accent">{formatCurrency(totalForecast)}</p>
          </div>
          <div className="text-center py-4 px-3" style={{ borderInlineStart: '1px solid var(--glass-border)' }}>
            <p className="text-xs text-text-muted mb-1">הוצאה בפועל</p>
            <p className="text-xl font-semibold">
              {totalActualSpend > 0 ? formatCurrency(totalActualSpend) : '--'}
            </p>
          </div>
        </div>

        {/* Row 3: Progress + Days */}
        <div className="flex items-center gap-4 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <MonthProgressBar
            daysInMonth={daysInMonth}
            monthProgress={monthProgress}
            campaigns={campaigns ?? []}
            year={now.getFullYear()}
            month={now.getMonth()}
          />
          <div className="flex items-center gap-4 text-xs text-text-secondary">
            <div className="text-center">
              <p className="font-semibold text-sm">{daysInMonth}</p>
              <p>ימים</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm text-accent">{daysPassed}</p>
              <p>עברו</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">{daysRemaining}</p>
              <p>נשארו</p>
            </div>
          </div>
        </div>

        {/* Row 4: Footer */}
        <div className="flex items-center justify-between mt-3 pt-2">
          {lastSyncedCampaign ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary bg-[var(--card-bg)] rounded-lg px-2.5 py-1 border border-[var(--glass-border)]">
              <Clock size={12} className="text-accent shrink-0" />
              סנכרון אחרון: {formatDateTime(lastSyncedCampaign.last_synced_at!)}
            </span>
          ) : <span />}
          {monthlyBudgetGoal && monthlyBudgetGoal > 0 && (() => {
            const diff = totalForecast - monthlyBudgetGoal
            const isOver = diff > 0
            return (
              <span className={`chip text-xs ${isOver ? 'status-stopped' : 'status-active'}`}>
                {isOver ? `חריגה: +${formatCurrency(diff)}` : `נותר: ${formatCurrency(Math.abs(diff))}`}
              </span>
            )
          })()}
        </div>
      </GlassPanel>

      {/* Metric Cards */}
      {hasCampaigns && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="תקציב יומי" value={formatCurrency(totalDaily)} />
          <MetricCard label="צפי חודשי" value={formatCurrency(totalForecast)} />
          <MetricCard label="Meta" value={formatCurrency(fbForecast)} />
          <MetricCard label="Google" value={formatCurrency(googleForecast)} />
        </div>
      )}

      {/* Client Notes */}
      <GlassPanel className="p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <StickyNote size={16} className="text-text-muted" />
            <span className="text-sm font-medium text-text-secondary">הערות לקוח</span>
          </div>
          {!editingNotes && (
            <Button
              variant="icon"
              className="!w-7 !h-7"
              onClick={() => {
                setNotesInput(client?.notes ?? '')
                setEditingNotes(true)
              }}
              title="עריכת הערות"
            >
              <Pencil size={13} />
            </Button>
          )}
        </div>
        {editingNotes ? (
          <div className="flex flex-col gap-2">
            <textarea
              className="glass-input w-full min-h-[80px] resize-y text-sm leading-[1.7]"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="הוסף הערות ללקוח..."
              autoFocus
            />
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="ghost"
                className="!text-xs !py-1 !px-3"
                onClick={() => setEditingNotes(false)}
              >
                <X size={14} />
                ביטול
              </Button>
              <Button
                className="!text-xs !py-1 !px-3"
                onClick={handleSaveNotes}
                disabled={updateClient.isPending}
              >
                <Check size={14} />
                {updateClient.isPending ? 'שומר...' : 'שמור'}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-secondary leading-[1.7] whitespace-pre-wrap">
            {client?.notes || <span className="text-text-muted italic">אין הערות</span>}
          </p>
        )}
      </GlassPanel>

      {/* Campaign Tables */}
      <GlassPanel className="p-6">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : !hasCampaigns ? (
          <NoCampaignsState onAdd={() => setShowAddModal(true)} />
        ) : (
          <>
            {hasFb && (
              <CampaignTable
                campaigns={campaigns}
                platform="facebook"
                onEditCampaign={setEditingCampaign}
                onViewChangelog={setChangelogCampaignId}
                onBudgetEdit={setBudgetEditCampaign}
                onStatusChange={handleStatusChange}
                onEndDateEdit={setEndDateCampaign}
                onDeleteCampaign={setDeletingCampaign}
                onRemoveFromPlan={setRemoveFromPlanCampaign}
                onNotesUpdate={handleCampaignNotesUpdate}
                selectedIds={selectedCampaignIds}
                onSelectionChange={setSelectedCampaignIds}
              />
            )}

            {hasGoogle && (
              <CampaignTable
                campaigns={campaigns}
                platform="google"
                onEditCampaign={setEditingCampaign}
                onViewChangelog={setChangelogCampaignId}
                onBudgetEdit={setBudgetEditCampaign}
                onStatusChange={handleStatusChange}
                onEndDateEdit={setEndDateCampaign}
                onDeleteCampaign={setDeletingCampaign}
                onRemoveFromPlan={setRemoveFromPlanCampaign}
                onNotesUpdate={handleCampaignNotesUpdate}
                selectedIds={selectedCampaignIds}
                onSelectionChange={setSelectedCampaignIds}
              />
            )}

            {/* Grand Total (only if both platforms exist) */}
            {hasFb && hasGoogle && (
              <div className="glass-card p-5">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <span className="font-semibold text-lg">סה״כ כללי</span>
                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="text-end">
                      <p className="text-xs text-text-muted">יומי</p>
                      <p className="font-semibold">{formatCurrency(totalDaily)}</p>
                    </div>
                    <div className="text-end">
                      <p className="text-xs text-text-muted">צפי חודשי</p>
                      <p className="text-xl font-semibold text-accent">{formatCurrency(totalForecast)}</p>
                    </div>
                    {totalActualSpend > 0 && (
                      <div className="text-end">
                        <p className="text-xs text-text-muted">הוצאה בפועל</p>
                        <p className="font-semibold">{formatCurrency(totalActualSpend)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </GlassPanel>

      {/* Modals & Panels */}
      <CampaignModal
        open={showAddModal || !!editingCampaign}
        onClose={() => {
          setShowAddModal(false)
          setEditingCampaign(null)
        }}
        clientId={client?.id ?? ''}
        campaign={editingCampaign}
      />

      <BudgetEditDialog
        open={!!budgetEditCampaign}
        onClose={() => setBudgetEditCampaign(null)}
        campaign={budgetEditCampaign}
        clientId={client?.id ?? ''}
      />

      <EndDateEditDialog
        open={!!endDateCampaign}
        onClose={() => setEndDateCampaign(null)}
        campaign={endDateCampaign}
        clientId={client?.id ?? ''}
      />

      <RemoveFromPlanDialog
        open={!!removeFromPlanCampaign}
        onClose={() => setRemoveFromPlanCampaign(null)}
        campaign={removeFromPlanCampaign}
        clientId={client?.id ?? ''}
      />

      <ChangelogPanel
        open={!!changelogCampaignId || showClientChangelog}
        onClose={() => {
          setChangelogCampaignId(null)
          setShowClientChangelog(false)
        }}
        campaignId={changelogCampaignId ?? undefined}
        clientId={showClientChangelog ? client?.id : undefined}
        title={showClientChangelog ? `היסטוריית שינויים -- ${client?.name}` : undefined}
      />

      {/* Delete confirmations */}
      <ConfirmDialog
        open={!!deletingCampaign}
        onClose={() => setDeletingCampaign(null)}
        onConfirm={handleDeleteCampaign}
        title="מחיקת קמפיין"
        message={`האם למחוק את הקמפיין "${deletingCampaign?.name}"? כל היסטוריית התקציבים והשינויים תימחק לצמיתות.`}
        isPending={deleteCampaign.isPending}
      />

      <ConfirmDialog
        open={showDeleteClient}
        onClose={() => setShowDeleteClient(false)}
        onConfirm={handleDeleteClient}
        title="מחיקת לקוח"
        message={`האם למחוק את הלקוח "${client?.name}"? כל הקמפיינים, התקציבים וההיסטוריה יימחקו לצמיתות. פעולה זו בלתי הפיכה.`}
        isPending={deleteClient.isPending}
      />

      <ConfirmDialog
        open={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="מחיקת קמפיינים"
        message={`האם למחוק ${selectedCampaignIds.size} קמפיינים? כל היסטוריית התקציבים והשינויים תימחק לצמיתות.`}
        isPending={bulkAction.isPending}
      />

      {/* Bulk Action Bar */}
      <BulkActionBar
        count={selectedCampaignIds.size}
        onClear={() => setSelectedCampaignIds(new Set())}
        onStatusChange={handleBulkStatusChange}
        onDelete={() => setShowBulkDeleteConfirm(true)}
        onRemoveFromPlan={handleBulkRemoveFromPlan}
        onUpdateAdLink={handleBulkUpdateAdLink}
        isPending={bulkAction.isPending}
      />
    </div>
  )
}
