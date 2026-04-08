import { fbBatch } from "@/lib/facebook/client";
import type { FBBatchRequest, FBInsights } from "@/lib/facebook/types";

const INSIGHT_FIELDS = "spend,impressions,reach,frequency,clicks,ctr,cpc,cpm,actions,cost_per_action_type,action_values";

export interface ParsedMetrics {
  spend: number | null; impressions: number | null; reach: number | null; frequency: number | null;
  clicks: number | null; ctr: number | null; cpc: number | null; cpm: number | null;
  leads: number | null; cpl: number | null; purchases: number | null; revenue: number | null;
  roas: number | null; cpa: number | null; add_to_cart: number | null; initiate_checkout: number | null;
  results: number | null; cost_per_result: number | null;
}

function getAction(actions: { action_type: string; value: string }[] | undefined, type: string): number | null {
  if (!actions) return null;
  const a = actions.find(x => x.action_type === type);
  return a ? parseFloat(a.value) : null;
}

function num(val?: string): number | null {
  if (!val) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

export function parseInsights(insights: FBInsights | null, objective?: string): ParsedMetrics {
  const empty: ParsedMetrics = {
    spend: null, impressions: null, reach: null, frequency: null,
    clicks: null, ctr: null, cpc: null, cpm: null,
    leads: null, cpl: null, purchases: null, revenue: null,
    roas: null, cpa: null, add_to_cart: null, initiate_checkout: null,
    results: null, cost_per_result: null,
  };
  if (!insights) return empty;

  const spend = num(insights.spend);
  const impressions = num(insights.impressions);
  const clicks = num(insights.clicks);
  const reach = num(insights.reach);
  const leads = getAction(insights.actions, "lead") ?? getAction(insights.actions, "offsite_conversion.fb_pixel_lead");
  const purchases = getAction(insights.actions, "purchase") ?? getAction(insights.actions, "offsite_conversion.fb_pixel_purchase");
  const addToCart = getAction(insights.actions, "offsite_conversion.fb_pixel_add_to_cart");
  const initiateCheckout = getAction(insights.actions, "offsite_conversion.fb_pixel_initiate_checkout");
  const revenue = getAction(insights.action_values, "purchase") ?? getAction(insights.action_values, "offsite_conversion.fb_pixel_purchase");

  const cpl = spend && leads && leads > 0 ? spend / leads : null;
  const cpa = spend && purchases && purchases > 0 ? spend / purchases : null;
  const roas = spend && revenue && spend > 0 ? revenue / spend : null;

  let results: number | null = null;
  if (objective) {
    const obj = objective.toUpperCase();
    if (obj.includes("LEAD")) results = leads;
    else if (obj.includes("CONVERSIONS") || obj.includes("OUTCOME_SALES")) results = purchases;
    else if (obj.includes("TRAFFIC") || obj.includes("LINK_CLICKS")) results = clicks;
    else if (obj.includes("REACH") || obj.includes("AWARENESS")) results = reach;
    else results = clicks;
  }
  const costPerResult = spend && results && results > 0 ? spend / results : null;

  return {
    spend, impressions, reach, frequency: num(insights.frequency),
    clicks, ctr: num(insights.ctr), cpc: num(insights.cpc), cpm: num(insights.cpm),
    leads, cpl, purchases, revenue, roas, cpa,
    add_to_cart: addToCart, initiate_checkout: initiateCheckout,
    results, cost_per_result: costPerResult,
  };
}

export async function fetchInsightsBatch(
  campaignIds: string[], dateRange: { since: string; until: string }, accessToken: string
): Promise<Map<string, FBInsights | null>> {
  const CHUNK = 25;
  const DELAY = 500;
  const result = new Map<string, FBInsights | null>();
  const chunks: string[][] = [];
  for (let i = 0; i < campaignIds.length; i += CHUNK) chunks.push(campaignIds.slice(i, i + CHUNK));

  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    const requests: FBBatchRequest[] = chunk.map(id => ({
      method: "GET",
      relative_url: `${id}/insights?fields=${INSIGHT_FIELDS}&time_range=${JSON.stringify(dateRange)}`,
    }));
    const responses = await fbBatch(requests, accessToken);
    responses.forEach((resp, idx) => {
      const id = chunk[idx];
      if (resp.code === 200) {
        try { result.set(id, JSON.parse(resp.body).data?.[0] ?? null); }
        catch { result.set(id, null); }
      } else { result.set(id, null); }
    });
    if (ci < chunks.length - 1) await new Promise(r => setTimeout(r, DELAY));
  }
  return result;
}
