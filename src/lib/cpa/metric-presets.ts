export type MetricType = "leads" | "ecommerce" | "engagement";

export interface MetricPreset {
  label: string;
  icon: string;
  conversionField: string;
  conversionLabel: string;
  displayFields: {
    key: string;
    label: string;
    format: "number" | "currency" | "percent" | "decimal";
  }[];
  cpaCalculation: {
    numerator: "spend";
    denominator: string;
  };
  summaryFields: {
    key: string;
    label: string;
    format: "number" | "currency" | "percent" | "decimal";
    aggregate: "sum" | "avg";
    divisorKey?: string;
  }[];
}

export const METRIC_PRESETS: Record<MetricType, MetricPreset> = {
  leads: {
    label: "לידים",
    icon: "UserPlus",
    conversionField: "leads",
    conversionLabel: "לידים",
    displayFields: [
      { key: "spend", label: "הוצאה", format: "currency" },
      { key: "leads", label: "לידים", format: "number" },
      { key: "cpl", label: "עלות ליד", format: "currency" },
    ],
    cpaCalculation: { numerator: "spend", denominator: "leads" },
    summaryFields: [
      { key: "spend", label: "הוצאה", format: "currency", aggregate: "sum" },
      { key: "leads", label: "לידים", format: "number", aggregate: "sum" },
      { key: "cpl", label: "CPL", format: "currency", aggregate: "avg", divisorKey: "leads" },
    ],
  },
  ecommerce: {
    label: "איקומרס",
    icon: "ShoppingCart",
    conversionField: "purchases",
    conversionLabel: "רכישות",
    displayFields: [
      { key: "spend", label: "הוצאה", format: "currency" },
      { key: "purchases", label: "רכישות", format: "number" },
      { key: "revenue", label: "הכנסות", format: "currency" },
      { key: "roas", label: "ROAS", format: "decimal" },
      { key: "cpa", label: "עלות רכישה", format: "currency" },
    ],
    cpaCalculation: { numerator: "spend", denominator: "purchases" },
    summaryFields: [
      { key: "spend", label: "הוצאה", format: "currency", aggregate: "sum" },
      { key: "purchases", label: "רכישות", format: "number", aggregate: "sum" },
      { key: "revenue", label: "הכנסות", format: "currency", aggregate: "sum" },
      { key: "roas", label: "ROAS", format: "decimal", aggregate: "avg", divisorKey: "spend" },
    ],
  },
  engagement: {
    label: "אינגייג׳מנט",
    icon: "Heart",
    conversionField: "clicks",
    conversionLabel: "הקלקות",
    displayFields: [
      { key: "spend", label: "הוצאה", format: "currency" },
      { key: "impressions", label: "חשיפות", format: "number" },
      { key: "reach", label: "חשיפה ייחודית", format: "number" },
      { key: "clicks", label: "הקלקות", format: "number" },
      { key: "ctr", label: "CTR", format: "percent" },
      { key: "cpm", label: "CPM", format: "currency" },
    ],
    cpaCalculation: { numerator: "spend", denominator: "clicks" },
    summaryFields: [
      { key: "spend", label: "הוצאה", format: "currency", aggregate: "sum" },
      { key: "impressions", label: "חשיפות", format: "number", aggregate: "sum" },
      { key: "reach", label: "חשיפה ייחודית", format: "number", aggregate: "sum" },
      { key: "cpm", label: "CPM", format: "currency", aggregate: "avg", divisorKey: "impressions" },
    ],
  },
};
