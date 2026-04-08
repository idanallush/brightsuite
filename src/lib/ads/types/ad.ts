export type MediaType = "IMAGE" | "VIDEO" | "CAROUSEL" | "DYNAMIC" | "UNKNOWN";

export interface AdCreativeRow {
  // Ad info
  adId: string;
  adName: string;
  status: string;

  // Campaign info
  campaignId: string;
  campaignName: string;
  objective: string;

  // Adset info
  adsetId: string;
  adsetName: string;

  // Creative info
  creativeId: string;
  adCopy: string;
  headline: string;
  mediaType: MediaType;
  mediaUrl: string; // thumbnail URL
  destinationUrl: string;
  callToAction: string;
  previewUrl?: string;
  carouselCards?: CarouselCard[];
  /** Image hash from creative — used for grouping by creative */
  imageHash?: string;
  /** Number of ads merged into this card (server-side creative grouping) */
  variationCount?: number;

  // Metrics (all optional, populated from insights)
  metrics: Record<string, number | null>;
}

export interface CarouselCard {
  headline?: string;
  description?: string;
  imageUrl?: string;
  link?: string;
  /** Internal: image hash for resolving URL via adimages API. Not rendered. */
  _hash?: string;
}

export interface DateRange {
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
}
