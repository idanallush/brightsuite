"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";

import { ChevronDown, Megaphone, Target, CheckSquare, Square } from "lucide-react";
import { Badge } from "@/components/cpa/ui/badge";
import { Button } from "@/components/cpa/ui/button";
import { AdCard } from "./AdCard";
import { formatMetricValue, formatObjective } from "@/lib/ads/format";
import { METRIC_PRESETS, DEFAULT_PRESET, type PresetKey } from "@/lib/ads/metric-presets";
import type { AdCreativeRow } from "@/lib/ads/types/ad";
import type { ParsedMetrics } from "@/lib/ads/facebook-insights";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CampaignGroup {
  campaignId: string;
  campaignName: string;
  objective: string;
  ads: AdCreativeRow[];
  sums: Record<string, number>;
}

async function campaignInsightsFetcher(url: string): Promise<Record<string, ParsedMetrics>> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch campaign insights");
  const json = await res.json();
  return json.insights ?? {};
}

interface SummaryGroup {
  label: string;
  adIds: Set<string>;
}

interface CampaignViewProps {
  ads: AdCreativeRow[];
  selectedMetrics: string[];
  presetMetrics?: string[];
  activePreset?: PresetKey;
  loading: boolean;
  accountName?: string;
  dateRange?: { since: string; until: string };
  currency?: string;
  accountId?: string | null;
  selectedAdIds?: Set<string>;
  onToggleAd?: (adId: string) => void;
  summaryGroups?: SummaryGroup[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const AGGREGATE_KEYS = ["spend", "leads", "impressions", "reach", "purchases", "revenue", "clicks"];

function groupByCampaign(ads: AdCreativeRow[]): CampaignGroup[] {
  const map = new Map<string, AdCreativeRow[]>();

  for (const ad of ads) {
    const key = ad.campaignId;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(ad);
  }

  const groups: CampaignGroup[] = [];

  for (const [campaignId, campaignAds] of map) {
    const first = campaignAds[0];
    const sums: Record<string, number> = {};

    for (const k of AGGREGATE_KEYS) {
      sums[k] = 0;
    }

    for (const ad of campaignAds) {
      for (const k of AGGREGATE_KEYS) {
        sums[k] += (ad.metrics[k] as number) ?? 0;
      }
    }

    groups.push({
      campaignId,
      campaignName: first.campaignName,
      objective: first.objective,
      ads: campaignAds,
      sums,
    });
  }

  groups.sort((a, b) => (b.sums.spend ?? 0) - (a.sums.spend ?? 0));

  return groups;
}

// ---------------------------------------------------------------------------
// Campaign Accordion Header
// ---------------------------------------------------------------------------
function CampaignHeader({
  group,
  isOpen,
  onToggle,
  activePreset = DEFAULT_PRESET,
  currency = "USD",
  selectedAdIds,
  onToggleAd,
  campaignInsights,
}: {
  group: CampaignGroup;
  isOpen: boolean;
  onToggle: () => void;
  activePreset?: PresetKey;
  currency?: string;
  selectedAdIds?: Set<string>;
  onToggleAd?: (adId: string) => void;
  campaignInsights?: ParsedMetrics | null;
}) {
  const summaryConfig = METRIC_PRESETS[activePreset].campaignSummary;

  const metricsSource: Record<string, number> = campaignInsights
    ? Object.fromEntries(
        Object.entries(campaignInsights)
          .filter(([, v]) => v !== null && v !== undefined)
          .map(([k, v]) => [k, v as number])
      )
    : group.sums;

  const allSelected = group.ads.length > 0 && selectedAdIds != null && group.ads.every((ad) => selectedAdIds.has(ad.adId));

  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onToggleAd || group.ads.length === 0) return;
    if (allSelected) {
      for (const ad of group.ads) {
        if (selectedAdIds?.has(ad.adId)) onToggleAd(ad.adId);
      }
    } else {
      for (const ad of group.ads) {
        if (!selectedAdIds?.has(ad.adId)) onToggleAd(ad.adId);
      }
    }
  };

