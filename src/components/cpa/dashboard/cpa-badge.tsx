"use client";

import type { CpaStatus } from "@/lib/cpa/types/dashboard";
import { Badge } from "@/components/cpa/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/cpa/ui/tooltip";

const statusConfig: Record<CpaStatus, { dotColor: string; bgColor: string; textColor: string; label: string }> = {
  green: { dotColor: "#22C55E", bgColor: "#DCFCE7", textColor: "#15803D", label: "בנורמה" },
  yellow: { dotColor: "#F59E0B", bgColor: "#FEF3C7", textColor: "#92400E", label: "חריגה קלה" },
  red: { dotColor: "#EF4444", bgColor: "#FEE2E2", textColor: "#991B1B", label: "חריגה" },
  no_data: { dotColor: "#6B7280", bgColor: "#F3F4F6", textColor: "#374151", label: "אין נתונים" },
};

interface CpaBadgeProps {
  status: CpaStatus;
  overshootPercent?: number;
}

export function CpaBadge({ status, overshootPercent }: CpaBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.no_data;

  const badge = (
    <Badge
      variant="secondary"
      className="gap-1.5"
      style={{ backgroundColor: config.bgColor, color: config.textColor }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: config.dotColor }}
      />
      {config.label}
    </Badge>
  );

  if (overshootPercent !== undefined && overshootPercent > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p>חריגה: {overshootPercent.toFixed(1)}%</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}
