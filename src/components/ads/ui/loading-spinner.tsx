"use client";

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Size presets
// ---------------------------------------------------------------------------
const SIZE_MAP = {
  sm: { spinner: "h-5 w-5 border-2", text: "text-xs", gap: "gap-1.5" },
  md: { spinner: "h-8 w-8 border-[3px]", text: "text-sm", gap: "gap-2.5" },
  lg: { spinner: "h-12 w-12 border-4", text: "text-base", gap: "gap-3" },
} as const;

type SpinnerSize = keyof typeof SIZE_MAP;

interface LoadingSpinnerProps {
  /** Hebrew message displayed below the spinner */
  message?: string;
  /** Spinner size variant */
  size?: SpinnerSize;
  /** Extra wrapper className */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function LoadingSpinner({
  message,
  size = "md",
  className,
}: LoadingSpinnerProps) {
  const preset = SIZE_MAP[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        preset.gap,
        className,
      )}
      role="status"
      aria-label={message || "טוען"}
    >
      {/* Pure CSS spinner — Facebook blue (#1877F2) */}
      <div
        className={cn(
          "rounded-full border-zinc-200 animate-spin",
          preset.spinner,
        )}
        style={{
          borderTopColor: "#1877F2",
          borderRightColor: "#1877F2",
          borderBottomColor: "transparent",
          borderLeftColor: "transparent",
        }}
        aria-hidden="true"
      />

      {message && (
        <span
          className={cn("text-zinc-500 select-none", preset.text)}
          dir="rtl"
        >
          {message}
        </span>
      )}
    </div>
  );
}
