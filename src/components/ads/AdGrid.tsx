"use client";

import { AdCard } from "./AdCard";
import { EmptyState } from "./EmptyState";
import type { AdCreativeRow } from "@/lib/ads/types/ad";

/* ------------------------------------------------------------------ */
/* Skeleton card with shimmer animation                                */
/* ------------------------------------------------------------------ */

function SkeletonCard() {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        <div className="skeleton-shimmer h-4 w-3/4 rounded" />
        <div className="skeleton-shimmer h-3 w-1/2 rounded" />
      </div>
      {/* Creative placeholder */}
      <div className="px-4 pb-2">
        <div className="skeleton-shimmer w-full rounded-lg" style={{ aspectRatio: "1/1" }} />
      </div>
      {/* Text lines */}
      <div className="px-4 py-2 space-y-2">
        <div className="skeleton-shimmer h-3 w-full rounded" />
        <div className="skeleton-shimmer h-3 w-5/6 rounded" />
        <div className="skeleton-shimmer h-3 w-2/3 rounded" />
      </div>
      {/* Metrics */}
      <div className="px-4 py-2 flex gap-3">
        <div className="skeleton-shimmer h-8 flex-1 rounded" />
        <div className="skeleton-shimmer h-8 flex-1 rounded" />
        <div className="skeleton-shimmer h-8 flex-1 rounded" />
        <div className="skeleton-shimmer h-8 flex-1 rounded" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AdGrid                                                              */
/* ------------------------------------------------------------------ */

interface AdGridProps {
  ads: AdCreativeRow[];
  loading: boolean;
  selectedMetrics: string[];
  presetMetrics?: string[];
  accountName?: string;
  dateRange?: { since: string; until: string };
  currency?: string;
}

export function AdGrid({ ads, loading, selectedMetrics, presetMetrics, accountName, dateRange, currency = "USD" }: AdGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (ads.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ad-grid-stagger">
      {ads.map((ad) => (
        <AdCard key={ad.adId} ad={ad} selectedMetrics={selectedMetrics} presetMetrics={presetMetrics} accountName={accountName} dateRange={dateRange} currency={currency} />
      ))}
    </div>
  );
}
