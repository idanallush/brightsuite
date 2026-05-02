// Shared types for the Clients Dashboard.
// Foundation types only — feature-specific shapes live next to their feature.

export type Platform = 'meta' | 'google' | 'ga4';
export type MetricType = 'leads' | 'ecommerce';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';
export type CreativeType = 'video' | 'image' | 'carousel' | 'collection';

// What we surface for a client in the list page.
// metrics that matter depend on metric_type:
//   - 'leads'     → conversions, cpl
//   - 'ecommerce' → conversions (purchases), revenue, roas
export interface ClientSummary {
  id: number;
  name: string;
  slug: string;
  metricType: MetricType;
  currency: string;
  isActive: boolean;
  // Connection status
  hasMeta: boolean;
  hasGoogle: boolean;
  hasGa4: boolean;
  // Aggregated KPIs over the selected date range
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  cpl: number | null;
  roas: number | null;
  ctr: number | null;
  cpc: number | null;
  // Activity signals
  openAlerts: number;
  lastSyncAt: string | null;
}

export interface DateRange {
  startDate: string; // YYYY-MM-DD inclusive
  endDate: string; // YYYY-MM-DD inclusive
}

// Saved view payload (frontend-owned shape, persisted as JSON in cd_user_views).
// Each surface (clients-list, campaigns, creative, history, alerts) defines
// its own payload variant under `scope`.
export interface UserViewRecord<TPayload = unknown> {
  id: number;
  userId: number;
  scope: string;
  name: string;
  payload: TPayload;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AlertRecord {
  id: number;
  clientId: number;
  campaignId: number | null;
  platform: Platform | null;
  severity: AlertSeverity;
  kind: string;
  title: string;
  detail: string | null;
  metricValue: number | null;
  thresholdValue: number | null;
  status: AlertStatus;
  acknowledgedBy: number | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  reopenedCount: number;
  createdAt: string;
}

export interface CampaignChangeRecord {
  id: number;
  clientId: number;
  campaignId: number | null;
  platform: string;
  platformCampaignId: string | null;
  changeType: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  source: 'sync' | 'user' | 'system';
  userId: number | null;
  detectedAt: string;
  note: string | null;
}
