import type { MetricType } from "@/lib/cpa/metric-presets";

export type CpaStatus = "green" | "yellow" | "red" | "no_data";

export interface DailyMetric {
  date: string;
  spend: number;
  conversions: number;
  cpa: number;
}

export interface SparklineData {
  client_id: string;
  daily: DailyMetric[];
}

export interface TopicMetrics {
  topic_id: string;
  topic_name: string;
  metric_type: MetricType;
  spend: number;
  conversions: number;
  cpa: number | null;
  tcpa: number | null;
  tcpa_currency: string | null;
  status: CpaStatus;
  conversion_type: string | null;
  // Additional fields for all metric types
  revenue: number | null;
  roas: number | null;
  impressions: number;
  clicks: number;
  ctr: number | null;
  cpm: number | null;
  reach: number;
  // Period comparison fields (optional, only when compare=true)
  prev_spend?: number;
  prev_conversions?: number;
  prev_cpa?: number | null;
  spend_change_pct?: number | null;
  cpa_change_pct?: number | null;
}

export interface ClientCardData {
  client_id: string;
  client_name: string;
  fb_account_id: string;
  currency: string;
  topics: TopicMetrics[];
  total_spend: number;
  total_conversions: number;
  overall_cpa: number | null;
  is_multi_topic: boolean;
}
