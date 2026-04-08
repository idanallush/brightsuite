"use client";

import { ChevronDown, EyeOff } from "lucide-react";
import type { ClientCardData, CpaStatus, TopicMetrics } from "@/lib/cpa/types/dashboard";
import { Card, CardContent } from "@/components/cpa/ui/card";
import { CpaBadge } from "@/components/cpa/dashboard/cpa-badge";
import { CampaignManageDialog } from "@/components/cpa/dashboard/campaign-manage-dialog";
import { formatMetricValue, formatCurrency } from "@/lib/cpa/format";
import { METRIC_PRESETS, type MetricType } from "@/lib/cpa/metric-presets";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/cpa/ui/tooltip";

interface ClientCardMultiProps {
  data: ClientCardData;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onHide: () => void;
}

function deriveOverallStatus(data: ClientCardData): CpaStatus {
  if (data.topics.length === 0) return "no_data";
  const statuses = data.topics.map((t) => t.status);
  if (statuses.includes("red")) return "red";
  if (statuses.includes("yellow")) return "yellow";
  if (statuses.includes("green")) return "green";
  return "no_data";
}

function getMetricValue(topic: TopicMetrics, key: string): number | null {
  const map: Record<string, number | null> = {
    spend: topic.spend,
    leads: topic.metric_type === "leads" ? topic.conversions : null,
    cpl: topic.metric_type === "leads" ? topic.cpa : null,
    purchases: topic.metric_type === "ecommerce" ? topic.conversions : null,
    revenue: topic.revenue,
    roas: topic.roas,
    cpa: topic.cpa,
    impressions: topic.impressions,
    reach: topic.reach,
    clicks: topic.clicks,
    ctr: topic.ctr,
    cpm: topic.cpm,
  };
  return map[key] ?? null;
}

interface TableColumn {
  key: string;
  label: string;
  format: "number" | "currency" | "percent" | "decimal";
}

function getColumnsForType(metricType: MetricType): TableColumn[] {
  switch (metricType) {
    case "leads":
      return [
        { key: "spend", label: "הוצאה", format: "currency" },
        { key: "leads", label: "לידים", format: "number" },
        { key: "cpl", label: "CPL", format: "currency" },
      ];
    case "ecommerce":
      return [
        { key: "spend", label: "הוצאה", format: "currency" },
        { key: "purchases", label: "רכישות", format: "number" },
        { key: "revenue", label: "הכנסות", format: "currency" },
        { key: "roas", label: "ROAS", format: "decimal" },
        { key: "cpa", label: "CPA", format: "currency" },
      ];
    case "engagement":
      return [
        { key: "spend", label: "הוצאה", format: "currency" },
        { key: "impressions", label: "חשיפות", format: "number" },
        { key: "clicks", label: "הקלקות", format: "number" },
        { key: "ctr", label: "CTR", format: "percent" },
        { key: "cpm", label: "CPM", format: "currency" },
      ];
  }
}

