// Clients Dashboard — Creative discovery + performance sync (Agent B).
// Owns cd_creatives, cd_creative_assets, cd_creative_performance.
// Leaves the legacy ah_video_ads / discoverVideoAds() flow in ads-hub alone.

import { getTurso } from '@/lib/db/turso';
import { fbFetch, fbFetchAll } from '@/lib/facebook/client';
import type { CreativeType, Platform } from '@/lib/clients-dashboard/types';

// ---------------------------------------------------------------------------
// Local types (kept in this file to keep the foundation types.ts untouched).
// ---------------------------------------------------------------------------

export interface CreativeSyncResult {
  platform: Platform;
  status: 'success' | 'error';
  recordsSynced: number;
  error?: string;
}

interface MetaChildAttachment {
  link?: string;
  name?: string;
  description?: string;
  picture?: string;
  image_hash?: string;
  video_id?: string;
}

interface MetaCreativeShape {
  id?: string;
  name?: string;
  thumbnail_url?: string;
  image_url?: string;
  video_id?: string;
  effective_object_story_id?: string;
  object_story_spec?: {
    link_data?: {
      link?: string;
      message?: string;
      name?: string;
      description?: string;
      call_to_action?: { type?: string; value?: { link?: string } };
      child_attachments?: MetaChildAttachment[];
      picture?: string;
    };
    video_data?: {
      video_id?: string;
      title?: string;
      message?: string;
      image_url?: string;
      call_to_action?: { type?: string; value?: { link?: string } };
    };
    photo_data?: { url?: string; caption?: string };
    template_data?: { link?: string; message?: string; name?: string };
  };
  asset_feed_spec?: {
    videos?: Array<{ video_id?: string; thumbnail_url?: string }>;
    images?: Array<{ url?: string; hash?: string }>;
    bodies?: Array<{ text?: string }>;
    titles?: Array<{ text?: string }>;
    call_to_action_types?: string[];
    link_urls?: Array<{ website_url?: string }>;
  };
}

interface MetaAd {
  id: string;
  name?: string;
  campaign_id?: string;
  effective_status?: string;
  creative?: MetaCreativeShape;
}

