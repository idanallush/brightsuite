"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
  Tooltip as RechartsTooltip,
} from "recharts";
import type { DailyMetric } from "@/lib/cpa/types/dashboard";

interface SparklineProps {
  data: { date: string; cpa: number }[];
  tcpa: number | null;
  color?: string;
  height?: number;
}

function SparklineTooltipContent({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: DailyMetric }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-white border border-[#e5e5e0] rounded-lg px-2.5 py-1.5 shadow-sm text-xs" dir="rtl">
      <p className="text-muted-foreground">{point.date}</p>
      <p className="font-bold tabular-nums">
        CPA: {point.cpa > 0 ? point.cpa.toFixed(1) : "---"}
      </p>
    </div>
  );
}

export function Sparkline({ data, tcpa, color, height = 40 }: SparklineProps) {
  if (!data || data.length < 2) return null;

  // Determine line color based on how many days are above TCPA
  const lineColor = (() => {
    if (color) return color;
    if (tcpa === null || tcpa === 0) return "#6B7280"; // gray if no target
    const aboveCount = data.filter((d) => d.cpa > tcpa).length;
    const ratio = aboveCount / data.length;
    if (ratio > 0.5) return "#EF4444"; // red - mostly above
    if (ratio > 0.25) return "#F59E0B"; // yellow - partially above
    return "#22C55E"; // green - mostly below
  })();

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          {tcpa !== null && tcpa > 0 && (
            <ReferenceLine
              y={tcpa}
              stroke="#9CA3AF"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          )}
          <Line
            type="monotone"
            dataKey="cpa"
            stroke={lineColor}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0, fill: lineColor }}
          />
          <RechartsTooltip
            content={<SparklineTooltipContent />}
            cursor={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
