import { fbFetchAll } from "@/lib/facebook/client";
import type { FBAd } from "@/lib/facebook/types";

export const AD_FIELDS = [
  "id",
  "name",
  "status",
  "effective_status",
  "preview_shareable_link",
  "campaign{id,name,objective}",
  "adset{id,name}",
  "creative{id,name,body,title,image_url,image_hash,thumbnail_url,call_to_action_type,object_story_spec,asset_feed_spec,effective_object_story_id}",
].join(",");

export interface FetchAdsOptions {
  /** Statuses to include. Defaults to ["ACTIVE"]. */
  effectiveStatuses?: string[];
  /** Maximum pages to paginate through. Defaults to 10 (~250 ads). */
  maxPages?: number;
  /** If set, fetch ads for this specific campaign (no page limit). */
  campaignId?: string;
}

/**
 * Fetch ads for a given ad account with optional status filtering.
 *
 * @param accountId - Facebook ad account ID (format: act_XXXXXXXX)
 * @param accessToken - User access token
 * @param options - Fetch options (statuses, pagination)
 */
export async function fetchAds(
  accountId: string,
  accessToken: string,
  options: FetchAdsOptions = {}
): Promise<FBAd[]> {
  const statuses = options.effectiveStatuses ?? ["ACTIVE"];
  const effectiveStatusParam = encodeURIComponent(JSON.stringify(statuses));

  // When fetching a specific campaign, remove page limit to get ALL ads
  const endpoint = options.campaignId
    ? `/${options.campaignId}/ads`
    : `/${accountId}/ads`;
  const maxPages = options.campaignId ? 100 : (options.maxPages ?? 10);

  // limit=25 to avoid Facebook's "reduce data" query complexity error
  // when fetching heavy creative fields (object_story_spec, asset_feed_spec).
  // 300ms delay between pages to stay under rate limits.
  return fbFetchAll<FBAd>(
    `${endpoint}?fields=${AD_FIELDS}&effective_status=${effectiveStatusParam}&limit=25`,
    accessToken,
    maxPages,
    300
  );
}

/**
 * Convenience wrapper — fetch only ACTIVE ads.
 *
 * @deprecated Prefer `fetchAds` with explicit options.
 */
export async function fetchActiveAds(
  accountId: string,
  accessToken: string
): Promise<FBAd[]> {
  return fetchAds(accountId, accessToken, { effectiveStatuses: ["ACTIVE"] });
}
