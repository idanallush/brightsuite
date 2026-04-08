export type Platform = 'facebook' | 'google'

export type CampaignStatus = 'active' | 'paused' | 'stopped' | 'scheduled'

export type CampaignType =
  | 'Sales'
  | 'Awareness'
  | 'Shopping'
  | 'Brand'
  | 'GDN'
  | 'Search'
  | 'PMax'
  | 'Remarketing'
  | 'Leads'
  | 'Traffic'
  | 'Engagement'
  | 'Video'
  | 'App'

export type ChangelogAction =
  | 'budget_change'
  | 'status_change'
  | 'campaign_added'
  | 'campaign_removed'
  | 'note_added'

export type TeamRole = 'admin' | 'campaigner'

export interface Client {
  id: string
  name: string
  slug: string
  share_token: string
  is_active: boolean
  created_at: string
  notes: string | null
  meta_ad_account_id: string | null
  google_customer_id: string | null
  google_mcc_id: string | null
}

export interface Campaign {
  id: string
  client_id: string
  name: string
  technical_name: string | null
  platform: Platform
  campaign_type: string | null
  ad_link: string | null
  status: CampaignStatus
  start_date: string
  end_date: string | null
  notes: string | null
  meta_campaign_id: string | null
  actual_spend: number
  actual_spend_month: string | null
  last_synced_at: string | null
  created_at: string
}

export interface BudgetPeriod {
  id: string
  campaign_id: string
  daily_budget: number
  start_date: string
  end_date: string | null
  created_by: string | null
  created_at: string
}

export interface ChangelogEntry {
  id: string
  campaign_id: string
  action: ChangelogAction
  description: string
  old_value: string | null
  new_value: string | null
  performed_by: string
  performed_at: string
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: TeamRole
  is_active: boolean
}

// Computed types for UI
export interface CampaignWithBudget extends Campaign {
  current_daily_budget: number
  monthly_forecast: number
  spent_so_far: number
  remaining_forecast: number
  original_plan: number
  variance: number
  budget_periods: BudgetPeriod[]
}

export interface ClientSummary extends Client {
  active_campaigns_count: number
  total_monthly_forecast: number
  facebook_forecast: number
  google_forecast: number
}
