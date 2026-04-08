export type MetricCategory = "leads" | "ecommerce" | "engagement" | "general";

export interface MetricDefinition {
  key: string;
  label: string;
  category: MetricCategory;
  format: "number" | "currency" | "percent" | "decimal";
  description?: string;
}

export const METRIC_CATEGORIES: Record<MetricCategory, { label: string; labelHe: string }> = {
  leads: { label: "לידים", labelHe: "לידים" },
  ecommerce: { label: "איקומרס", labelHe: "איקומרס" },
  engagement: { label: "מעורבות", labelHe: "מעורבות" },
  general: { label: "כללי", labelHe: "כללי" },
};

export const ALL_METRICS: MetricDefinition[] = [
  // General
  { key: "spend", label: "הוצאה", category: "general", format: "currency" },
  { key: "results", label: "תוצאות", category: "general", format: "number" },
  { key: "cost_per_result", label: "עלות/תוצאה", category: "general", format: "currency" },

  // Leads
  { key: "leads", label: "לידים", category: "leads", format: "number" },
  { key: "cpl", label: "CPL", category: "leads", format: "currency" },
  { key: "lead_cost", label: "עלות ליד", category: "leads", format: "currency" },
  { key: "leads_ctr", label: "CTR", category: "leads", format: "percent" },
  { key: "leads_cpc", label: "CPC", category: "leads", format: "currency" },

  // Ecommerce
  { key: "roas", label: "ROAS", category: "ecommerce", format: "decimal" },
  { key: "purchases", label: "רכישות", category: "ecommerce", format: "number" },
  { key: "revenue", label: "הכנסות", category: "ecommerce", format: "currency" },
  { key: "cpa", label: "CPA", category: "ecommerce", format: "currency" },
  { key: "add_to_cart", label: "הוספה לעגלה", category: "ecommerce", format: "number" },
  { key: "initiate_checkout", label: "התחלת צ׳קאאוט", category: "ecommerce", format: "number" },

  // Engagement
  { key: "impressions", label: "חשיפות", category: "engagement", format: "number" },
  { key: "reach", label: "חשיפה ייחודית", category: "engagement", format: "number" },
  { key: "frequency", label: "תדירות", category: "engagement", format: "decimal" },
  { key: "clicks", label: "קליקים", category: "engagement", format: "number" },
  { key: "ctr", label: "CTR", category: "engagement", format: "percent" },
  { key: "cpm", label: "CPM", category: "engagement", format: "currency" },
  { key: "video_views", label: "צפיות בוידאו", category: "engagement", format: "number" },
  { key: "thruplays", label: "ThruPlays", category: "engagement", format: "number" },
];

export const DEFAULT_VISIBLE_METRICS = [
  "spend", "impressions", "clicks", "ctr", "cpc", "leads", "cpl", "purchases", "roas", "revenue",
];
