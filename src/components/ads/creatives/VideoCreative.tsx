"use client";

import { useState } from "react";
import { Play, ImageOff } from "lucide-react";
import { useLazyVisible } from "@/hooks/ads/use-lazy-visible";

interface VideoCreativeProps {
  thumbnailUrl: string;
  adName: string;
  videoUrl?: string;
}

export function VideoCreative({ thumbnailUrl, adName, videoUrl }: VideoCreativeProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const { ref, isVisible } = useLazyVisible();

  const handleVideoClick = () => {
    if (videoUrl) {
      window.open(videoUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div ref={ref} className="relative group">
      {thumbnailUrl && !imgError ? (
        <>
          <div className="w-full aspect-video rounded-md overflow-hidden bg-zinc-100">
            {isVisible ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/ads/facebook/media?url=${encodeURIComponent(thumbnailUrl)}`}
                  alt={adName}
                  loading="lazy"
                  decoding="async"
                  className={`w-full h-full object-contain transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgError(true)}
                />
              </>
            ) : (
              <div className="w-full h-full animate-pulse bg-zinc-200" />
            )}
          </div>
          {/* Play button overlay */}
          {isVisible && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={handleVideoClick}
                aria-label="צפה בסרטון בפייסבוק"
                className="h-14 w-14 rounded-full bg-black/60 flex items-center justify-center transition-transform group-hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white"
              >
                <Play className="h-6 w-6 text-white fill-white ml-0.5" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="w-full aspect-video bg-zinc-100 flex flex-col items-center justify-center gap-2 rounded-md">
          <ImageOff className="h-8 w-8 text-zinc-400" />
          <span className="text-xs text-zinc-400">תמונה ממוזערת לא זמינה</span>
        </div>
      )}

      {videoUrl && (
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 block text-xs text-blue-600 hover:underline text-right"
          aria-label="צפה בסרטון בפייסבוק (נפתח בטאב חדש)"
          dir="rtl"
        >
          צפה בסרטון בפייסבוק ←
        </a>
      )}
    </div>
  );
}
