// Ads Hub — shared types

export type Platform = 'meta' | 'google' | 'ga4';
export type SyncType = 'daily' | 'backfill' | 'video_discovery';
export type SyncStatus = 'success' | 'error' | 'partial' | 'skipped';

export interface AdsHubClient {
  id: number;
  name: string;
  slug: string;
  metaAccountId: string | null;
  googleCustomerId: string | null;
  googleMccId: string | null;
  ga4PropertyId: string | null;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdsHubClientWithKpis extends AdsHubClient {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  cpl: number | null;
}

export interface DailyMetrics {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  cpc: number | null;
  ctr: number | null;
  cpl: number | null;
}

export interface Campaign {
  id: number;
  clientId: number;
  platform: Platform;
  platformCampaignId: string;
  name: string;
  status: string | null;
  objective: string | null;
}

export interface CampaignWithMetrics extends Campaign {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  cpl: number | null;
}

export interface VideoAd {
  id: number;
  clientId: number;
  metaAdId: string;
  metaCampaignId: string | null;
  adName: string | null;
  videoId: string | null;
  thumbnailUrl: string | null;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string | null;
  utmContent: string | null;
  transcript: string | null;
  createdAt: string;
}

export interface VideoAdWithMetrics extends VideoAd {
  totalSpend: number;
  totalImpressions: number;
  totalViews: number;
}

export interface VideoPerformance {
  date: string;
  impressions: number;
  views: number;
  spend: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  p100: number;
}

export interface SyncLogEntry {
  id: number;
  clientId: number | null;
  platform: string;
  syncType: SyncType;
  status: SyncStatus;
  recordsSynced: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface SyncResult {
  platform: Platform;
  status: SyncStatus;
  recordsSynced: number;
  error?: string;
}

export interface PlatformConnectionStatus {
  platform: Platform;
  connected: boolean;
  lastSync: string | null;
  accountCount: number;
  lastError: string | null;
}
