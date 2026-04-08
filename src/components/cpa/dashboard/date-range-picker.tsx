"use client";

import { useState, useMemo } from "react";
import { DayPicker, type DateRange as DayPickerRange } from "react-day-picker";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  differenceInDays,
  parse,
} from "date-fns";
import { CalendarDays } from "lucide-react";
import { useDashboardStore } from "@/stores/cpa/dashboard-store";
import { Button } from "@/components/cpa/ui/button";
import { Input } from "@/components/cpa/ui/input";
import { Separator } from "@/components/cpa/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/cpa/ui/popover";

function toDate(dateStr: string): Date {
  return parse(dateStr, "yyyy-MM-dd", new Date());
}

function toStoreFormat(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function toDisplay(date: Date): string {
  return format(date, "dd.MM.yy");
}

interface DateRangePickerProps {
  onDateRangeChange?: (range: { since: string; until: string }) => void;
}

export function DateRangePicker({ onDateRangeChange }: DateRangePickerProps) {
  const { dateRange, setDateRange: setStoreRange } = useDashboardStore();

  function setDateRange(range: { since: string; until: string }) {
    setStoreRange(range);
    onDateRangeChange?.(range);
  }
  const [open, setOpen] = useState(false);
  const [customDays, setCustomDays] = useState("");

  const since = toDate(dateRange.since);
  const until = toDate(dateRange.until);
  const dayCount = differenceInDays(until, since) + 1;

  const selected: DayPickerRange = { from: since, to: until };

  const today = useMemo(() => new Date(), []);
  const todayStr = toStoreFormat(today);

  function applyRange(from: Date, to: Date) {
    setDateRange({ since: toStoreFormat(from), until: toStoreFormat(to) });
    setOpen(false);
  }

  function handlePreset(days: number) {
    if (days === 0) {
      applyRange(today, today);
    } else {
      applyRange(subDays(today, days - 1), today);
    }
  }

  function handleCustomDays() {
    const n = parseInt(customDays, 10);
    if (!n || n <= 0) return;
    applyRange(subDays(today, n - 1), today);
  }

  function handleDayPickerSelect(range: DayPickerRange | undefined) {
    if (range?.from && range?.to) {
      applyRange(range.from, range.to);
    } else if (range?.from) {
      setDateRange({ since: toStoreFormat(range.from), until: toStoreFormat(range.from) });
    }
  }

  function isPresetActive(days: number): boolean {
    if (dateRange.until !== todayStr) return false;
    if (days === 0) return dateRange.since === todayStr;
    return dateRange.since === toStoreFormat(subDays(today, days - 1));
  }

  const isThisMonthActive =
    dateRange.since === toStoreFormat(startOfMonth(today)) &&
    dateRange.until === todayStr;

  const lastMonth = subMonths(today, 1);
  const isLastMonthActive =
    dateRange.since === toStoreFormat(startOfMonth(lastMonth)) &&
    dateRange.until === toStoreFormat(endOfMonth(lastMonth));

  const presets = [
    { label: "היום", days: 0 },
    { label: "3 ימים", days: 3 },
    { label: "7 ימים", days: 7 },
    { label: "14 ימים", days: 14 },
    { label: "30 ימים", days: 30 },
  ] as const;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 text-sm h-9 font-medium">
          <CalendarDays className="h-4 w-4 text-[#1877F2]" />
          <span>
            {toDisplay(since)} — {toDisplay(until)}
          </span>
          <span className="text-muted-foreground text-xs">({dayCount} ימים)</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Calendar */}
          <div className="p-3 border-e">
            <DayPicker
              mode="range"
              selected={selected}
              onSelect={handleDayPickerSelect}
              numberOfMonths={2}
              disabled={{ after: today }}
              dir="rtl"
            />
          </div>

          {/* Presets panel */}
          <div className="w-44 p-3 flex flex-col gap-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 mb-1">טווח מהיר</p>

            <div className="flex gap-1">
              <Input
                type="number"
                min={1}
                placeholder="X ימים"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                className="h-8 text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") handleCustomDays(); }}
              />
              <Button size="sm" variant="outline" className="h-8 shrink-0 text-xs" onClick={handleCustomDays}>
                החל
              </Button>
            </div>

            <Separator className="my-1" />

            <div className="flex flex-col gap-0.5">
              {presets.map((preset) => {
                const active = isPresetActive(preset.days);
                return (
                  <Button
                    key={preset.days}
                    variant={active ? "secondary" : "ghost"}
                    size="sm"
                    className={`w-full justify-start text-sm h-8 ${active ? "font-semibold text-[#1877F2] bg-[#E3F2FD]" : ""}`}
                    onClick={() => handlePreset(preset.days)}
                  >
                    {preset.label}
                  </Button>
                );
              })}
              <Button
                variant={isThisMonthActive ? "secondary" : "ghost"}
                size="sm"
                className={`w-full justify-start text-sm h-8 ${isThisMonthActive ? "font-semibold text-[#1877F2] bg-[#E3F2FD]" : ""}`}
                onClick={() => applyRange(startOfMonth(today), today)}
              >
                החודש
              </Button>
              <Button
                variant={isLastMonthActive ? "secondary" : "ghost"}
                size="sm"
                className={`w-full justify-start text-sm h-8 ${isLastMonthActive ? "font-semibold text-[#1877F2] bg-[#E3F2FD]" : ""}`}
                onClick={() => applyRange(startOfMonth(lastMonth), endOfMonth(lastMonth))}
              >
                חודש קודם
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
