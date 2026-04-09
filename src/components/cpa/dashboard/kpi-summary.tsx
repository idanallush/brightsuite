"use client";

import { useMemo } from "react";
import { formatCurrency, formatNumber } from "@/lib/cpa/format";
import type { ClientCardData, CpaStatus } from "@/lib/cpa/types/dashboard";

interface KpiSummaryProps {
  cards: ClientCardData[];
}

function getWorstStatus(topics: ClientCardData["topics"]): CpaStatus {
  if (topics.some((t) => t.status === "red")) return "red";
  if (topics.some((t) => t.status === "yellow")) return "yellow";
  if (topics.some((t) => t.status === "green")) return "green";
  return "no_data";
}

export const KpiSummary = ({ cards }: KpiSummaryProps) => {
  const metrics = useMemo(() => {
    const totalSpend = cards.reduce((sum, c) => sum + c.total_spend, 0);
    const totalConversions = cards.reduce((sum, c) => sum + c.total_conversions, 0);
    const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : null;

    let onTarget = 0;
    let overages = 0;
    let warnings = 0;

    for (const card of cards) {
      const worst = getWorstStatus(card.topics);
      if (worst === "red") overages++;
      else if (worst === "yellow") warnings++;
      else if (worst === "green") onTarget++;
    }

    return { totalSpend, avgCpa, onTarget, overages, warnings };
  }, [cards]);

  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
      <MetricCard label="סה״כ הוצאה" value={formatCurrency(metrics.totalSpend)} />
      <MetricCard label="CPA ממוצע" value={formatCurrency(metrics.avgCpa)} />
      <MetricCard
        label="לקוחות בנורמה"
        value={formatNumber(metrics.onTarget)}
        variant="green"
      />
      <MetricCard
        label="חריגות"
        value={formatNumber(metrics.overages)}
        variant="red"
      />
      <MetricCard
        label="אזהרות"
        value={formatNumber(metrics.warnings)}
        variant="amber"
      />
    </div>
  );
};

type Variant = "default" | "green" | "red" | "amber";

const variantStyles: Record<Variant, string> = {
  default: "bg-white border-[#e5e5e0]",
  green: "bg-[#e8f5ee] border-[#c6e7d3]",
  red: "bg-[#fceaea] border-[#f5cbcb]",
  amber: "bg-[#fef6e0] border-[#f5e4b0]",
};

const variantValueStyles: Record<Variant, string> = {
  default: "text-[#1a1a1a]",
  green: "text-[#1a7a4c]",
  red: "text-[#c0392b]",
  amber: "text-[#b45309]",
};

const MetricCard = ({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: Variant;
}) => (
  <div
    className={`rounded-xl border px-4 py-3 ${variantStyles[variant]}`}
  >
    <p className="text-[11px] text-[#8a877f] leading-tight mb-1">{label}</p>
    <p className={`text-[22px] font-bold leading-tight ${variantValueStyles[variant]}`}>
      {value}
    </p>
  </div>
);
