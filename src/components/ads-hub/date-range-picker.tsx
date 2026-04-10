'use client';

import { useState, useMemo } from 'react';
import { DayPicker, type DateRange as DayPickerRange } from 'react-day-picker';
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  differenceInDays,
  parse,
} from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { useDashboardStore } from '@/stores/ads-hub/dashboard-store';
import { Button } from '@/components/cpa/ui/button';
import { Input } from '@/components/cpa/ui/input';
import { Separator } from '@/components/cpa/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/cpa/ui/popover';
import 'react-day-picker/dist/style.css';

const toDate = (s: string) => parse(s, 'yyyy-MM-dd', new Date());
const toStore = (d: Date) => format(d, 'yyyy-MM-dd');
const toDisplay = (d: Date) => format(d, 'dd.MM.yy');

export const DateRangePicker = () => {
  const { startDate, endDate, setDateRange } = useDashboardStore();
  const [open, setOpen] = useState(false);
  const [customDays, setCustomDays] = useState('');

  const since = toDate(startDate);
  const until = toDate(endDate);
  const dayCount = differenceInDays(until, since) + 1;

  const selected: DayPickerRange = { from: since, to: until };
  const today = useMemo(() => new Date(), []);
  const todayStr = toStore(today);

  const applyRange = (from: Date, to: Date) => {
    setDateRange(toStore(from), toStore(to));
    setOpen(false);
  };

  const handlePreset = (days: number) => {
    if (days === 0) applyRange(today, today);
    else applyRange(subDays(today, days - 1), today);
  };

  const handleCustomDays = () => {
    const n = parseInt(customDays, 10);
    if (!n || n <= 0) return;
    applyRange(subDays(today, n - 1), today);
  };

  const handleDayPickerSelect = (range: DayPickerRange | undefined) => {
    if (range?.from && range?.to) applyRange(range.from, range.to);
    else if (range?.from) setDateRange(toStore(range.from), toStore(range.from));
  };

  const isPresetActive = (days: number): boolean => {
    if (endDate !== todayStr) return false;
    if (days === 0) return startDate === todayStr;
    return startDate === toStore(subDays(today, days - 1));
  };

  const isThisMonthActive =
    startDate === toStore(startOfMonth(today)) && endDate === todayStr;

  const lastMonth = subMonths(today, 1);
  const isLastMonthActive =
    startDate === toStore(startOfMonth(lastMonth)) &&
    endDate === toStore(endOfMonth(lastMonth));

  const presets = [
    { label: 'היום', days: 0 },
    { label: '3 ימים', days: 3 },
    { label: '7 ימים', days: 7 },
    { label: '14 ימים', days: 14 },
    { label: '30 ימים', days: 30 },
  ] as const;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 text-sm h-9 font-medium">
          <CalendarDays className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          <span>
            {toDisplay(since)} — {toDisplay(until)}
          </span>
          <span className="text-muted-foreground text-xs">({dayCount} ימים)</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
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

          <div className="w-44 p-3 flex flex-col gap-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 mb-1">
              טווח מהיר
            </p>

            <div className="flex gap-1">
              <Input
                type="number"
                min={1}
                placeholder="X ימים"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                className="h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCustomDays();
                }}
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
                    variant={active ? 'secondary' : 'ghost'}
                    size="sm"
                    className={`w-full justify-start text-sm h-8 ${active ? 'font-semibold' : ''}`}
                    onClick={() => handlePreset(preset.days)}
                  >
                    {preset.label}
                  </Button>
                );
              })}
              <Button
                variant={isThisMonthActive ? 'secondary' : 'ghost'}
                size="sm"
                className={`w-full justify-start text-sm h-8 ${isThisMonthActive ? 'font-semibold' : ''}`}
                onClick={() => applyRange(startOfMonth(today), today)}
              >
                החודש
              </Button>
              <Button
                variant={isLastMonthActive ? 'secondary' : 'ghost'}
                size="sm"
                className={`w-full justify-start text-sm h-8 ${isLastMonthActive ? 'font-semibold' : ''}`}
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
};
