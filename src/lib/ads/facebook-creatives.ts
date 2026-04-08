import type { FBAd, FBAdCreative } from "@/lib/facebook/types";
import type { AdCreativeRow, MediaType, CarouselCard } from "@/lib/ads/types/ad";
import { parseInsights, type ParsedMetrics } from "./facebook-insights";
import { fbBatch, fbFetch } from "@/lib/facebook/client";

/** Upgrade HTTP → HTTPS for Facebook CDN URLs (media proxy requires HTTPS). */
function ensureHttps(url: string): string {
  if (url.startsWith("http://")) return url.replace("http://", "https://");
  return url;
}

function extractMediaType(creative?: FBAdCreative): MediaType {
  if (!creative) return "UNKNOWN";

  let result: MediaType;

  // Smart detection for Dynamic / Advantage+ Creative ads
  if (creative.asset_feed_spec) {
    const afs = creative.asset_feed_spec;
    const imageCount = afs.images?.length || 0;
    const videoCount = afs.videos?.length || 0;

    if (imageCount > 1) result = "CAROUSEL";
    else if (videoCount > 0) result = "VIDEO";
    else if (imageCount === 1) result = "IMAGE";
    else result = "DYNAMIC";
  } else {
    const storySpec = creative.object_story_spec;
    if (storySpec) {
      if (storySpec.video_data) result = "VIDEO";
      else if (storySpec.link_data?.child_attachments && storySpec.link_data.child_attachments.length > 0) result = "CAROUSEL";
      else if (storySpec.link_data || storySpec.photo_data) result = "IMAGE";
      else result = "UNKNOWN";
    } else if (creative.image_url || creative.thumbnail_url) {
      result = "IMAGE";
    } else {
      result = "UNKNOWN";
    }
  }

  return result;
}

function extractAdCopy(creative?: FBAdCreative): string {
  if (!creative) return "";

  // Check body field first
  if (creative.body) return creative.body;

  const storySpec = creative.object_story_spec;
  if (storySpec) {
    if (storySpec.link_data?.message) return storySpec.link_data.message;
    if (storySpec.video_data?.message) return storySpec.video_data.message;
    if (storySpec.photo_data?.caption) return storySpec.photo_data.caption;
  }

  // Dynamic ads - take first body
  if (creative.asset_feed_spec?.bodies?.[0]) {
    return creative.asset_feed_spec.bodies[0].text;
  }

  return "";
}

function extractHeadline(creative?: FBAdCreative): string {
  if (!creative) return "";

  if (creative.title) return creative.title;

  const storySpec = creative.object_story_spec;
  if (storySpec) {
    // link_data.name is the standard headline for link ads
    if (storySpec.link_data?.name) return storySpec.link_data.name;
    if (storySpec.video_data?.title) return storySpec.video_data.title;
  }

  if (creative.asset_feed_spec?.titles?.[0]) {
    return creative.asset_feed_spec.titles[0].text;
  }

  return "";
}

function extractMediaUrl(creative?: FBAdCreative): string {
  if (!creative) return "";

  if (creative.image_url) return creative.image_url;
  if (creative.thumbnail_url) return creative.thumbnail_url;

  const storySpec = creative.object_story_spec;
  if (storySpec) {
    if (storySpec.video_data?.image_url) return storySpec.video_data.image_url;
    if (storySpec.link_data?.picture) return storySpec.link_data.picture;
    const firstCard = storySpec.link_data?.child_attachments?.[0];
    if (firstCard) {
      if (firstCard.picture) return firstCard.picture;
      if (firstCard.image_url) return firstCard.image_url;
    }
    if (storySpec.photo_data?.url) return storySpec.photo_data.url;
  }

  if (creative.asset_feed_spec?.images?.[0]?.url) {
    return creative.asset_feed_spec.images[0].url;
  }

  return "";
}

