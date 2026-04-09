"use client";

interface ChangeBadgeProps {
  changePercent: number | null | undefined;
  invertColor?: boolean; // true for CPA where decrease = good
}

export function ChangeBadge({ changePercent, invertColor = false }: ChangeBadgeProps) {
  if (changePercent === null || changePercent === undefined) return null;

  const isPositive = changePercent > 0;
  const isNegative = changePercent < 0;
  const isZero = changePercent === 0;

  // Determine if this change is "good" or "bad"
  // For regular metrics: positive = neutral/good, negative = neutral/bad
  // For inverted (CPA): positive = bad, negative = good
  const isGood = invertColor ? isNegative : isPositive;
  const isBad = invertColor ? isPositive : isNegative;

  const arrow = isPositive ? "\u25B2" : isNegative ? "\u25BC" : "";
  const displayValue = `${arrow} ${Math.abs(changePercent).toFixed(0)}%`;

  let colorClasses: string;
  if (isZero) {
    colorClasses = "text-[#8a877f]";
  } else if (isGood) {
    colorClasses = "text-[#1a7a4c] bg-[#e8f5ee]";
  } else if (isBad) {
    colorClasses = "text-[#c0392b] bg-[#fceaea]";
  } else {
    colorClasses = "text-[#8a877f]";
  }

  return (
    <span
      className={`inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium leading-none tabular-nums ${colorClasses}`}
    >
      {isZero ? "\u2014" : displayValue}
    </span>
  );
}
