"use client";

import { ChevronDown, EyeOff } from "lucide-react";
import type { ClientCardData, CpaStatus, TopicMetrics } from "@/lib/cpa/types/dashboard";
import { Card, CardContent } from "@/components/cpa/ui/card";
import { CpaBadge } from "@/components/cpa/dashboard/cpa-badge";
import { CampaignManageDialog } from "@/components/cpa/dashboard/campaign-manage-dialog";
import { formatMetricValue, formatCurrency } from "@/lib/cpa/format";
import { METRIC_PRESETS } from "@/lib/cpa/metric-presets";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/cpa/ui/tooltip";

interface ClientCardSimpleProps {
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

export function ClientCardSimple({ data, isCollapsed, onToggleCollapse, onHide }: ClientCardSimpleProps) {
  const topic = data.topics[0];
  if (!topic) return null;

  const overshootPercent =
    topic.cpa !== null && topic.tcpa !== null && topic.tcpa > 0
      ? ((topic.cpa - topic.tcpa) / topic.tcpa) * 100
      : undefined;

  const status = deriveOverallStatus(data);
  const preset = METRIC_PRESETS[topic.metric_type || "leads"];

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
          <CpaBadge status={status} overshootPercent={overshootPercent} />
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
            {/* Dynamic metrics grid based on metric_type */}
            <div className="grid grid-cols-2 gap-3">
              {preset.displayFields.map((field) => (
                <div key={field.key} className="space-y-0.5">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    {field.label}
                  </p>
                  <p className="text-lg font-bold tabular-nums">
                    {formatMetricValue(
                      getMetricValue(topic, field.key),
                      field.format,
                      data.currency
                    )}
                  </p>
                </div>
              ))}
              {/* Always show target */}
              {topic.tcpa !== null && (
                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">יעד</p>
                  <p className="text-lg font-bold tabular-nums text-muted-foreground">
                    {formatMetricValue(topic.tcpa, "currency", topic.tcpa_currency ?? data.currency)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
