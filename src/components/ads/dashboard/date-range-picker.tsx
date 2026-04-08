"use client";

import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths, differenceInDays, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/cpa/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/cpa/ui/popover";
import { DayPicker, type DateRange as DPDateRange } from "react-day-picker";
import "react-day-picker/style.css";

interface DateRangePickerProps {
  dateRange: { since: string; until: string } | null;
  onDateRangeChange: (range: { since: string; until: string }) => void;
}

const presets = [
  {
    label: "היום",
    getValue: () => {
      const today = new Date();
      return { since: format(today, "yyyy-MM-dd"), until: format(today, "yyyy-MM-dd") };
    },
  },
  {
    label: "3 ימים אחרונים",
    getValue: () => ({
      since: format(subDays(new Date(), 3), "yyyy-MM-dd"),
      until: format(new Date(), "yyyy-MM-dd"),
    }),
  },
  {
    label: "7 ימים אחרונים",
    getValue: () => ({
      since: format(subDays(new Date(), 7), "yyyy-MM-dd"),
      until: format(new Date(), "yyyy-MM-dd"),
    }),
  },
  {
    label: "14 ימים אחרונים",
    getValue: () => ({
      since: format(subDays(new Date(), 14), "yyyy-MM-dd"),
      until: format(new Date(), "yyyy-MM-dd"),
    }),
  },
  {
    label: "30 ימים אחרונים",
    getValue: () => ({
      since: format(subDays(new Date(), 30), "yyyy-MM-dd"),
      until: format(new Date(), "yyyy-MM-dd"),
    }),
  },
  {
    label: "החודש",
    getValue: () => ({
      since: format(startOfMonth(new Date()), "yyyy-MM-dd"),
      until: format(new Date(), "yyyy-MM-dd"),
    }),
  },
  {
    label: "חודש קודם",
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        since: format(startOfMonth(lastMonth), "yyyy-MM-dd"),
        until: format(endOfMonth(lastMonth), "yyyy-MM-dd"),
      };
    },
  },
];

function formatDisplayDate(isoDate: string): string {
  const d = parse(isoDate, "yyyy-MM-dd", new Date());
  return format(d, "dd.MM.yy");
}

function isPresetActive(
  preset: (typeof presets)[number],
  dateRange: { since: string; until: string } | null,
): boolean {
  if (!dateRange) return false;
  const val = preset.getValue();
  return val.since === dateRange.since && val.until === dateRange.until;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [customDays, setCustomDays] = useState("");
  const [selected, setSelected] = useState<DPDateRange | undefined>(() => {
    if (dateRange) {
      return {
        from: new Date(dateRange.since),
        to: new Date(dateRange.until),
      };
    }
    return undefined;
  });

  const handleSelect = (range: DPDateRange | undefined) => {
    setSelected(range);
    if (range?.from && range?.to) {
      onDateRangeChange({
        since: format(range.from, "yyyy-MM-dd"),
        until: format(range.to, "yyyy-MM-dd"),
      });
      setOpen(false);
    }
  };

  const handleCustomDaysApply = () => {
    const n = parseInt(customDays, 10);
    if (!n || n < 1 || n > 365) return;
    const today = new Date();
    const range = {
      since: format(subDays(today, n), "yyyy-MM-dd"),
      until: format(today, "yyyy-MM-dd"),
    };
    onDateRangeChange(range);
    setSelected({ from: subDays(today, n), to: today });
    setCustomDays("");
    setOpen(false);
  };

  const dayCount = dateRange
    ? differenceInDays(
        parse(dateRange.until, "yyyy-MM-dd", new Date()),
        parse(dateRange.since, "yyyy-MM-dd", new Date()),
      )
    : 0;

  const displayLabel = dateRange
    ? `${formatDisplayDate(dateRange.since)} — ${formatDisplayDate(dateRange.until)} (${dayCount} ימים)`
    : "בחר טווח תאריכים";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 min-w-52 h-9 text-sm"
          aria-label={`טווח תאריכים: ${displayLabel}. לחץ לשינוי.`}
          aria-expanded={open}
          title="בחירת טווח תאריכים"
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{displayLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="border-e p-3 space-y-0.5 min-w-[120px]">
            <div className="px-2 pb-2 mb-1 border-b">
              <label className="text-xs font-medium text-muted-foreground block mb-1">ימים אחרונים</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCustomDaysApply(); }}
                  placeholder="X"
                  className="w-14 h-7 text-sm text-center border rounded-md bg-background px-1"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleCustomDaysApply}
                >
                  החל
                </Button>
              </div>
            </div>

            <p className="text-xs font-medium text-muted-foreground px-2 pb-1.5">מוגדרים מראש</p>
            {presets.map((preset) => {
              const active = isPresetActive(preset, dateRange);
              return (
                <Button
                  key={preset.label}
                  variant={active ? "secondary" : "ghost"}
                  size="sm"
                  className={`w-full justify-start text-sm h-8 ${active ? "font-semibold bg-accent" : ""}`}
                  onClick={() => {
                    const range = preset.getValue();
                    onDateRangeChange(range);
                    setSelected({
                      from: new Date(range.since),
                      to: new Date(range.until),
                    });
                    setOpen(false);
                  }}
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>

          <div className="p-3">
            <p className="text-xs font-medium text-muted-foreground pb-1.5">טווח מותאם אישית</p>
            <DayPicker
              mode="range"
              selected={selected}
              onSelect={handleSelect}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
