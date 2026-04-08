"use client";

import { Badge } from "@/components/cpa/ui/badge";
import { ImageIcon, Video, LayoutGrid, Sparkles } from "lucide-react";
import type { MediaType } from "@/lib/ads/types/ad";

interface MediaPreviewProps {
  mediaType: MediaType;
  mediaUrl: string;
  adName: string;
  carouselCount?: number;
}

const mediaTypeConfig: Record<
  MediaType,
  { label: string; icon: React.ElementType; color: string }
> = {
  IMAGE: { label: "תמונה", icon: ImageIcon, color: "bg-blue-100 text-blue-700" },
  VIDEO: { label: "וידאו", icon: Video, color: "bg-purple-100 text-purple-700" },
  CAROUSEL: { label: "קרוסלה", icon: LayoutGrid, color: "bg-green-100 text-green-700" },
  DYNAMIC: { label: "דינמי", icon: Sparkles, color: "bg-orange-100 text-orange-700" },
  UNKNOWN: { label: "לא ידוע", icon: ImageIcon, color: "bg-gray-100 text-gray-700" },
};

export function MediaPreview({
  mediaType,
  mediaUrl,
  adName,
  carouselCount,
}: MediaPreviewProps) {
  const config = mediaTypeConfig[mediaType];
  const Icon = config.icon;

  return (
    <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-muted">
      {mediaUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/ads/facebook/media?url=${encodeURIComponent(mediaUrl)}`}
          alt={adName}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}

      <Badge
        variant="secondary"
        className={`absolute bottom-0 left-0 right-0 rounded-none text-[9px] px-1 py-0 justify-center ${config.color}`}
      >
        {config.label}
        {carouselCount && carouselCount > 0 && ` (${carouselCount})`}
      </Badge>
    </div>
  );
}