function extractDestinationUrl(creative?: FBAdCreative): string {
  if (!creative) return "";

  const storySpec = creative.object_story_spec;
  if (storySpec) {
    if (storySpec.link_data?.link) return storySpec.link_data.link;
    if (storySpec.link_data?.call_to_action?.value?.link) {
      return storySpec.link_data.call_to_action.value.link;
    }
    if (storySpec.video_data?.call_to_action?.value?.link) {
      return storySpec.video_data.call_to_action.value.link;
    }
  }

  if (creative.asset_feed_spec?.link_urls?.[0]) {
    return creative.asset_feed_spec.link_urls[0].website_url;
  }

  return "";
}

function extractCallToAction(creative?: FBAdCreative): string {
  if (!creative) return "";

  if (creative.call_to_action_type) return creative.call_to_action_type;

  const storySpec = creative.object_story_spec;
  if (storySpec) {
    if (storySpec.link_data?.call_to_action?.type) {
      return storySpec.link_data.call_to_action.type;
    }
    if (storySpec.video_data?.call_to_action?.type) {
      return storySpec.video_data.call_to_action.type;
    }
  }

  if (creative.asset_feed_spec?.call_to_action_types?.[0]) {
    return creative.asset_feed_spec.call_to_action_types[0];
  }

  return "";
}

function extractCarouselCards(creative?: FBAdCreative): CarouselCard[] | undefined {
  const linkData = creative?.object_story_spec?.link_data;
  const children = linkData?.child_attachments;

  // Standard carousel via child_attachments
  if (children && children.length > 0) {
    return children.map((child) => ({
      headline: child.name,
      description: child.description,
      imageUrl: child.picture || child.image_url,
      link: child.link,
    }));
  }

  // Dynamic/Advantage+ carousel via asset_feed_spec.images (multiple images)
  const afsImages = creative?.asset_feed_spec?.images;
  if (afsImages && afsImages.length > 1) {
    return afsImages.map((img) => ({
      imageUrl: img.url || "",
      _hash: img.hash,
    }));
  }

  return undefined;
}

export function normalizeAd(
  ad: FBAd,
  metrics: ParsedMetrics
): AdCreativeRow {
  const creative = ad.creative;
  const row: AdCreativeRow = {
    adId: ad.id,
    adName: ad.name,
    status: ad.effective_status || ad.status,
    campaignId: ad.campaign?.id || "",
    campaignName: ad.campaign?.name || "",
    objective: ad.campaign?.objective || "",
    adsetId: ad.adset?.id || "",
    adsetName: ad.adset?.name || "",
    creativeId: creative?.id || "",
    adCopy: extractAdCopy(creative),
    headline: extractHeadline(creative),
    mediaType: extractMediaType(creative),
    mediaUrl: extractMediaUrl(creative),
    destinationUrl: extractDestinationUrl(creative),
    callToAction: extractCallToAction(creative),
    previewUrl: ad.preview_shareable_link,
    carouselCards: extractCarouselCards(creative),
    imageHash: creative?.image_hash
      || creative?.object_story_spec?.link_data?.image_hash
      || creative?.object_story_spec?.photo_data?.image_hash
      || undefined,
    metrics: metrics as unknown as Record<string, number | null>,
  };
  return row;
}

export function normalizeAds(
  ads: FBAd[],
  insightsMap: Map<string, ParsedMetrics>
): AdCreativeRow[] {
  return ads.map((ad) => {
    const metrics = insightsMap.get(ad.id) ?? parseInsights(null);
    return normalizeAd(ad, metrics);
  });
}

/**
 * Resolve missing media URLs using multiple fallback strategies:
 * 1. effective_object_story_id → full_picture (works for posted ads)
 * 2. Image hash resolution via adimages API (works for Dynamic/DCO ads)
 */
