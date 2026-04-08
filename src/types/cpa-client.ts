import type { MetricType } from "@/lib/cpa/metric-presets";

export interface Client {
  id: string;
  name: string;
  fb_account_id: string;
  fb_account_name: string | null;
  currency: string;
  conversion_type: string | null;
  conversion_type_override: string | null;
  is_active: boolean;
  display_order: number;
}

export interface Topic {
  id: string;
  client_id: string;
  name: string;
  campaign_ids: string[];
  tcpa: number | null;
  tcpa_currency: string;
  conversion_type: string | null;
  metric_type: MetricType;
  is_active: boolean;
  display_order: number;
}

export interface AlertConfig {
  id: string;
  client_id: string;
  topic_id: string | null;
  threshold_percent: number;
  notify_emails: string[];
  notify_slack_webhook: string | null;
  notify_telegram_chat_id: string | null;
  is_enabled: boolean;
}
