import type { MetricDefinition } from "@/lib/ads/types/metrics";

// ---------------------------------------------------------------------------
// Fix 1: Metric priority ordering
// Ensures Spend → Leads/Results → CPL/Cost per Result → CTR appear first
// ---------------------------------------------------------------------------
const METRIC_PRIORITY: string[] = [
  "spend",
  "leads",
  "results",
  "cpl",
  "cost_per_result",
  "ctr",
  "leads_ctr",
];

/**
 * Re-order metrics so high-priority columns appear first in PDF reports.
 * Non-priority metrics keep their original relative order.
 */
export function sortMetricsByPriority(
  metrics: MetricDefinition[]
): MetricDefinition[] {
  return [...metrics].sort((a, b) => {
    const aIdx = METRIC_PRIORITY.indexOf(a.key);
    const bIdx = METRIC_PRIORITY.indexOf(b.key);
    // Both are priority metrics — sort by their defined priority
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    // Only a is priority — it goes first
    if (aIdx !== -1) return -1;
    // Only b is priority — it goes first
    if (bIdx !== -1) return 1;
    // Neither is priority — keep original order
    return 0;
  });
}

// ---------------------------------------------------------------------------
// Fix 3: Emoji stripping
// @react-pdf/renderer cannot render color emoji glyphs (no font fallback
// support, no bitmap emoji). We strip them to prevent missing-glyph boxes.
// ---------------------------------------------------------------------------
const EMOJI_REGEX =
  /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;

/**
 * Strip emoji characters that @react-pdf/renderer cannot render.
 * Also collapses leftover double-spaces and trims.
 * Returns empty string for null/undefined input (safe for react-pdf Text).
 */
export function stripEmoji(text: string): string {
  if (!text) return "";
  return text.replace(EMOJI_REGEX, "").replace(/\s{2,}/g, " ").trim();
}