export async function resolveMediaUrls(
  normalizedAds: AdCreativeRow[],
  originalAds: FBAd[],
  accessToken: string,
  accountId?: string
): Promise<AdCreativeRow[]> {
  let result = [...normalizedAds];

  // ------------------------------------------------------------------
  // Phase 1: Resolve via effective_object_story_id → full_picture
  // Runs on ALL ads with a story ID (not just those without mediaUrl)
  // to always upgrade small 130x130 thumbnails to full-size images.
  // Also fetches carousel card images at full size via attachments.
  // ------------------------------------------------------------------
  const storyIdMap = new Map<string, string>();
  for (const ad of originalAds) {
    if (ad.creative?.effective_object_story_id) {
      storyIdMap.set(ad.id, ad.creative.effective_object_story_id);
    }
  }

  // Track which ads were successfully resolved by Phase 1 so Phase 2
  // doesn't overwrite high-quality full_picture URLs with adimages URLs.
  const phase1Resolved = new Set<string>();

  const adsForStoryResolve = result.filter(
    (ad) => storyIdMap.has(ad.adId)
  );

  if (adsForStoryResolve.length > 0) {
    try {
      const batchRequests = adsForStoryResolve.map((ad) => ({
        method: "GET",
        relative_url: `${storyIdMap.get(ad.adId)}?fields=full_picture,attachments{media,subattachments{media}}`,
      }));

      console.log(`[Phase1] Resolving ${adsForStoryResolve.length} ads via story ID`);

      const responses = await fbBatch(batchRequests, accessToken);

      let gotFullPicture = 0;
      let noFullPicture = 0;

      for (let i = 0; i < adsForStoryResolve.length; i++) {
        const response = responses[i];
        if (response?.code === 200) {
          try {
            const body = JSON.parse(response.body);
            const idx = result.findIndex((a) => a.adId === adsForStoryResolve[i].adId);
            if (idx === -1) continue;

            const fullPicture = body.full_picture;

            // Always prefer full_picture over existing small URL
            if (fullPicture) {
              gotFullPicture++;
              phase1Resolved.add(adsForStoryResolve[i].adId);
              result[idx] = {
                ...result[idx],
                mediaUrl: ensureHttps(fullPicture),
                mediaType: result[idx].mediaType === "UNKNOWN" ? "IMAGE" : result[idx].mediaType,
              };
            } else {
              noFullPicture++;
            }

            // For carousels: upgrade card images from attachments → subattachments
            const subattachments = body.attachments?.data?.[0]?.subattachments?.data;
            if (subattachments && subattachments.length > 0) {
              if (result[idx].carouselCards && result[idx].carouselCards!.length > 0) {
                // Always upgrade card images — existing URLs are typically 130x130 thumbnails
                const updatedCards = [...(result[idx].carouselCards || [])];
                for (let j = 0; j < Math.min(updatedCards.length, subattachments.length); j++) {
                  const fullCardUrl = subattachments[j]?.media?.image?.src;
                  if (fullCardUrl) {
                    updatedCards[j] = {
                      ...updatedCards[j],
                      imageUrl: ensureHttps(fullCardUrl),
                    };
                  }
                }
                result[idx] = {
                  ...result[idx],
                  carouselCards: updatedCards,
                };
              } else if (
                subattachments.length > 1 &&
                (result[idx].mediaType === "CAROUSEL" || result[idx].mediaType === "DYNAMIC")
              ) {
                // Dynamic/carousel ad without cards yet — create cards from subattachments
                const newCards = subattachments
                  .map((sub: Record<string, unknown>) => {
                    const media = sub?.media as Record<string, unknown> | undefined;
                    const image = media?.image as Record<string, unknown> | undefined;
                    const src = image?.src as string | undefined;
                    return {
                      imageUrl: src ? ensureHttps(src) : "",
                    };
                  })
                  .filter((card: { imageUrl: string }) => card.imageUrl);
                if (newCards.length > 0) {
                  result[idx] = {
                    ...result[idx],
                    mediaType: "CAROUSEL",
                    carouselCards: newCards,
                  };
                }
              }
            }
          } catch {
            noFullPicture++;
          }
        } else {
          noFullPicture++;
        }
      }

      console.log(`[Phase1 Summary] sent=${adsForStoryResolve.length} | resolved=${gotFullPicture} | unresolved=${noFullPicture}`);
    } catch (err) {
      console.warn("Failed to resolve media via story IDs:", err);
    }
  }

  // ------------------------------------------------------------------
  // Phase 1.5: Resolve carousel card images via adimages API
  // child_attachments.picture is only 130×130; use image_hash to get
  // full-size originals from the adimages endpoint (needs ads_read only).
  // ------------------------------------------------------------------
  if (accountId) {
    const cardHashMap = new Map<string, { adId: string; cardIndex: number }[]>();

    for (const ad of originalAds) {
      const children = ad.creative?.object_story_spec?.link_data?.child_attachments;
      if (!children || children.length === 0) continue;

      for (let ci = 0; ci < children.length; ci++) {
        const hash = children[ci].image_hash;
        if (!hash) continue;
        const existing = cardHashMap.get(hash) || [];
        existing.push({ adId: ad.id, cardIndex: ci });
        cardHashMap.set(hash, existing);
      }
    }

    if (cardHashMap.size > 0) {
      const uniqueCardHashes = [...cardHashMap.keys()];

      try {
        for (let i = 0; i < uniqueCardHashes.length; i += 50) {
          const hashBatch = uniqueCardHashes.slice(i, i + 50);
          const hashesParam = encodeURIComponent(JSON.stringify(hashBatch));

          const response = await fbFetch<Record<string, unknown>>(
            `/${accountId}/adimages?hashes=${hashesParam}&fields=hash,url,permalink_url`,
            accessToken
          );

          const responseData = response as {
            data?: { hash: string; url: string; permalink_url?: string }[];
            images?: Record<string, { hash: string; url: string; permalink_url?: string }>;
          };

          const imageEntries: { hash: string; url: string; permalink_url?: string }[] = [];
          if (responseData.data && Array.isArray(responseData.data)) {
            imageEntries.push(...responseData.data);
          } else if (responseData.images) {
            imageEntries.push(...Object.values(responseData.images));
          }

          for (const imgData of imageEntries) {
            const hash = imgData.hash;
            const resolvedUrl = imgData?.permalink_url || imgData?.url;
            if (!hash || !resolvedUrl) continue;

            const mappings = cardHashMap.get(hash) || [];
            for (const { adId, cardIndex } of mappings) {
              const idx = result.findIndex((a) => a.adId === adId);
              if (idx !== -1 && result[idx].carouselCards?.[cardIndex]) {
                const updatedCards = [...(result[idx].carouselCards || [])];
                updatedCards[cardIndex] = {
                  ...updatedCards[cardIndex],
                  imageUrl: ensureHttps(resolvedUrl),
                };
                result[idx] = { ...result[idx], carouselCards: updatedCards };
              }
            }
          }
        }
      } catch (err) {
        console.warn("Failed to resolve carousel card image hashes:", err);
      }
    }
  }

  // ------------------------------------------------------------------
  // Phase 2: Resolve image hashes via adimages API
  // Only runs on ads NOT already resolved by Phase 1 (full_picture).
  // This handles Dynamic/DCO ads that lack effective_object_story_id.
  // ------------------------------------------------------------------
  if (accountId) {
    const hashToAdIds = new Map<string, string[]>(); // hash → [adId, ...]

    for (const ad of originalAds) {
      // Skip ads already resolved by Phase 1 — their full_picture is reliable
      if (phase1Resolved.has(ad.id)) continue;

      const hashes: string[] = [];

      // Source 1: creative.image_hash
      if (ad.creative?.image_hash) {
        hashes.push(ad.creative.image_hash);
      }

      // Source 2: asset_feed_spec.images[].hash (Dynamic/DCO ads)
      if (ad.creative?.asset_feed_spec?.images) {
        for (const img of ad.creative.asset_feed_spec.images) {
          if (img.hash) hashes.push(img.hash);
        }
      }

      // Source 3: object_story_spec link_data / photo_data image hashes
      const storySpec = ad.creative?.object_story_spec;
      if (storySpec?.link_data?.image_hash) {
        hashes.push(storySpec.link_data.image_hash);
      }
      if (storySpec?.photo_data?.image_hash) {
        hashes.push(storySpec.photo_data.image_hash);
      }

      // Map each hash to this ad
      for (const hash of hashes) {
        const existing = hashToAdIds.get(hash) || [];
        existing.push(ad.id);
        hashToAdIds.set(hash, existing);
      }
    }

    if (hashToAdIds.size > 0) {
      const uniqueHashes = [...hashToAdIds.keys()];

      console.log(`[Phase2] Resolving ${uniqueHashes.length} hashes for ${[...hashToAdIds.values()].flat().length} ads (skipped ${phase1Resolved.size} Phase1-resolved)`);

      try {
        let phase2Upgraded = 0;

        // Batch hashes in groups of 50 to avoid URL length limits
        for (let i = 0; i < uniqueHashes.length; i += 50) {
          const hashBatch = uniqueHashes.slice(i, i + 50);
          const hashesParam = encodeURIComponent(JSON.stringify(hashBatch));

          const response = await fbFetch<Record<string, unknown>>(
            `/${accountId}/adimages?hashes=${hashesParam}&fields=hash,url,permalink_url`,
            accessToken
          );

          const responseData = response as {
            data?: { hash: string; url: string; permalink_url?: string }[];
            images?: Record<string, { hash: string; url: string; permalink_url?: string }>;
          };

          // Support both formats: paginated data[] array and legacy images{} object
          const imageEntries: { hash: string; url: string; permalink_url?: string }[] = [];

          if (responseData.data && Array.isArray(responseData.data)) {
            imageEntries.push(...responseData.data);
          } else if (responseData.images) {
            imageEntries.push(...Object.values(responseData.images));
          }

          for (const imgData of imageEntries) {
            const hash = imgData.hash;
            // Prefer permalink_url (original full-size) over url
            const resolvedUrl = imgData?.permalink_url || imgData?.url;
            if (!hash || !resolvedUrl) continue;

            const adIds = hashToAdIds.get(hash) || [];
            for (const adId of adIds) {
              const idx = result.findIndex((a) => a.adId === adId);
              if (idx !== -1) {
                result[idx] = {
                  ...result[idx],
                  mediaUrl: ensureHttps(resolvedUrl),
                };
                phase2Upgraded++;

                // Also upgrade carousel cards that have this hash
                const cards = result[idx].carouselCards;
                if (cards) {
                  let cardsUpdated = false;
                  const updatedCards = cards.map((card) => {
                    if (card._hash === hash) {
                      cardsUpdated = true;
                      return { ...card, imageUrl: ensureHttps(resolvedUrl) };
                    }
                    return card;
                  });
                  if (cardsUpdated) {
                    result[idx] = { ...result[idx], carouselCards: updatedCards };
                  }
                }
              }
            }
          }
        }

        console.log(`[Phase2 Summary] uniqueHashes=${uniqueHashes.length} | upgraded=${phase2Upgraded}`);
      } catch (err) {
        console.warn("Failed to resolve image hashes:", err);
      }
    }

    // ------------------------------------------------------------------
    // Phase 3: Enhanced video thumbnail resolution
    // For VIDEO ads: upgrade small video_data.image_url to largest thumbnail
    // For carousel cards with video: resolve video thumbnails per card
    // For Dynamic ads: resolve video thumbnails from asset_feed_spec
    // Also handles Awareness carousels where child_attachments have video_id
    // ------------------------------------------------------------------
    interface VideoResolveEntry {
      adId: string;
      videoId: string;
      cardIndex?: number; // undefined = main media, number = carousel card index
    }

    const videoEntries: VideoResolveEntry[] = [];
    for (const ad of originalAds) {
      // Source 1: Regular video ads (always — their image_url is often small)
      const videoId = ad.creative?.object_story_spec?.video_data?.video_id;
      if (videoId) {
        videoEntries.push({ adId: ad.id, videoId });
      }

      // Source 2: Carousel child_attachments with video_id
      // Handles Awareness carousels where cards contain videos
      const children = ad.creative?.object_story_spec?.link_data?.child_attachments;
      if (children) {
        for (let ci = 0; ci < children.length; ci++) {
          if (children[ci].video_id) {
            videoEntries.push({ adId: ad.id, videoId: children[ci].video_id!, cardIndex: ci });
          }
        }
      }

      // Source 3: Dynamic ads — asset_feed_spec.videos
      // Process even if mediaUrl exists — it might be a tiny 64x64 thumbnail
      if (!videoId) {
        const videos = ad.creative?.asset_feed_spec?.videos;
        if (videos?.[0]?.video_id) {
          videoEntries.push({ adId: ad.id, videoId: videos[0].video_id });
        }
      }
    }

    if (videoEntries.length > 0) {
      console.log(`[Phase3] Resolving ${videoEntries.length} video thumbnails`);
      try {
        // Request all available thumbnails (up to 50) + picture field as fallback
        const batchRequests = videoEntries.map((v) => ({
          method: "GET",
          relative_url: `${v.videoId}?fields=thumbnails.limit(50){uri,width,height},picture`,
        }));

        const responses = await fbBatch(batchRequests, accessToken);

        let phase3Resolved = 0;
        let phase3PictureFallback = 0;
        const needsFallback: VideoResolveEntry[] = [];

        for (let i = 0; i < videoEntries.length; i++) {
          const response = responses[i];
          const entry = videoEntries[i];

          if (response?.code !== 200) {
            console.log(`[Image Resolution] ad_id=${entry.adId} phase=3 video=${entry.videoId} FAILED code=${response?.code}`);
            needsFallback.push(entry);
            continue;
          }

          try {
            const body = JSON.parse(response.body);
            const thumbnails = body.thumbnails?.data as
              | { uri?: string; width?: number; height?: number }[]
              | undefined;

            // Sort by width descending, pick largest >= 200px
            let bestUri = "";
            let bestWidth = 0;

            if (thumbnails && thumbnails.length > 0) {
              const sorted = [...thumbnails].sort((a, b) => (b.width || 0) - (a.width || 0));
              for (const t of sorted) {
                if (t.uri && (t.width || 0) >= 200) {
                  bestUri = t.uri;
                  bestWidth = t.width || 0;
                  break;
                }
              }
              // Track largest available even if < 200px (for logging)
              if (!bestUri && sorted[0]?.uri) {
                bestWidth = sorted[0].width || 0;
              }
            }

            // If no good thumbnail (< 200px), try video picture field
            if (!bestUri || bestWidth < 200) {
              const pictureUrl = typeof body.picture === "string"
                ? body.picture
                : body.picture?.data?.url;
              if (pictureUrl) {
                bestUri = pictureUrl;
                bestWidth = 0; // unknown, but picture is usually decent
                phase3PictureFallback++;
                console.log(`[Image Resolution] ad_id=${entry.adId} phase=3 video=${entry.videoId} using picture field (best thumbnail was ${bestWidth}px)`);
              }
            }

            if (bestUri) {
              const idx = result.findIndex((a) => a.adId === entry.adId);
              if (idx !== -1) {
                if (entry.cardIndex !== undefined) {
                  // Carousel card video thumbnail
                  const cards = [...(result[idx].carouselCards || [])];
                  if (cards[entry.cardIndex]) {
                    cards[entry.cardIndex] = { ...cards[entry.cardIndex], imageUrl: ensureHttps(bestUri) };
                    result[idx] = { ...result[idx], carouselCards: cards };
                  }
                } else {
                  // Main media
                  result[idx] = { ...result[idx], mediaUrl: ensureHttps(bestUri) };
                }
                phase3Resolved++;
                console.log(`[Image Resolution] ad_id=${entry.adId} phase=3 video=${entry.videoId} result=${bestWidth >= 200 ? bestWidth + "px" : "picture-fallback"}${entry.cardIndex !== undefined ? " card=" + entry.cardIndex : ""}`);
              }

              // If we only got a small thumbnail (not picture fallback), still try Phase 3.5
              if (bestWidth > 0 && bestWidth < 200) {
                needsFallback.push(entry);
              }
            } else {
              needsFallback.push(entry);
              console.log(`[Image Resolution] ad_id=${entry.adId} phase=3 video=${entry.videoId} NO good thumbnail found`);
            }
          } catch {
            needsFallback.push(entry);
          }
        }

        console.log(`[Phase3 Summary] total=${videoEntries.length} | resolved=${phase3Resolved} | picture_fallback=${phase3PictureFallback} | needs_fallback=${needsFallback.length}`);

        // ------------------------------------------------------------------
        // Phase 3.5: Video picture fallback via /picture?type=large
        // For videos where Phase 3 couldn't find a good thumbnail (< 200px),
        // try the video's /picture edge which returns a larger image.
        // ------------------------------------------------------------------
        if (needsFallback.length > 0) {
          console.log(`[Phase3.5] Trying /picture?type=large for ${needsFallback.length} videos`);

          const fallbackBatch = needsFallback.map((v) => ({
            method: "GET",
            relative_url: `${v.videoId}/picture?type=large&redirect=false`,
          }));

          try {
            const fallbackResponses = await fbBatch(fallbackBatch, accessToken);
            let phase35Resolved = 0;

            for (let i = 0; i < needsFallback.length; i++) {
              const resp = fallbackResponses[i];
              const entry = needsFallback[i];

              if (resp?.code === 200) {
                try {
                  const fbody = JSON.parse(resp.body);
                  const pictureUrl = fbody?.data?.url;
                  if (pictureUrl) {
                    const idx = result.findIndex((a) => a.adId === entry.adId);
                    if (idx !== -1) {
                      if (entry.cardIndex !== undefined) {
                        const cards = [...(result[idx].carouselCards || [])];
                        if (cards[entry.cardIndex]) {
                          cards[entry.cardIndex] = { ...cards[entry.cardIndex], imageUrl: ensureHttps(pictureUrl) };
                          result[idx] = { ...result[idx], carouselCards: cards };
                        }
                      } else {
                        result[idx] = { ...result[idx], mediaUrl: ensureHttps(pictureUrl) };
                      }
                      phase35Resolved++;
                      console.log(`[Image Resolution] ad_id=${entry.adId} phase=3.5 video=${entry.videoId} RESOLVED via /picture?type=large`);
                    }
                  } else {
                    console.log(`[Image Resolution] ad_id=${entry.adId} phase=3.5 FALLBACK - no good image found, using best available`);
                  }
                } catch {
                  // skip parse errors
                }
              } else {
                console.log(`[Image Resolution] ad_id=${entry.adId} phase=3.5 FAILED code=${resp?.code}`);
              }
            }

            console.log(`[Phase3.5 Summary] tried=${needsFallback.length} | resolved=${phase35Resolved}`);
          } catch (err) {
            console.warn("[Phase3.5] Failed to resolve video pictures:", err);
          }
        }
      } catch (err) {
        console.warn("Failed to resolve video thumbnails:", err);
      }
    }
  }

  // Final fallback: fill empty carousel card images with the ad's main mediaUrl
  for (let i = 0; i < result.length; i++) {
    const ad = result[i];
    if (ad.mediaType === "CAROUSEL" && ad.carouselCards && ad.mediaUrl) {
      let cardsUpdated = false;
      const updatedCards = ad.carouselCards.map((card) => {
        if (!card.imageUrl) {
          cardsUpdated = true;
          return { ...card, imageUrl: ad.mediaUrl };
        }
        return card;
      });
      if (cardsUpdated) {
        result[i] = { ...result[i], carouselCards: updatedCards };
      }
    }
  }

  return result;
}