interface MetaAdInsightRow {
  ad_id: string;
  date_start: string;
  impressions?: string;
  clicks?: string;
  spend?: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
  video_play_actions?: Array<{ action_type: string; value: string }>;
  video_p25_watched_actions?: Array<{ action_type: string; value: string }>;
  video_p50_watched_actions?: Array<{ action_type: string; value: string }>;
  video_p75_watched_actions?: Array<{ action_type: string; value: string }>;
  video_p95_watched_actions?: Array<{ action_type: string; value: string }>;
  video_p100_watched_actions?: Array<{ action_type: string; value: string }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureActPrefix(accountId: string): string {
  const cleaned = accountId.replace(/\s|-/g, '');
  return cleaned.startsWith('act_') ? cleaned : `act_${cleaned}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function chunkDateRange(
  startDate: string,
  endDate: string,
  chunkDays = 7,
): Array<{ start: string; end: string }> {
  const chunks: Array<{ start: string; end: string }> = [];
  let cursor = startDate;
  while (cursor <= endDate) {
    const candidateEnd = addDays(cursor, chunkDays - 1);
    const chunkEnd = candidateEnd > endDate ? endDate : candidateEnd;
    chunks.push({ start: cursor, end: chunkEnd });
    cursor = addDays(chunkEnd, 1);
  }
  return chunks;
}

function pickActionValue(
  actions: Array<{ action_type: string; value: string }> | undefined,
  types: string[],
): number {
  if (!actions) return 0;
  let total = 0;
  for (const a of actions) {
    if (types.includes(a.action_type)) total += Number(a.value || 0);
  }
  return total;
}

const CONVERSION_TYPES = [
  'lead',
  'purchase',
  'complete_registration',
  'contact',
  'submit_application',
  'offsite_conversion.fb_pixel_lead',
  'offsite_conversion.fb_pixel_purchase',
  'onsite_conversion.lead_grouped',
];

const REVENUE_TYPES = [
  'purchase',
  'omni_purchase',
  'offsite_conversion.fb_pixel_purchase',
];

// Classify a Meta ad creative into our 4 unified types.
// Order matters — collection wins over carousel wins over video wins over image.
// Defensive default is 'image' when nothing matches.
export function classifyCreative(creative: MetaCreativeShape | undefined): CreativeType {
  if (!creative) return 'image';

  const spec = creative.object_story_spec;

  // Collection ads: link_data with child_attachments AND a video header (template_data
  // or video_data alongside link_data). Heuristic: presence of template_data is the
  // strongest signal Meta uses for collection / instant experience.
  if (spec?.template_data && spec?.link_data?.child_attachments?.length) {
    return 'collection';
  }

  // Carousel: link_data with 2+ child_attachments.
  const children = spec?.link_data?.child_attachments;
  if (children && children.length >= 2) {
    return 'carousel';
  }

  // Video: explicit video_id on creative root, or video_data, or asset_feed video.
  if (creative.video_id) return 'video';
  if (spec?.video_data?.video_id) return 'video';
  if (creative.asset_feed_spec?.videos?.length) return 'video';

  // Single-child carousels are rare but real — promote to image rather than carousel.
  if (children && children.length === 1) {
    if (children[0].video_id) return 'video';
    return 'image';
  }

  // Plain image / link ads.
  return 'image';
}

interface FlatCreative {
  thumbnail: string | null;
  media: string | null;
  headline: string | null;
  body: string | null;
  cta: string | null;
  landing: string | null;
  assets: Array<{
    sortOrder: number;
    assetType: 'video' | 'image';
    thumbnail: string | null;
    media: string | null;
    headline: string | null;
    body: string | null;
    landing: string | null;
  }>;
}

function flattenCreative(
  creative: MetaCreativeShape | undefined,
  type: CreativeType,
): FlatCreative {
  const out: FlatCreative = {
    thumbnail: null,
    media: null,
    headline: null,
    body: null,
    cta: null,
    landing: null,
    assets: [],
  };
  if (!creative) return out;

  const spec = creative.object_story_spec;

  // Common: thumbnail, headline, body, landing.
  out.thumbnail = creative.thumbnail_url || creative.image_url || null;

  if (spec?.link_data) {
    out.headline = spec.link_data.name || null;
    out.body = spec.link_data.message || null;
    out.landing =
      spec.link_data.call_to_action?.value?.link || spec.link_data.link || null;
    out.cta = spec.link_data.call_to_action?.type || null;
    if (!out.thumbnail) out.thumbnail = spec.link_data.picture || null;
  } else if (spec?.video_data) {
    out.headline = spec.video_data.title || null;
    out.body = spec.video_data.message || null;
    out.landing = spec.video_data.call_to_action?.value?.link || null;
    out.cta = spec.video_data.call_to_action?.type || null;
    if (!out.thumbnail) out.thumbnail = spec.video_data.image_url || null;
  } else if (spec?.template_data) {
    out.headline = spec.template_data.name || null;
    out.body = spec.template_data.message || null;
    out.landing = spec.template_data.link || null;
  } else if (spec?.photo_data) {
    out.body = spec.photo_data.caption || null;
    if (!out.thumbnail) out.thumbnail = spec.photo_data.url || null;
  }

  // Asset feed fallback for headline/body/landing.
  const afs = creative.asset_feed_spec;
  if (afs) {
    if (!out.headline && afs.titles?.[0]?.text) out.headline = afs.titles[0].text!;
    if (!out.body && afs.bodies?.[0]?.text) out.body = afs.bodies[0].text!;
    if (!out.landing && afs.link_urls?.[0]?.website_url)
      out.landing = afs.link_urls[0].website_url!;
    if (!out.cta && afs.call_to_action_types?.[0])
      out.cta = afs.call_to_action_types[0];
  }

  // Type-specific media + assets.
  if (type === 'video') {
    // No directly-playable URL — Meta requires a separate /{video_id} fetch with
    // source. We store thumbnail as the visible media; the modal links out.
    out.media = out.thumbnail;
  } else if (type === 'image') {
    out.media = out.thumbnail;
  } else if (type === 'carousel' || type === 'collection') {
    const children = spec?.link_data?.child_attachments || [];
    children.forEach((child, idx) => {
      const assetType: 'video' | 'image' = child.video_id ? 'video' : 'image';
      out.assets.push({
        sortOrder: idx,
        assetType,
        thumbnail: child.picture || null,
        media: child.picture || null,
        headline: child.name || null,
        body: child.description || null,
        landing: child.link || null,
      });
    });
    // Use first child as the cover media if creative-level thumbnail missing.
    if (!out.media) out.media = out.assets[0]?.thumbnail || out.thumbnail;
  }

  return out;
}

// ---------------------------------------------------------------------------
// Sync 1 — Discovery: walk active ads, classify, upsert cd_creatives + assets.
// ---------------------------------------------------------------------------

export async function syncCreatives(
  clientId: number,
  accountId: string,
  accessToken: string,
): Promise<CreativeSyncResult> {
  const db = getTurso();
  const actId = ensureActPrefix(accountId);

  try {
    // Heavy expansion — keep page size modest to avoid Meta cell-count limits.
    const fields =
      'id,name,campaign_id,effective_status,' +
      'creative{id,name,thumbnail_url,image_url,video_id,effective_object_story_id,' +
      'object_story_spec,asset_feed_spec}';
    const path =
      `/${actId}/ads?fields=${fields}` +
      `&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE","PAUSED"]}]` +
      `&limit=25`;

    const ads = await fbFetchAll<MetaAd>(path, accessToken, 8);
    let recordsSynced = 0;

    for (const ad of ads) {
      const type = classifyCreative(ad.creative);
      const flat = flattenCreative(ad.creative, type);
      const rawJson = JSON.stringify(ad);

      // Upsert the creative row by (platform, platform_ad_id).
      const upsert = await db.execute({
        sql: `INSERT INTO cd_creatives (
                client_id, platform, platform_ad_id, platform_campaign_id,
                ad_name, type, thumbnail_url, media_url, headline, body, cta,
                landing_url, effective_status, last_seen_at, raw_json
              )
              VALUES (?, 'meta', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
              ON CONFLICT(platform, platform_ad_id) DO UPDATE SET
                client_id = excluded.client_id,
                platform_campaign_id = excluded.platform_campaign_id,
                ad_name = excluded.ad_name,
                type = excluded.type,
                thumbnail_url = excluded.thumbnail_url,
                media_url = excluded.media_url,
                headline = excluded.headline,
                body = excluded.body,
                cta = excluded.cta,
                landing_url = excluded.landing_url,
                effective_status = excluded.effective_status,
                last_seen_at = datetime('now'),
                raw_json = excluded.raw_json
              RETURNING id`,
        args: [
          clientId,
          ad.id,
          ad.campaign_id || null,
          ad.name || null,
          type,
          flat.thumbnail,
          flat.media,
          flat.headline,
          flat.body,
          flat.cta,
          flat.landing,
          ad.effective_status || null,
          rawJson,
        ],
      });

      const creativeId = Number(upsert.rows[0]?.id);

      // Replace assets for carousels / collections (simpler than diffing).
      if (creativeId && (type === 'carousel' || type === 'collection')) {
        await db.execute({
          sql: 'DELETE FROM cd_creative_assets WHERE creative_id = ?',
          args: [creativeId],
        });
        for (const a of flat.assets) {
          await db.execute({
            sql: `INSERT INTO cd_creative_assets
                  (creative_id, sort_order, asset_type, thumbnail_url, media_url, headline, body, landing_url)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              creativeId,
              a.sortOrder,
              a.assetType,
              a.thumbnail,
              a.media,
              a.headline,
              a.body,
              a.landing,
            ],
          });
        }
      }

      recordsSynced++;
    }

    return { platform: 'meta', status: 'success', recordsSynced };
  } catch (err) {
    return {
      platform: 'meta',
      status: 'error',
      recordsSynced: 0,
      error: (err as Error).message,
    };
  }
}

// ---------------------------------------------------------------------------
// Sync 2 — Performance: per-ad daily insights into cd_creative_performance.
// ---------------------------------------------------------------------------

interface MetaInsightsResponse {
  data: MetaAdInsightRow[];
  paging?: { next?: string };
}

async function fetchAdInsightsChunk(
  actId: string,
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<MetaAdInsightRow[]> {
  const fields = [
    'ad_id',
    'impressions',
    'clicks',
    'spend',
    'actions',
    'action_values',
    'video_play_actions',
    'video_p25_watched_actions',
    'video_p50_watched_actions',
    'video_p75_watched_actions',
    'video_p95_watched_actions',
    'video_p100_watched_actions',
  ].join(',');
  const path =
    `/${actId}/insights?fields=${fields}` +
    `&level=ad&time_increment=1` +
    `&time_range={"since":"${startDate}","until":"${endDate}"}` +
    `&limit=200`;

  const response = await fbFetch<MetaInsightsResponse>(path, accessToken);
  const rows = [...(response.data || [])];
  if (response.paging?.next) {
    const more = await fbFetchAll<MetaAdInsightRow>(response.paging.next, accessToken, 30);
    rows.push(...more);
  }
  return rows;
}

export async function syncCreativePerformance(
  clientId: number,
  startDate: string,
  endDate: string,
  accessToken: string,
): Promise<CreativeSyncResult> {
  const db = getTurso();

  try {
    // Resolve the meta_account_id for this client. We don't take an accountId param
    // here — perf sync is keyed off the client's stored account so the caller
    // doesn't have to redo the lookup.
    const accountRow = await db.execute({
      sql: 'SELECT meta_account_id FROM ah_clients WHERE id = ?',
      args: [clientId],
    });
    const accountId = accountRow.rows[0]?.meta_account_id as string | undefined;
    if (!accountId) {
      return {
        platform: 'meta',
        status: 'error',
        recordsSynced: 0,
        error: 'Client has no meta_account_id configured',
      };
    }
    const actId = ensureActPrefix(accountId);

    const chunks = chunkDateRange(startDate, endDate, 7);
    const allRows: MetaAdInsightRow[] = [];
    for (const chunk of chunks) {
      const rows = await fetchAdInsightsChunk(actId, accessToken, chunk.start, chunk.end);
      allRows.push(...rows);
    }

    // Map ad_id -> creative_id (only known creatives for this client).
    const creativeRows = await db.execute({
      sql: `SELECT id, platform_ad_id FROM cd_creatives WHERE client_id = ? AND platform = 'meta'`,
      args: [clientId],
    });
    const creativeByAd = new Map<string, number>();
    for (const r of creativeRows.rows) {
      creativeByAd.set(String(r.platform_ad_id), Number(r.id));
    }

    let recordsSynced = 0;

    for (const row of allRows) {
      const creativeId = creativeByAd.get(row.ad_id);
      if (!creativeId) continue; // Ad not yet discovered — skip; next syncCreatives will pick it up.

      const impressions = Number(row.impressions || 0);
      const clicks = Number(row.clicks || 0);
      const spend = Number(row.spend || 0);
      const conversions = pickActionValue(row.actions, CONVERSION_TYPES);
      const revenue = pickActionValue(row.action_values, REVENUE_TYPES);
      const videoViews = pickActionValue(row.video_play_actions, ['video_view']);
      const p25 = pickActionValue(row.video_p25_watched_actions, ['video_view']);
      const p50 = pickActionValue(row.video_p50_watched_actions, ['video_view']);
      const p75 = pickActionValue(row.video_p75_watched_actions, ['video_view']);
      const p95 = pickActionValue(row.video_p95_watched_actions, ['video_view']);
      const p100 = pickActionValue(row.video_p100_watched_actions, ['video_view']);

      await db.execute({
        sql: `INSERT INTO cd_creative_performance
                (creative_id, date, impressions, clicks, spend, conversions, revenue,
                 video_views, p25, p50, p75, p95, p100)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(creative_id, date) DO UPDATE SET
                impressions = excluded.impressions,
                clicks = excluded.clicks,
                spend = excluded.spend,
                conversions = excluded.conversions,
                revenue = excluded.revenue,
                video_views = excluded.video_views,
                p25 = excluded.p25,
                p50 = excluded.p50,
                p75 = excluded.p75,
                p95 = excluded.p95,
                p100 = excluded.p100`,
        args: [
          creativeId,
          row.date_start,
          impressions,
          clicks,
          spend,
          conversions,
          revenue,
          videoViews,
          p25,
          p50,
          p75,
          p95,
          p100,
        ],
      });
      recordsSynced++;
    }

    return { platform: 'meta', status: 'success', recordsSynced };
  } catch (err) {
    return {
      platform: 'meta',
      status: 'error',
      recordsSynced: 0,
      error: (err as Error).message,
    };
  }
}