  return (
    <div
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onToggle(); }}
      className={cn(
        "w-full flex items-center gap-4 px-5 py-4 text-right rounded-xl border transition-all duration-200 cursor-pointer",
        isOpen
          ? "bg-white border-zinc-300 shadow-sm"
          : "bg-zinc-50 border-zinc-200 hover:bg-white hover:shadow-sm"
      )}
      aria-expanded={isOpen}
    >
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200",
          isOpen && "rotate-180"
        )}
        aria-hidden="true"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {(() => {
            const hasImpressions = (metricsSource.impressions ?? group.sums.impressions ?? 0) > 0;
            const hasAds = group.ads.length > 0;
            return (
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  hasImpressions ? "campaign-status-pulse" : ""
                )}
                style={{
                  backgroundColor: hasImpressions
                    ? "#22C55E"
                    : hasAds
                      ? "#F59E0B"
                      : "#D1D5DB",
                }}
                aria-label={
                  hasImpressions ? "קמפיין פעיל" : hasAds ? "קמפיין מושהה" : "ללא נתוני מודעות"
                }
              />
            );
          })()}
          <Megaphone className="h-4 w-4 text-zinc-500 shrink-0" aria-hidden="true" />
          <span className="text-sm font-semibold text-zinc-800 truncate">
            {group.campaignName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {group.objective && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5">
              <Target className="h-2.5 w-2.5 me-1" aria-hidden="true" />
              {formatObjective(group.objective)}
            </Badge>
          )}
          <span className="text-xs text-zinc-500">
            {group.ads.length > 0
              ? `${group.ads.length} מודעות`
              : "לחץ לפתיחה"}
          </span>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-6 shrink-0">
        {summaryConfig.map((cfg) => {
          let value: number | null;

          if (campaignInsights && cfg.key in metricsSource) {
            value = metricsSource[cfg.key] ?? null;
          } else if (cfg.aggregate === "sum") {
            value = metricsSource[cfg.key] ?? 0;
          } else {
            const divisor = metricsSource[cfg.divisorKey!] ?? 0;
            if (cfg.key === "roas") {
              value = divisor > 0 ? (metricsSource.revenue ?? 0) / divisor : null;
            } else {
              const numerator = metricsSource.spend ?? 0;
              if (cfg.key === "cpm") {
                value = divisor > 0 ? (numerator / divisor) * 1000 : null;
              } else {
                value = divisor > 0 ? numerator / divisor : null;
              }
            }
          }
          return (
            <div key={cfg.key} className="flex flex-col items-start gap-0.5">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wide">
                {cfg.label}
              </span>
              <span className="text-sm font-semibold text-zinc-800 tabular-nums" dir="ltr">
                {value !== null && value !== undefined
                  ? formatMetricValue(value, cfg.format, currency)
                  : "–"}
              </span>
            </div>
          );
        })}
      </div>

      {isOpen && onToggleAd && (
        <Button
          variant="ghost"
          size="sm"
          className="min-w-[44px] min-h-[44px] p-0 shrink-0"
          onClick={handleSelectAll}
          disabled={group.ads.length === 0}
          title="סמן את כל מודעות הקמפיין"
        >
          {allSelected ? (
            <CheckSquare className="h-4 w-4 text-yellow-500" aria-hidden="true" />
          ) : (
            <Square className="h-4 w-4 text-zinc-400" aria-hidden="true" />
          )}
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function CampaignView({ ads, selectedMetrics, presetMetrics, activePreset = DEFAULT_PRESET, loading, accountName, dateRange, currency = "USD", accountId, selectedAdIds, onToggleAd, summaryGroups }: CampaignViewProps) {
  const [openCampaigns, setOpenCampaigns] = useState<Set<string>>(new Set());

  const campaigns = useMemo(() => groupByCampaign(ads), [ads]);

  const campaignIds = useMemo(() => campaigns.map((c) => c.campaignId), [campaigns]);
  const campaignInsightsKey = campaignIds.length > 0 && dateRange?.since && dateRange?.until
    ? `/api/ads/facebook/campaign-insights?campaign_ids=${campaignIds.join(",")}&since=${dateRange.since}&until=${dateRange.until}`
    : null;
  const { data: campaignInsightsMap } = useSWR<Record<string, ParsedMetrics>>(
    campaignInsightsKey,
    campaignInsightsFetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const totalAdsCount = ads.length;

  const toggleCampaign = (campaignId: string) => {
    setOpenCampaigns((prev) => {
      const next = new Set(prev);
      if (next.has(campaignId)) {
        next.delete(campaignId);
      } else {
        next.add(campaignId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="skeleton-shimmer h-5 w-5 rounded-full" />
              <div className="skeleton-shimmer h-4 w-48 rounded" />
              <div className="skeleton-shimmer h-5 w-16 rounded-full ms-auto" />
            </div>
            <div className="px-4 pb-3 flex gap-4">
              <div className="skeleton-shimmer h-6 w-24 rounded" />
              <div className="skeleton-shimmer h-6 w-24 rounded" />
              <div className="skeleton-shimmer h-6 w-24 rounded" />
              <div className="skeleton-shimmer h-6 w-24 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (campaigns.length === 0 && ads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Megaphone className="h-12 w-12 text-zinc-200 mb-4" aria-hidden="true" />
        <h2 className="text-base font-medium text-zinc-700 mb-1">לא נמצאו קמפיינים</h2>
        <p className="text-sm text-zinc-400">
          נסה לשנות את הפילטרים או טווח התאריכים.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-zinc-500">
        {campaigns.length} קמפיינים ·{" "}
        {totalAdsCount} מודעות
      </div>

      {campaigns.map((group) => {
        const isOpen = openCampaigns.has(group.campaignId);

        return (
          <div key={group.campaignId} className="ad-card-animate">
            <CampaignHeader
              group={group}
              isOpen={isOpen}
              onToggle={() => toggleCampaign(group.campaignId)}
              activePreset={activePreset}
              currency={currency}
              selectedAdIds={selectedAdIds}
              onToggleAd={onToggleAd}
              campaignInsights={campaignInsightsMap?.[group.campaignId]}
            />

            {isOpen && group.ads.length > 0 && (
              <div className="mt-3 ms-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ad-grid-stagger">
                  {group.ads.map((ad) => {
                    const adGroups = summaryGroups?.filter((g) => g.adIds.has(ad.adId)) ?? [];
                    return (
                      <div key={ad.adId} className="relative">
                        {adGroups.length > 0 && (
                          <div className="absolute top-2 start-2 z-10 flex gap-1">
                            {adGroups.map((g) => (
                              <span
                                key={g.label}
                                className="bg-[#1877F2] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm"
                              >
                                {g.label}
                              </span>
                            ))}
                          </div>
                        )}
                        <AdCard
                          ad={ad}
                          selectedMetrics={selectedMetrics}
                          presetMetrics={presetMetrics}
                          accountName={accountName}
                          dateRange={dateRange}
                          currency={currency}
                          isSelected={selectedAdIds?.has(ad.adId)}
                          onToggleSelect={onToggleAd ? () => onToggleAd(ad.adId) : undefined}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {isOpen && group.ads.length === 0 && (
              <div className="mt-3 ms-4">
                <div className="py-6 text-center text-sm text-zinc-400 border border-dashed border-zinc-200 rounded-lg">
                  אין מודעות זמינות בתקופה זו
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
