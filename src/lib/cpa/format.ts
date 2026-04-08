import { format, parseISO } from "date-fns";

export function formatCurrency(value: number | null, currency = "ILS"): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("he-IL").format(Math.round(value));
}

export function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(2)}%`;
}

export function formatDecimal(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return value.toFixed(2);
}

export function formatDate(isoDate: string): string {
  try {
    const date = typeof isoDate === "string" ? parseISO(isoDate) : new Date(isoDate);
    return format(date, "dd.MM.yy");
  } catch {
    return isoDate;
  }
}

export function formatMetricValue(
  value: number | null,
  fmt: "number" | "currency" | "percent" | "decimal",
  currency: string = "ILS"
): string {
  if (value === null || value === undefined) return "—";

  switch (fmt) {
    case "currency":
      return formatCurrency(value, currency);
    case "percent":
      return formatPercent(value);
    case "decimal":
      return formatDecimal(value);
    case "number":
      return formatNumber(value);
    default:
      return String(value);
  }
}
