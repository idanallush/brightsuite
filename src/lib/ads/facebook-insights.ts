import { fbBatch } from "@/lib/facebook/client";
import type { FBBatchRequest, FBInsights } from "@/lib/facebook/types";

const INSIGHT_FIELDS = [
  "spend",
  "impressions",
  "reach",
  "frequency",
  "clicks",
  "ctr",
  "cpc",
  "cpm",
  "actions",
  "cost_per_action_type",
  "action_values",
  "video_thruplay_watched_actions",
  "results",
  "cost_per_result",
].join(",");

export interface ParsedMetrics {
  spend: number | null;
  impressions: number | null;
  reach: number | null;
  frequency: number | null;
  clicks: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  leads: number | null;
  cpl: number | null;
  lead_cost: number | null;
  purchases: number | null;
  revenue: number | null;
  roas: number | null;
  cpa: number | null;
  add_to_cart: number | null;
  initiate_checkout: number | null;
  video_views: number | null;
  thruplays: number | null;
  results: number | null;
  cost_per_result: number | null;
  leads_ctr: number | null;
  leads_cpc: number | null;
}

function getActionValue(
  actions: { action_type: string; value: string }[] | undefined,
  actionType: string
): number | null {
  if (!actions) return null;
  const action = actions.find((a) => a.action_type === actionType);
  return action ? parseFloat(action.value) : null;
}

function parseNum(val: string | undefined): number | null {
  if (!val) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

export function parseInsights(
  insights: FBInsights | null,
  objective?: string
): ParsedMetrics {
  if (!insights) {
    return {
      spend: null, impressions: null, reach: null, frequency: null,
      clicks: null, ctr: null, cpc: null, cpm: null,
      leads: null, cpl: null, lead_cost: null,
      purchases: null, revenue: null, roas: null, cpa: null,
      add_to_cart: null, initiate_checkout: null,
      video_views: null, thruplays: null,
      results: null, cost_per_result: null,
      leads_ctr: null, leads_cpc: null,
    };
  }

  const spend = parseNum(insights.spend);
  const impressions = parseNum(insights.impressions);
  const reach = parseNum(insights.reach);
  const frequency = parseNum(insights.frequency);
  const clicks = parseNum(insights.clicks);
  const ctr = parseNum(insights.ctr);
  const cpc = parseNum(insights.cpc);
  const cpm = parseNum(insights.cpm);

  // Results — Facebook returns as [{indicator, values: [{value, attribution_windows}]}]
  // Computed early so it can be used as fallback for leads in custom conversion campaigns
  let fbResults: number | null = null;
  if (insights.results && insights.results.length > 0) {
    const firstResult = insights.results[0];
    if (firstResult.values && firstResult.values.length > 0) {
      fbResults = parseFloat(firstResult.values[0].value || "0");
    } else {
      fbResults = 0;
    }
  }

  // Extract actions
  const nativeLeads = getActionValue(insights.actions, "lead") ??
    getActionValue(insights.actions, "offsite_conversion.fb_pixel_lead");

  // For campaigns using custom conversions (e.g. GloboFormBuilder),
  // native lead actions are null — use fbResults as fallback when objective is LEAD
  const leads = nativeLeads ??
    (objective?.toUpperCase().includes("LEAD") && fbResults !== null && fbResults > 0
      ? fbResults
      : nativeLeads);

  const purchases = getActionValue(insights.actions, "purchase") ??
    getActionValue(insights.actions, "offsite_conversion.fb_pixel_purchase");
  const addToCart = getActionValue(insights.actions, "offsite_conversion.fb_pixel_add_to_cart");
  const initiateCheckout = getActionValue(insights.actions, "offsite_conversion.fb_pixel_initiate_checkout");
  const videoViews = getActionValue(insights.actions, "video_view");
  const thruplays = getActionValue(
    insights.video_thruplay_watched_actions,
    "video_view"
  );

  // Revenue from action_values
  const revenue = getActionValue(insights.action_values, "purchase") ??
    getActionValue(insights.action_values, "offsite_conversion.fb_pixel_purchase");

  // Computed metrics
  const cpl = spend !== null && leads !== null && leads > 0 ? spend / leads : null;
  const leadCost = cpl;
  const roas = spend !== null && revenue !== null && spend > 0 ? revenue / spend : null;
  const cpa = spend !== null && purchases !== null && purchases > 0 ? spend / purchases : null;

  let results: number | null = fbResults !== null ? fbResults : null;
  if (results === null && objective) {
    const obj = objective.toUpperCase();
    if (obj.includes("LEAD")) results = leads;
    else if (obj.includes("CONVERSIONS") || obj.includes("OUTCOME_SALES")) results = purchases;
    else if (obj.includes("TRAFFIC") || obj.includes("LINK_CLICKS")) results = clicks;
    else if (obj.includes("REACH") || obj.includes("AWARENESS")) results = reach;
    else if (obj.includes("VIDEO")) results = videoViews;
    else results = clicks; // fallback
  }

  let fbCostPerResult: number | null = null;
  if (insights.cost_per_result && insights.cost_per_result.length > 0) {
    const first = insights.cost_per_result[0];
    if (first.values && first.values.length > 0) {
      fbCostPerResult = parseNum(first.values[0].value);
    }
  }
  const costPerResult = fbCostPerResult
    ?? (spend !== null && results !== null && results > 0 ? spend / results : null);

  return {
    spend, impressions, reach, frequency,
    clicks, ctr, cpc, cpm,
    leads, cpl, lead_cost: leadCost,
    purchases, revenue, roas, cpa,
    add_to_cart: addToCart, initiate_checkout: initiateCheckout,
    video_views: videoViews, thruplays,
    results, cost_per_result: costPerResult,
    leads_ctr: ctr, leads_cpc: cpc,
  };
}

/**
 * Fetch insights for a list of ad IDs using the Facebook Batch API.
 * Splits into chunks of 25 (not the default 50) because insights requests
 * with heavy fields (actions, cost_per_action_type, action_values, etc.)
 * hit Facebook's "reduce data" limit at 50 items.
 * A 500ms delay between chunks avoids rate limiting.
 */
export async function fetchInsightsBatch(
  adIds: string[],
  dateRange: { since: string; until: string },
  accessToken: string
): Promise<Map<string, FBInsights | null>> {
  const INSIGHTS_CHUNK_SIZE = 25;
  const CHUNK_DELAY_MS = 500;
  const result = new Map<string, FBInsights | null>();

  // Split adIds into chunks of 25
  const chunks: string[][] = [];
  for (let i = 0; i < adIds.length; i += INSIGHTS_CHUNK_SIZE) {
    chunks.push(adIds.slice(i, i + INSIGHTS_CHUNK_SIZE));
  }

  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];

    const requests: FBBatchRequest[] = chunk.map((adId) => ({
      method: "GET",
      relative_url: `${adId}/insights?fields=${INSIGHT_FIELDS}&time_range=${JSON.stringify(dateRange)}`,
    }));

    const responses = await fbBatch(requests, accessToken);

    responses.forEach((response, index) => {
      const adId = chunk[index];
      if (response.code === 200) {
        try {
          const body = JSON.parse(response.body);
          result.set(adId, body.data?.[0] ?? null);
        } catch {
          result.set(adId, null);
        }
      } else {
        result.set(adId, null);
      }
    });

    // Delay between chunks to avoid rate limiting (skip after last chunk)
    if (ci < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));
    }
  }

  return result;
}
