export interface FBPaginatedResponse<T> {
  data: T[];
  paging?: { cursors?: { before: string; after: string }; next?: string; previous?: string };
}
export interface FBBatchRequest { method: string; relative_url: string; }
export interface FBBatchResponse { code: number; body: string; }
export interface FBErrorResponse { error: { message: string; code: number; error_subcode?: number; type: string } }
export interface FBInsights {
  spend?: string; impressions?: string; reach?: string; frequency?: string;
  clicks?: string; ctr?: string; cpc?: string; cpm?: string;
  actions?: { action_type: string; value: string }[];
  cost_per_action_type?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
  video_thruplay_watched_actions?: { action_type: string; value: string }[];
  results?: { indicator: string; values?: { value: string; attribution_windows: string[] }[] }[];
  cost_per_result?: { indicator: string; values?: { value: string; attribution_windows: string[] }[] }[];
}
export interface FBAdAccount { id: string; name: string; account_id: string; currency: string; account_status: number; business_name?: string; }
export interface FBCampaign { id: string; name: string; objective: string; status?: string; effective_status?: string; }

export interface FBAdSet {
  id: string;
  name: string;
}

export interface FBAd {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  preview_shareable_link?: string;
  campaign: FBCampaign;
  adset: FBAdSet;
  creative?: FBAdCreative;
}

export interface FBAdCreative {
  id: string;
  name?: string;
  body?: string;
  title?: string;
  image_url?: string;
  image_hash?: string;
  thumbnail_url?: string;
  call_to_action_type?: string;
  object_story_spec?: FBObjectStorySpec;
  asset_feed_spec?: FBAssetFeedSpec;
  effective_object_story_id?: string;
}

export interface FBObjectStorySpec {
  page_id?: string;
  link_data?: {
    message?: string;
    name?: string;
    link?: string;
    caption?: string;
    description?: string;
    picture?: string;
    image_hash?: string;
    image_crops?: Record<string, unknown>;
    call_to_action?: { type: string; value?: { link?: string } };
    child_attachments?: FBCarouselCard[];
  };
  video_data?: {
    message?: string;
    video_id?: string;
    image_url?: string;
    image_hash?: string;
    title?: string;
    call_to_action?: { type: string; value?: { link?: string } };
  };
  photo_data?: {
    caption?: string;
    image_hash?: string;
    url?: string;
  };
}

export interface FBCarouselCard {
  link?: string;
  name?: string;
  description?: string;
  picture?: string;
  image_hash?: string;
  image_url?: string;
  video_id?: string;
  call_to_action?: { type: string; value?: { link?: string } };
}

export interface FBAssetFeedSpec {
  bodies?: { text: string }[];
  titles?: { text: string }[];
  descriptions?: { text: string }[];
  images?: { hash?: string; url?: string }[];
  videos?: { video_id?: string; thumbnail_url?: string }[];
  link_urls?: { website_url: string }[];
  call_to_action_types?: string[];
  ad_formats?: string[];
}
