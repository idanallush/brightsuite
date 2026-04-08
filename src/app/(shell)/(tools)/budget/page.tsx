'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, TrendingUp, Users, Megaphone } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useClients, useCreateClient } from '@/hooks/budget/useClients'
import { useCampaigns } from '@/hooks/budget/useCampaigns'
import { GlassPanel } from '@/components/budget/ui/GlassPanel'
import { GlassCard } from '@/components/budget/ui/GlassCard'
import { Button } from '@/components/budget/ui/Button'
import { Input } from '@/components/budget/ui/Input'
import { MetricCard } from '@/components/budget/ui/MetricCard'
import { PlatformIcon } from '@/components/budget/ui/PlatformIcon'
import { SkeletonCard } from '@/components/budget/ui/Skeleton'
import { EmptyState } from '@/components/budget/ui/EmptyState'
import { Dialog } from '@/components/budget/ui/Dialog'
import { formatCurrency } from '@/lib/budget/format'
import { toast } from '@/components/budget/ui/Toast'

const ClientCard = ({ client }: { client: { id: string; name: string; slug: string; notes: string | null } }) => {
  const { data: campaigns } = useCampaigns(client.id)

  const activeCampaigns = campaigns?.filter((c) => c.status === 'active') ?? []
  const totalForecast = campaigns?.reduce((sum, c) => sum + c.monthly_forecast, 0) ?? 0
  const fbForecast = campaigns
    ?.filter((c) => c.platform === 'facebook')
    .reduce((sum, c) => sum + c.monthly_forecast, 0) ?? 0
  const googleForecast = campaigns
    ?.filter((c) => c.platform === 'google')
    .reduce((sum, c) => sum + c.monthly_forecast, 0) ?? 0

  return (
    <Link href={`/budget/clients/${client.slug}`}>
      <GlassCard className="p-5 cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold leading-tight">{client.name}</h3>
            <p className="text-sm text-text-secondary mt-1">
              {activeCampaigns.length} קמפיינים פעילים
            </p>
          </div>
          <span className="text-2xl font-semibold text-accent">
            {formatCurrency(totalForecast)}
          </span>
        </div>

        <div className="flex gap-4">
          {fbForecast > 0 && (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <PlatformIcon platform="facebook" size={14} />
              <span>{formatCurrency(fbForecast)}</span>
            </div>
          )}
          {googleForecast > 0 && (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <PlatformIcon platform="google" size={14} />
              <span>{formatCurrency(googleForecast)}</span>
            </div>
          )}
        </div>
      </GlassCard>
    </Link>
  )
}

export default function BudgetDashboardPage() {
  const { hasToolAccess, loading: authLoading } = useAuth()
  const { data: clients, isLoading } = useClients()
  const [search, setSearch] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientNotes, setNewClientNotes] = useState('')
  const createClient = useCreateClient()

  // All hooks above -- conditional returns below
  if (authLoading) return null
  if (!hasToolAccess('budget')) {
    return (
      <GlassPanel className="p-8 text-center">
        <p className="text-lg text-text-secondary">אין לך גישה לכלי זה</p>
      </GlassPanel>
    )
  }

  const filteredClients = clients?.filter((c) =>
    c.name.includes(search)
  ) ?? []

  const handleAddClient = async () => {
    if (!newClientName.trim()) return
    try {
      await createClient.mutateAsync({
        name: newClientName.trim(),
        notes: newClientNotes.trim() || undefined,
      })
      toast.success('לקוח חדש נוסף בהצלחה')
      setShowAddDialog(false)
      setNewClientName('')
      setNewClientNotes('')
    } catch {
      toast.error('שגיאה ביצירת לקוח')
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-enter">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="לקוחות פעילים"
          value={String(clients?.length ?? 0)}
          icon={<Users size={20} />}
        />
        <MetricCard
          label="סה״כ קמפיינים"
          value="--"
          icon={<Megaphone size={20} />}
        />
        <MetricCard
          label="תחזית חודשית"
          value="--"
          icon={<TrendingUp size={20} />}
        />
      </div>

      {/* Header + Search */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-semibold leading-tight">לקוחות</h1>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus size={18} />
            הוסף לקוח
          </Button>
        </div>

        <div className="mb-5">
          <div className="relative">
            <Search
              size={18}
              className="absolute start-4 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              className="glass-input !ps-11"
              placeholder="חיפוש לקוח..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filteredClients.length === 0 ? (
          <EmptyState
            icon={<Users size={40} />}
            title="אין לקוחות עדיין"
            description="הוסף לקוח ראשון כדי להתחיל לנהל תקציבים"
            action={
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus size={18} />
                הוסף לקוח
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredClients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        )}
      </GlassPanel>

      {/* Add Client Dialog */}
      <Dialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        title="הוסף לקוח חדש"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="שם לקוח"
            placeholder="לדוגמה: מסעדת השף"
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
          />
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium tracking-wider text-text-muted">
              הערות
            </label>
            <textarea
              className="glass-input glass-textarea"
              placeholder="הערות כלליות (אופציונלי)"
              rows={3}
              value={newClientNotes}
              onChange={(e) => setNewClientNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-3 justify-end mt-2">
            <Button variant="ghost" onClick={() => setShowAddDialog(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleAddClient}
              disabled={!newClientName.trim() || createClient.isPending}
            >
              {createClient.isPending ? 'יוצר...' : 'הוסף לקוח'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
