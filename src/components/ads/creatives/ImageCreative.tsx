"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { useLazyVisible } from "@/hooks/ads/use-lazy-visible";

interface ImageCreativeProps {
  imageUrl: string;
  adName: string;
  /** Optional story (9:16) image URL — shown as phone preview overlay */
  storyImageUrl?: string;
}

export function ImageCreative({ imageUrl, adName, storyImageUrl }: ImageCreativeProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [storyError, setStoryError] = useState(false);
  const { ref, isVisible } = useLazyVisible();

  if (!imageUrl || imgError) {
    return (
      <div className="w-full aspect-square bg-zinc-100 flex flex-col items-center justify-center gap-2 rounded-md">
        <ImageOff className="h-8 w-8 text-zinc-400" />
        <span className="text-xs text-zinc-400">תמונה לא זמינה</span>
      </div>
    );
  }

  const proxyUrl = `/api/ads/facebook/media?url=${encodeURIComponent(imageUrl)}`;

  // Only show phone preview if we have a different story URL
  const storyProxyUrl =
    storyImageUrl && storyImageUrl !== imageUrl
      ? `/api/ads/facebook/media?url=${encodeURIComponent(storyImageUrl)}`
      : null;

  return (
    <div ref={ref} className="w-full rounded-md overflow-hidden bg-zinc-100 relative" style={{ aspectRatio: "1/1" }}>
      {isVisible ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={proxyUrl}
            alt={adName}
            loading="lazy"
            decoding="async"
            className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />

          {/* Phone-shaped story preview overlay */}
          {storyProxyUrl && !storyError && (
            <div
              className="absolute z-10 overflow-hidden bg-white"
              style={{
                bottom: 8,
                left: 8,
                width: 48,
                height: 85,
                borderRadius: 8,
                border: "2px solid white",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}
            >
              {/* Notch */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 z-10 bg-white rounded-b-sm"
                style={{ width: 16, height: 3 }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={storyProxyUrl}
                alt={`${adName} – סטורי`}
                className="w-full h-full object-cover"
                onError={() => setStoryError(true)}
              />
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full animate-pulse bg-zinc-200" />
      )}
    </div>
  );
}
