import type { MetricDefinition } from "@/lib/ads/types/metrics";
import { ALL_METRICS } from "@/lib/ads/types/metrics";

// ---------------------------------------------------------------------------
// Preset type
// ---------------------------------------------------------------------------
export type PresetKey = "leads" | "ecommerce" | "engagement";

export interface MetricPreset {
  label: string;
  /** Lucide icon name */
  icon: "UserPlus" | "ShoppingCart" | "Heart";
  /** Metric keys shown on AdCard */
  metrics: string[];
  /** Summary metric config for CampaignView header */
  campaignSummary: {
    key: string;
    label: string;
    format: "number" | "currency" | "percent" | "decimal";
    /** "sum" = add up, "avg" = weighted average (spend / count) */
    aggregate: "sum" | "avg";
    /** For "avg" — which two sums to divide: spend / divisorKey */
    divisorKey?: string;
  }[];
}

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------
export const METRIC_PRESETS: Record<PresetKey, MetricPreset> = {
  leads: {
    label: "לידים",
    icon: "UserPlus",
    metrics: ["spend", "clicks", "ctr", "leads", "cpl"],
    campaignSummary: [
      { key: "spend", label: "הוצאה", format: "currency", aggregate: "sum" },
      { key: "leads", label: "לידים", format: "number", aggregate: "sum" },
      { key: "cpl", label: "CPL", format: "currency", aggregate: "avg", divisorKey: "leads" },
    ],
  },
  ecommerce: {
    label: "איקומרס",
    icon: "ShoppingCart",
    metrics: ["spend", "clicks", "ctr", "purchases", "revenue", "roas", "cpa"],
    campaignSummary: [
      { key: "spend", label: "הוצאה", format: "currency", aggregate: "sum" },
      { key: "purchases", label: "רכישות", format: "number", aggregate: "sum" },
      { key: "revenue", label: "הכנסות", format: "currency", aggregate: "sum" },
      { key: "roas", label: "ROAS", format: "decimal", aggregate: "avg", divisorKey: "spend" },
    ],
  },
  engagement: {
    label: "אינגייג'מנט",
    icon: "Heart",
    metrics: ["spend", "impressions", "reach", "clicks", "ctr", "cpm"],
    campaignSummary: [
      { key: "spend", label: "הוצאה", format: "currency", aggregate: "sum" },
      { key: "impressions", label: "חשיפות", format: "number", aggregate: "sum" },
      { key: "reach", label: "חשיפה ייחודית", format: "number", aggregate: "sum" },
      { key: "cpm", label: "CPM", format: "currency", aggregate: "avg", divisorKey: "impressions" },
    ],
  },
};

export const PRESET_KEYS: PresetKey[] = ["leads", "ecommerce", "engagement"];

export const DEFAULT_PRESET: PresetKey = "leads";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve preset metric keys to full MetricDefinition objects */
export function getPresetMetricDefs(preset: PresetKey): MetricDefinition[] {
  const keys = METRIC_PRESETS[preset].metrics;
  return keys
    .map((key) => ALL_METRICS.find((m) => m.key === key))
    .filter((m): m is MetricDefinition => m !== undefined);
}