function TopicTypeTable({
  topics,
  metricType,
  currency,
  showTypeLabel,
}: {
  topics: TopicMetrics[];
  metricType: MetricType;
  currency: string;
  showTypeLabel: boolean;
}) {
  const columns = getColumnsForType(metricType);
  const preset = METRIC_PRESETS[metricType];

  const totalSpend = topics.reduce((s, t) => s + t.spend, 0);
  const totalConversions = topics.reduce((s, t) => s + t.conversions, 0);
  const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : null;

  // Build summary values for each column
  function getSummaryValue(col: TableColumn): string {
    if (col.key === "spend") return formatCurrency(totalSpend, currency);
    if (col.key === "leads" || col.key === "purchases" || col.key === "clicks")
      return String(totalConversions);
    if (col.key === "cpl" || col.key === "cpa")
      return formatMetricValue(avgCpa, "currency", currency);
    if (col.key === "impressions") {
      const total = topics.reduce((s, t) => s + (t.impressions || 0), 0);
      return formatMetricValue(total, "number");
    }
    if (col.key === "reach") {
      const total = topics.reduce((s, t) => s + (t.reach || 0), 0);
      return formatMetricValue(total, "number");
    }
    if (col.key === "revenue") {
      const total = topics.reduce((s, t) => s + (t.revenue || 0), 0);
      return formatMetricValue(total, "currency", currency);
    }
    if (col.key === "roas") {
      const totalRev = topics.reduce((s, t) => s + (t.revenue || 0), 0);
      return totalSpend > 0 ? formatMetricValue(totalRev / totalSpend, "decimal") : "—";
    }
    if (col.key === "ctr") {
      const totalClicks = topics.reduce((s, t) => s + (t.clicks || 0), 0);
      const totalImpressions = topics.reduce((s, t) => s + (t.impressions || 0), 0);
      return totalImpressions > 0
        ? formatMetricValue((totalClicks / totalImpressions) * 100, "percent")
        : "—";
    }
    if (col.key === "cpm") {
      const totalImpressions = topics.reduce((s, t) => s + (t.impressions || 0), 0);
      return totalImpressions > 0
        ? formatMetricValue((totalSpend / totalImpressions) * 1000, "currency", currency)
        : "—";
    }
    return "";
  }

  return (
    <div>
      {showTypeLabel && (
        <div className="px-3 py-2 bg-[#E3F2FD] border-b border-[#BBDEFB] flex items-center gap-2">
          <span className="text-xs font-bold text-[#1877F2]">{preset.label}</span>
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#F8F9FA] text-[11px] text-foreground uppercase tracking-wide border-b">
            <th className="text-start px-3 py-2 font-bold">נושא</th>
            {columns.map((col) => (
              <th key={col.key} className="text-start px-3 py-2 font-bold">
                {col.label}
              </th>
            ))}
            <th className="text-start px-3 py-2 font-bold">יעד</th>
            <th className="text-start px-3 py-2 font-bold">סטטוס</th>
          </tr>
        </thead>
        <tbody>
          {topics.map((topic, idx) => {
            const overshootPercent =
              topic.cpa !== null && topic.tcpa !== null && topic.tcpa > 0
                ? ((topic.cpa - topic.tcpa) / topic.tcpa) * 100
                : undefined;

            return (
              <tr key={topic.topic_id} className={idx % 2 === 1 ? "bg-[#FAFBFC]" : ""}>
                <td className="px-3 py-2 font-medium">{topic.topic_name}</td>
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-2 tabular-nums">
                    {formatMetricValue(getMetricValue(topic, col.key), col.format, currency)}
                  </td>
                ))}
                <td className="px-3 py-2 tabular-nums text-muted-foreground">
                  {formatMetricValue(topic.tcpa, "currency", topic.tcpa_currency ?? currency)}
                </td>
                <td className="px-3 py-2">
                  <CpaBadge status={topic.status} overshootPercent={overshootPercent} />
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t bg-[#F8F9FA] font-bold text-xs">
            <td className="px-3 py-2">סה״כ</td>
            {columns.map((col) => (
              <td key={col.key} className="px-3 py-2 tabular-nums">
                {getSummaryValue(col)}
              </td>
            ))}
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function ClientCardMulti({ data, isCollapsed, onToggleCollapse, onHide }: ClientCardMultiProps) {
  const status = deriveOverallStatus(data);

  // Group topics by metric_type
  const topicsByType = new Map<MetricType, TopicMetrics[]>();
  for (const topic of data.topics) {
    const mt = topic.metric_type || "leads";
    if (!topicsByType.has(mt)) topicsByType.set(mt, []);
    topicsByType.get(mt)!.push(topic);
  }

  const typeGroups = Array.from(topicsByType.entries());
  const isMixed = typeGroups.length > 1;

  return (
    <Card className="card-animate rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Colored top accent bar */}
      <div
        className="h-1"
        style={{
          backgroundColor: status === "green" ? "#22C55E" : status === "yellow" ? "#F59E0B" : status === "red" ? "#EF4444" : "#E5E7EB",
        }}
      />

      {/* Clickable header */}
      <div
        className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 cursor-pointer select-none"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <h3 className="text-base font-bold leading-tight truncate">{data.client_name}</h3>
          <div onClick={(e) => e.stopPropagation()}>
            <CampaignManageDialog data={data} />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isCollapsed && (
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {formatCurrency(data.total_spend, data.currency)}
            </span>
          )}
          <CpaBadge status={status} />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onHide();
                  }}
                  className="text-muted-foreground hover:text-red-500 transition-colors p-0.5"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>הסתר לקוח</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
              isCollapsed ? "" : "rotate-180"
            }`}
          />
        </div>
      </div>

      {/* Collapsible body */}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
          isCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
        }`}
      >
        <div className="overflow-hidden">
          <CardContent className="px-5 pb-5 pt-0 space-y-4">
            {/* Topics table(s) */}
            <div className="rounded-lg border overflow-hidden">
              {typeGroups.map(([metricType, topics]) => (
                <TopicTypeTable
                  key={metricType}
                  topics={topics}
                  metricType={metricType}
                  currency={data.currency}
                  showTypeLabel={isMixed}
                />
              ))}
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
