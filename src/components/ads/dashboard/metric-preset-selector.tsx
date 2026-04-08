"use client";

import { UserPlus, ShoppingCart, Heart } from "lucide-react";
import { METRIC_PRESETS, PRESET_KEYS, type PresetKey } from "@/lib/ads/metric-presets";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ElementType> = {
  UserPlus,
  ShoppingCart,
  Heart,
};

interface MetricPresetSelectorProps {
  value: PresetKey;
  onChange: (preset: PresetKey) => void;
}

export function MetricPresetSelector({ value, onChange }: MetricPresetSelectorProps) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="בחירת סוג מטריקות">
      {PRESET_KEYS.map((key) => {
        const preset = METRIC_PRESETS[key];
        const Icon = ICONS[preset.icon];
        const isSelected = value === key;

        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(key)}
            title={preset.label}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150",
              isSelected
                ? "border-[#1877F2] text-[#1877F2] bg-[#E7F0FF] shadow-sm"
                : "border-zinc-200 text-zinc-500 bg-white hover:border-zinc-300 hover:text-zinc-700"
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            <span>{preset.label}</span>
          </button>
        );
      })}
    </div>
  );
}
