// Shared campaign types and helpers for the Clients Dashboard "Campaigns" tab.
// The list endpoint groups by (platform, platform_campaign_id); daily breakdown
// returns the per-day series for one campaign over the requested range.

import type { Platform } from './types';

export interface CampaignRow {
  // Composite ID: `${platform}:${platform_campaign_id}` — stable across syncs,
  // useful as a React key. Present even when the ah_campaigns row is missing.
  key: string;
  platform: Platform;
  platformCampaignId: string;
  // ah_campaigns may not have a row yet if a campaign appears in
  // ah_performance_daily before metadata sync. Both values may be null.
  campaignId: number | null;
  name: string;
  status: string | null;
  objective: string | null;
  // Aggregated metrics over the requested date range
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  // Derived
  ctr: number | null; // percentage
  cpc: number | null;
  cpl: number | null;
  roas: number | null;
}

export interface CampaignDailyPoint {
  date: string;
  spend: number;
  conversions: number;
  revenue: number;
  clicks: number;
  impressions: number;
}

export interface CampaignsApiResponse {
  campaigns: CampaignRow[];
  range: { startDate: string; endDate: string };
  // When clientId+campaignKey are both passed, the API returns the daily
  // breakdown for that single campaign. Otherwise this is undefined.
  daily?: CampaignDailyPoint[];
}
