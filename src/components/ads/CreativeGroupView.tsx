"use client";

import { useMemo } from "react";
import { Layers, Users } from "lucide-react";
import { Badge } from "@/components/cpa/ui/badge";
import { ImageCreative } from "./creatives/ImageCreative";
import { VideoCreative } from "./creatives/VideoCreative";
import { CarouselCreative } from "./creatives/CarouselCreative";
import { TextOnlyCreative } from "./creatives/TextOnlyCreative";
import { formatMetricValue } from "@/lib/ads/format";
import { ALL_METRICS } from "@/lib/ads/types/metrics";
import type { AdCreativeRow } from "@/lib/ads/types/ad";

interface CreativeGroup {
  groupKey: string;
  ads: AdCreativeRow[];
  representative: AdCreativeRow;
  sums: Record<string, number>;
  averages: Record<string, number | null>;
  campaignLabel: string;
}

interface CreativeGroupViewProps {
  ads: AdCreativeRow[];
  selectedMetrics: string[];
  presetMetrics?: string[];
  loading: boolean;
  currency?: string;
  accountName?: string;
  dateRange?: { since: string; until: string };
}

const SUM_KEYS = ["spend", "impressions", "reach", "clicks", "leads", "purchases", "revenue"];
const AVG_KEYS = ["ctr", "cpc", "cpm", "cpl", "roas"];

function groupByCreative(ads: AdCreativeRow[]): CreativeGroup[] {
  const map = new Map<string, AdCreativeRow[]>();

  for (const ad of ads) {
    const key = ad.imageHash
      || (ad.creativeId ? ad.creativeId : null)
      || (ad.adCopy ? ad.adCopy.slice(0, 80) : null)
      || ad.adId;

    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(ad);
  }

  const groups: CreativeGroup[] = [];

  for (const [groupKey, groupAds] of map) {
    const representative = groupAds[0];

    const sums: Record<string, number> = {};
    for (const k of SUM_KEYS) sums[k] = 0;
    for (const ad of groupAds) {
      for (const k of SUM_KEYS) {
        sums[k] += (ad.metrics[k] as number) ?? 0;
      }
    }

    const averages: Record<string, number | null> = {};
    averages.ctr = sums.impressions > 0 ? (sums.clicks / sums.impressions) * 100 : null;
    averages.cpc = sums.clicks > 0 ? sums.spend / sums.clicks : null;
    averages.cpm = sums.impressions > 0 ? (sums.spend / sums.impressions) * 1000 : null;
    averages.cpl = sums.leads > 0 ? sums.spend / sums.leads : null;
    averages.roas = sums.spend > 0 ? sums.revenue / sums.spend : null;

    const uniqueCampaigns = new Set(groupAds.map((a) => a.campaignId));
    const campaignLabel =
      uniqueCampaigns.size === 1
        ? representative.campaignName
        : `${uniqueCampaigns.size} קמפיינים`;

    groups.push({
      groupKey,
      ads: groupAds,
      representative,
      sums,
      averages,
      campaignLabel,
    });
  }

  groups.sort((a, b) => (b.sums.spend ?? 0) - (a.sums.spend ?? 0));

  return groups;
}

function CreativeCardSkeleton() {
  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
      <div className="skeleton-shimmer aspect-square w-full" />
      <div className="p-4 space-y-3">
        <div className="skeleton-shimmer h-4 w-3/4 rounded" />
        <div className="skeleton-shimmer h-3 w-full rounded" />
        <div className="skeleton-shimmer h-3 w-2/3 rounded" />
        <div className="flex gap-3 mt-3">
          <div className="skeleton-shimmer h-8 flex-1 rounded" />
          <div className="skeleton-shimmer h-8 flex-1 rounded" />
        </div>
      </div>
    </div>
  );
}

function CreativeGroupCard({
  group,
  selectedMetrics,
  presetMetrics,
  currency = "USD",
}: {
  group: CreativeGroup;
  selectedMetrics: string[];
  presetMetrics?: string[];
  currency?: string;
}) {
  const ad = group.representative;
  const metricsToShow = presetMetrics ?? selectedMetrics;

  const combinedMetrics: Record<string, number | null> = { ...group.sums };
  for (const [k, v] of Object.entries(group.averages)) {
    combinedMetrics[k] = v;
  }

  const FALLBACK_METRICS = ["spend", "clicks", "ctr", "leads", "cpl"];
  const displayMetrics = metricsToShow.length > 0 ? metricsToShow : FALLBACK_METRICS;

  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow duration-200 relative ad-card-animate">
      {group.ads.length > 1 && (
        <div className="absolute top-3 start-3 z-10">
          <Badge className="gap-1 bg-blue-600 text-white hover:bg-blue-700 shadow-sm text-xs px-2 py-0.5">
            <Users className="h-3 w-3" />
            ×{group.ads.length} קהלים
          </Badge>
        </div>
      )}

      <div className="relative">
        {ad.mediaType === "IMAGE" && (
          <ImageCreative imageUrl={ad.mediaUrl} adName={ad.adName} />
        )}
        {ad.mediaType === "VIDEO" && (
          <VideoCreative thumbnailUrl={ad.mediaUrl} adName={ad.adName} />
        )}
        {ad.mediaType === "CAROUSEL" && (
          <CarouselCreative cards={ad.carouselCards || []} adName={ad.adName} />
        )}
        {(ad.mediaType === "UNKNOWN" || ad.mediaType === "DYNAMIC") && (
          <TextOnlyCreative />
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 max-w-full truncate">
            {group.campaignLabel}
          </Badge>
        </div>

        {ad.adCopy && (
          <p className="text-sm text-zinc-600 line-clamp-3 leading-relaxed">
            {ad.adCopy}
          </p>
        )}

        {ad.headline && (
          <p className="text-sm font-semibold text-zinc-800 line-clamp-1">
            {ad.headline}
          </p>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-zinc-100">
          {displayMetrics.map((metricKey) => {
            const def = ALL_METRICS.find((m) => m.key === metricKey);
            if (!def) return null;
            const value = combinedMetrics[metricKey];

            return (
              <div key={metricKey} className="flex justify-between items-center">
                <span className="text-[11px] text-zinc-400">{def.label}</span>
                <span className="text-sm font-semibold text-zinc-800 tabular-nums" dir="ltr">
                  {value !== null && value !== undefined
                    ? formatMetricValue(value, def.format, currency)
                    : "–"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function CreativeGroupView({
  ads,
  selectedMetrics,
  presetMetrics,
  loading,
  currency = "USD",
  accountName,
  dateRange,
}: CreativeGroupViewProps) {
  const groups = useMemo(() => groupByCreative(ads), [ads]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <CreativeCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Layers className="h-12 w-12 text-zinc-200 mb-4" aria-hidden="true" />
        <h2 className="text-base font-medium text-zinc-700 mb-1">לא נמצאו קריאייטיבים</h2>
        <p className="text-sm text-zinc-400">
          נסה לשנות את הפילטרים או טווח התאריכים.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-zinc-500">
        {groups.length} קריאייטיבים ייחודיים · {ads.length} מודעות
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ad-grid-stagger">
        {groups.map((group) => (
          <CreativeGroupCard
            key={group.groupKey}
            group={group}
            selectedMetrics={selectedMetrics}
            presetMetrics={presetMetrics}
            currency={currency}
          />
        ))}
      </div>
    </div>
  );
}
