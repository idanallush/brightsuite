import { fbFetch } from "@/lib/facebook/client";
import type { FBInsights } from "@/lib/facebook/types";

const PRIORITY: Record<string, number> = {
  PURCHASE: 4,
  LEAD: 3,
  COMPLETE_REGISTRATION: 2,
  LINK_CLICK: 1,
};

const ACTION_MAP: Record<string, string> = {
  purchase: "PURCHASE",
  "offsite_conversion.fb_pixel_purchase": "PURCHASE",
  lead: "LEAD",
  "offsite_conversion.fb_pixel_lead": "LEAD",
  "offsite_conversion.fb_pixel_complete_registration": "COMPLETE_REGISTRATION",
  complete_registration: "COMPLETE_REGISTRATION",
  link_click: "LINK_CLICK",
};

export type ConversionType = "PURCHASE" | "LEAD" | "COMPLETE_REGISTRATION" | "LINK_CLICK";

export async function detectConversionType(
  accountId: string,
  accessToken: string
): Promise<ConversionType | null> {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const since = thirtyDaysAgo.toISOString().split("T")[0];
  const until = today.toISOString().split("T")[0];

  const timeRange = JSON.stringify({ since, until });
  const path = `/${accountId}/insights?fields=actions&time_range=${timeRange}&level=account`;

  try {
    const response = await fbFetch<{ data: FBInsights[] }>(path, accessToken);
    const insights = response.data?.[0];
    if (!insights?.actions) return null;

    const counts: Record<string, number> = {};
    for (const action of insights.actions) {
      const mapped = ACTION_MAP[action.action_type];
      if (mapped) {
        counts[mapped] = (counts[mapped] || 0) + parseFloat(action.value);
      }
    }

    let best: string | null = null;
    let bestPriority = 0;
    for (const [type, count] of Object.entries(counts)) {
      if (count > 0 && (PRIORITY[type] || 0) > bestPriority) {
        best = type;
        bestPriority = PRIORITY[type] || 0;
      }
    }
    return best as ConversionType | null;
  } catch {
    return null;
  }
}
