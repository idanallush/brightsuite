"use client";

import { useState, useCallback } from "react";
import { ExternalLink, Download, FileDown, Smartphone, Loader2, Megaphone, Users } from "lucide-react";
import { Badge } from "@/components/cpa/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/cpa/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/cpa/ui/tabs";
import { ImageCreative } from "./creatives/ImageCreative";
import { VideoCreative } from "./creatives/VideoCreative";
import { CarouselCreative } from "./creatives/CarouselCreative";
import { TextOnlyCreative } from "./creatives/TextOnlyCreative";
import { Checkbox } from "@/components/cpa/ui/checkbox";
import { formatMetricValue, formatCallToAction } from "@/lib/ads/format";
import { useAdStore } from "@/stores/ads/useAdStore";
import type { AdCreativeRow } from "@/lib/ads/types/ad";

interface AdCardProps {
  ad: AdCreativeRow;
  selectedMetrics: string[];
  /** Metrics from the active preset — displayed on the card */
  presetMetrics?: string[];
  accountName?: string;
  dateRange?: { since: string; until: string };
  currency?: string;
  /** When provided, shows a selection checkbox on the card */
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

const MEDIA_TYPE_LABELS: Record<string, string> = {
  IMAGE: "תמונה",
  VIDEO: "וידאו",
  CAROUSEL: "קרוסלה",
  DYNAMIC: "דינמי",
  UNKNOWN: "טקסט בלבד",
};

const MEDIA_TYPE_COLORS: Record<string, string> = {
  IMAGE: "bg-[#E3F2FD] text-[#1877F2] border-[#BBD6FB]",
  VIDEO: "bg-[#E3F2FD] text-[#1877F2] border-[#BBD6FB]",
  CAROUSEL: "bg-[#E3F2FD] text-[#1877F2] border-[#BBD6FB]",
  DYNAMIC: "bg-[#E3F2FD] text-[#1877F2] border-[#BBD6FB]",
  UNKNOWN: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PAUSED: "bg-amber-100 text-amber-700 border-amber-200",
  ARCHIVED: "bg-zinc-100 text-zinc-500 border-zinc-200",
  DELETED: "bg-red-100 text-red-600 border-red-200",
};

import { ALL_METRICS, type MetricDefinition } from "@/lib/ads/types/metrics";

const FALLBACK_METRICS: string[] = ["spend", "clicks", "ctr", "leads", "cpl"];

export function AdCard({ ad, selectedMetrics, presetMetrics, accountName, dateRange, currency = "USD", isSelected, onToggleSelect }: AdCardProps) {
  const [copyExpanded, setCopyExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const selectedAccountId = useAdStore((s) => s.selectedAccountId);

  const accountNum = selectedAccountId?.replace(/^act_/, "") ?? "";
  const facebookAdLink = ad.previewUrl
    ? ad.previewUrl
    : accountNum
      ? `https://www.facebook.com/adsmanager/manage/ads?act=${accountNum}&selected_ad_ids=${ad.adId}`
      : `https://www.facebook.com/ads/library/?id=${ad.adId}`;

  const handleDownload = useCallback(async () => {
    if (!ad.mediaUrl || isDownloading) return;
    setIsDownloading(true);
    try {
      const proxyUrl = `/api/ads/facebook/media?url=${encodeURIComponent(ad.mediaUrl)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const ext = ".jpg";
      const safeName = ad.adName.replace(/[^a-zA-Z0-9\u0590-\u05FF\s_-]/g, "").trim() || "creative";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Silently fail
    } finally {
      setIsDownloading(false);
    }
  }, [ad.mediaUrl, ad.adName, isDownloading]);

  const handleGeneratePdf = useCallback(async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    try {
      const res = await fetch("/api/ads/pdf/single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ad,
          visibleMetrics: presetMetrics ?? selectedMetrics,
          accountName: accountName || "",
          dateRange: dateRange || { since: "", until: "" },
          currency,
        }),
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const safeName =
        ad.adName.replace(/[^a-zA-Z0-9\u0590-\u05FF\s_-]/g, "").trim() || "ad-report";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Silently fail
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [ad, selectedMetrics, presetMetrics, accountName, dateRange, currency, isGeneratingPdf]);

  const proxyMediaUrl = ad.mediaUrl
    ? `/api/ads/facebook/media?url=${encodeURIComponent(ad.mediaUrl)}`
    : null;

  const mediaTypeLabel = MEDIA_TYPE_LABELS[ad.mediaType] ?? ad.mediaType;
  const mediaTypeColor = MEDIA_TYPE_COLORS[ad.mediaType] ?? MEDIA_TYPE_COLORS.UNKNOWN;
  const statusColor = STATUS_COLORS[ad.status] ?? STATUS_COLORS.ARCHIVED;

  const isCopyLong = (ad.adCopy?.length ?? 0) > 120;

  const renderCreative = () => {
    switch (ad.mediaType) {
      case "IMAGE":
        return <ImageCreative imageUrl={ad.mediaUrl} adName={ad.adName} />;
      case "VIDEO":
        return (
          <VideoCreative
            thumbnailUrl={ad.mediaUrl}
            adName={ad.adName}
            videoUrl={ad.destinationUrl}
          />
        );
      case "CAROUSEL": {
        const cards = ad.carouselCards ?? [];
        // Detect "fake carousel" — 2 cards that are just square + story formats
        // of the same ad. Show as single image with phone preview instead.
        if (cards.length === 2 && cards[0]?.imageUrl && cards[1]?.imageUrl) {
          const mainUrl = cards[0].imageUrl;
          const secondUrl = cards[1].imageUrl;
          return (
            <ImageCreative
              imageUrl={mainUrl}
              adName={ad.adName}
              storyImageUrl={secondUrl}
            />
          );
        }
        // Real carousel (3+ cards, or 1 card, or missing images) — keep as-is
        return (
          <CarouselCreative
            cards={cards}
            adName={ad.adName}
          />
        );
      }
      case "DYNAMIC":
        if (ad.mediaUrl) {
          return <ImageCreative imageUrl={ad.mediaUrl} adName={ad.adName} />;
        }
        return <TextOnlyCreative />;
      default:
        return <TextOnlyCreative />;
    }
  };

  return (
    <article className={`ad-card-animate bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col relative ${isSelected ? "border-blue-500 ring-2 ring-blue-500/30" : "border-zinc-200"}`} dir="rtl">

      {/* Variation count badge */}
      {(ad.variationCount ?? 0) > 1 && (
        <div className="absolute top-2 right-2 z-10">
          <Badge className="gap-1 bg-blue-600 text-white hover:bg-blue-700 shadow-sm text-[10px] px-2 py-0.5">
            <Users className="h-3 w-3" />
            ×{ad.variationCount} קהלים
          </Badge>
        </div>
      )}

      {/* Selection checkbox */}
      {onToggleSelect && (
        <div className="absolute top-2 left-2 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            aria-label="בחר מודעה"
            className="h-5 w-5 bg-white shadow-sm"
          />
        </div>
      )}

      {/* Card Header */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-start justify-between gap-3">
          {/* Badges — right side in RTL = visual left */}
          <div className="flex flex-col items-start gap-1.5 shrink-0">
            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${statusColor}`}>
              {ad.status}
            </Badge>
            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${mediaTypeColor}`}>
              {mediaTypeLabel}
            </Badge>
          </div>
          {/* Ad name + campaign + adset — text aligned right */}
          <div className="min-w-0 flex-1 text-right">
            <p className="text-sm font-semibold text-zinc-800 leading-snug line-clamp-2" title={ad.adName}>
              {ad.adName}
            </p>
            <div className="mt-1 space-y-0.5">
              <p className="flex items-center gap-1.5 text-xs text-zinc-500 leading-tight truncate justify-end" title={ad.campaignName}>
                {ad.campaignName}
                <Megaphone className="h-3 w-3 shrink-0 text-zinc-400" aria-hidden="true" />
              </p>
              <p className="flex items-center gap-1.5 text-xs text-zinc-500 leading-tight truncate justify-end" title={ad.adsetName}>
                {ad.adsetName}
                <Users className="h-3 w-3 shrink-0 text-zinc-400" aria-hidden="true" />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Creative Area */}
      <div className="px-4 pb-2">
        {renderCreative()}
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-100" />

      {/* Copy Section */}
      <div className="px-4 py-2 flex-1 space-y-1 text-right">
        {ad.adCopy && (
          <div>
            <p
              className={`text-sm text-zinc-600 leading-relaxed ${
                !copyExpanded && isCopyLong ? "line-clamp-2" : ""
              }`}
              style={
                !copyExpanded && isCopyLong
                  ? { WebkitLineClamp: 2, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" }
                  : {}
              }
            >
              {ad.adCopy}
            </p>
            {isCopyLong && (
              <button
                className="text-xs font-medium mt-0.5 hover:underline cursor-pointer transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 rounded"
                style={{ color: "#1877F2" }}
                onClick={() => setCopyExpanded(!copyExpanded)}
                aria-label={copyExpanded ? "קרא פחות" : "קרא עוד"}
                title={copyExpanded ? "קרא פחות" : "קרא עוד"}
              >
                {copyExpanded ? "קרא פחות" : "קרא עוד"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-100" />

      {/* CTA + Headline Row */}
      <div className="px-4 py-2 flex items-center justify-between gap-3">
        {ad.callToAction && ad.callToAction !== "COMMENT" ? (
          <Badge variant="secondary" className="text-xs shrink-0">
            {formatCallToAction(ad.callToAction)}
          </Badge>
        ) : (
          <span />
        )}
        {ad.headline ? (
          <p className="text-sm text-zinc-800 truncate flex-1 min-w-0 text-right">{ad.headline}</p>
        ) : (
          <span />
        )}
      </div>

      {/* Action Icons Row */}
      <div className="border-t border-zinc-100" />
      <div className="px-2 py-1 flex items-center gap-1 bg-[#F8F9FA] flex-row-reverse">
        <a
          href={facebookAdLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200 cursor-pointer min-h-[44px] px-2 rounded-lg hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          aria-label="צפייה במודעה בפייסבוק (נפתח בטאב חדש)"
          title="צפייה במודעה בפייסבוק"
        >
          <ExternalLink className="h-5 w-5 shrink-0" aria-hidden="true" />
          צפה בפייסבוק
        </a>
        {ad.mediaUrl && (
          <button
            onClick={() => setPreviewOpen(true)}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] text-zinc-500 hover:text-zinc-800 transition-colors duration-200 cursor-pointer rounded-lg hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            aria-label="תצוגה מקדימה בגדלים שונים"
            title="תצוגה מקדימה בגדלים שונים"
          >
            <Smartphone className="h-5 w-5 shrink-0" aria-hidden="true" />
          </button>
        )}
        <button
          onClick={handleGeneratePdf}
          disabled={isGeneratingPdf}
          className="flex items-center justify-center min-w-[44px] min-h-[44px] text-zinc-500 hover:text-zinc-800 transition-colors duration-200 cursor-pointer rounded-lg hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          aria-label="ייצוא מודעה ל-PDF"
          title="ייצוא מודעה ל-PDF"
        >
          {isGeneratingPdf ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <FileDown className="h-5 w-5 shrink-0" aria-hidden="true" />
          )}
        </button>
        {ad.mediaUrl && (
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] text-zinc-500 hover:text-zinc-800 transition-colors duration-200 cursor-pointer rounded-lg hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            aria-label={ad.mediaType === "VIDEO" ? "הורדת תמונה ממוזערת" : "הורדת קריאייטיב"}
            title={ad.mediaType === "VIDEO" ? "הורדת תמונה ממוזערת" : "הורדת קריאייטיב"}
          >
            {isDownloading ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-5 w-5 shrink-0" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {/* Metrics Row — driven by active preset */}
      <div className="border-t border-zinc-100" />
      <div className="px-4 py-2.5 bg-[#F0F7FF]">
        <div className="flex flex-wrap gap-x-5 gap-y-2.5 justify-end">
          {(presetMetrics ?? FALLBACK_METRICS).map((metricKey) => {
            const def = ALL_METRICS.find((m) => m.key === metricKey);
            if (!def) return null;
            const value = ad.metrics[metricKey];
            const formatted =
              value === null || value === undefined
                ? "–"
                : formatMetricValue(value, def.format, currency);
            return (
              <div key={metricKey} className="flex flex-col gap-0.5 items-end">
                <span className="text-[11px] text-zinc-500 font-medium tracking-wide leading-none">
                  {def.label}
                </span>
                <span className="text-sm font-semibold text-zinc-800 tabular-nums" dir="ltr">
                  {formatted}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview Formats Dialog */}
      {proxyMediaUrl && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="sm:max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold text-right">
                {ad.adName} — תצוגה מקדימה
              </DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="feed" className="w-full">
              <TabsList className="mb-4 w-full justify-start">
                <TabsTrigger value="feed" className="text-xs">פיד (1:1)</TabsTrigger>
                <TabsTrigger value="story" className="text-xs">סטורי (9:16)</TabsTrigger>
                <TabsTrigger value="reel" className="text-xs">ריל (9:16)</TabsTrigger>
              </TabsList>

              <TabsContent value="feed" className="flex justify-center">
                <div className="w-[400px] h-[400px] rounded-lg overflow-hidden border border-zinc-200 bg-zinc-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proxyMediaUrl}
                    alt={`${ad.adName} – פיד`}
                    className="w-full h-full object-contain"
                  />
                </div>
              </TabsContent>

              <TabsContent value="story" className="flex justify-center">
                <div className="w-[270px] h-[480px] rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-900 shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proxyMediaUrl}
                    alt={`${ad.adName} – סטורי`}
                    className="w-full h-full object-contain"
                  />
                </div>
              </TabsContent>

              <TabsContent value="reel" className="flex justify-center">
                <div className="w-[270px] h-[480px] rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-900 shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proxyMediaUrl}
                    alt={`${ad.adName} – ריל`}
                    className="w-full h-full object-contain"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </article>
  );
}
