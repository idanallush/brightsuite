export function formatMetricValue(
  value: number | null,
  format: "number" | "currency" | "percent" | "decimal",
  currency: string = "USD"
): string {
  if (value === null || value === undefined) return "-";

  switch (format) {
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);

    case "percent":
      return `${value.toFixed(2)}%`;

    case "decimal":
      return value.toFixed(2);

    case "number":
      return new Intl.NumberFormat("en-US").format(Math.round(value));

    default:
      return String(value);
  }
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function formatObjective(objective: string): string {
  const map: Record<string, string> = {
    OUTCOME_LEADS: "לידים",
    OUTCOME_SALES: "מכירות",
    OUTCOME_TRAFFIC: "תנועה",
    OUTCOME_AWARENESS: "מודעות",
    OUTCOME_ENGAGEMENT: "מעורבות",
    OUTCOME_APP_PROMOTION: "קידום אפליקציה",
    LEAD_GENERATION: "יצירת לידים",
    CONVERSIONS: "המרות",
    LINK_CLICKS: "תנועה",
    REACH: "חשיפה",
    BRAND_AWARENESS: "מודעות למותג",
    VIDEO_VIEWS: "צפיות בוידאו",
    POST_ENGAGEMENT: "מעורבות",
    MESSAGES: "הודעות",
  };
  return map[objective] || objective.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatCallToAction(cta: string): string {
  return cta.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
