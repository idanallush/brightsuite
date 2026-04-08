"use client";

import { Button } from "@/components/cpa/ui/button";
import { Checkbox } from "@/components/cpa/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/cpa/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/cpa/ui/tabs";
import { Settings2 } from "lucide-react";
import {
  ALL_METRICS,
  METRIC_CATEGORIES,
  type MetricCategory,
} from "@/lib/ads/types/metrics";

interface MetricColumnPickerProps {
  visibleMetrics: string[];
  onToggleMetric: (metricKey: string) => void;
  onToggleCategory: (categoryMetrics: string[], allSelected: boolean) => void;
}

export function MetricColumnPicker({
  visibleMetrics,
  onToggleMetric,
  onToggleCategory,
}: MetricColumnPickerProps) {
  const categories = Object.keys(METRIC_CATEGORIES) as MetricCategory[];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 h-9"
          aria-label={`עמודות מטריקות. ${visibleMetrics.length} נבחרו.`}
          title="בחירת מטריקות לתצוגה"
        >
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          <span>מטריקות</span>
          <span className="text-xs text-muted-foreground">
            ({visibleMetrics.length})
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Tabs defaultValue="general">
          <TabsList className="w-full grid grid-cols-4">
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="text-xs">
                {METRIC_CATEGORIES[cat].label}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((cat) => {
            const metrics = ALL_METRICS.filter((m) => m.category === cat);
            const metricKeys = metrics.map((m) => m.key);
            const allSelected = metricKeys.every((k) =>
              visibleMetrics.includes(k)
            );

            return (
              <TabsContent key={cat} value={cat} className="p-3 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b">
                  <span className="text-xs font-medium text-muted-foreground">
                    {METRIC_CATEGORIES[cat].label}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => onToggleCategory(metricKeys, allSelected)}
                    aria-label={allSelected ? `בטל בחירה בכל מטריקות ${cat}` : `בחר הכל ב-${cat}`}
                  >
                    {allSelected ? "בטל הכל" : "בחר הכל"}
                  </Button>
                </div>

                {metrics.map((metric) => (
                  <label
                    key={metric.key}
                    className="flex items-center gap-2.5 py-1 cursor-pointer"
                    htmlFor={`metric-picker-${metric.key}`}
                  >
                    <Checkbox
                      id={`metric-picker-${metric.key}`}
                      checked={visibleMetrics.includes(metric.key)}
                      onCheckedChange={() => onToggleMetric(metric.key)}
                      aria-label={`הצג/הסתר ${metric.label}`}
                    />
                    <span className="text-sm">{metric.label}</span>
                  </label>
                ))}
              </TabsContent>
            );
          })}
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
