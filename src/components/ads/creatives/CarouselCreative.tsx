"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { useLazyVisible } from "@/hooks/ads/use-lazy-visible";
import type { CarouselCard } from "@/lib/ads/types/ad";

interface CarouselCreativeProps {
  cards: CarouselCard[];
  adName: string;
}

function CarouselCardImage({
  imageUrl,
  headline,
  className = "h-36",
  objectFit = "object-cover",
}: {
  imageUrl?: string;
  headline?: string;
  className?: string;
  /** object-contain for hero (no cropping), object-cover for thumbnails */
  objectFit?: "object-cover" | "object-contain";
}) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const { ref, isVisible } = useLazyVisible();

  if (!imageUrl || imgError) {
    return (
      <div className={`w-full ${className} bg-zinc-100 flex flex-col items-center justify-center gap-1 rounded-lg`}>
        <ImageOff className="h-5 w-5 text-zinc-400" />
        <span className="text-[10px] text-zinc-400">No image</span>
      </div>
    );
  }

  return (
    <div ref={ref} className={`w-full ${className} rounded-lg overflow-hidden bg-zinc-100`}>
      {isVisible ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/ads/facebook/media?url=${encodeURIComponent(imageUrl)}`}
          alt={headline || "Carousel card"}
          loading="lazy"
          decoding="async"
          className={`w-full h-full ${objectFit} transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full animate-pulse bg-zinc-200 rounded-lg" />
      )}
    </div>
  );
}

export function CarouselCreative({ cards, adName }: CarouselCreativeProps) {
  const [heroIndex, setHeroIndex] = useState(0);

  // If only one card, treat like a single image
  if (cards.length <= 1) {
    const card = cards[0];
    return (
      <div className="space-y-1">
        <CarouselCardImage imageUrl={card?.imageUrl} headline={card?.headline || adName} className="aspect-square" objectFit="object-contain" />
        {card?.headline && (
          <p className="text-xs font-medium text-zinc-700 truncate">{card.headline}</p>
        )}
      </div>
    );
  }

  const heroCard = cards[heroIndex];

  return (
    <div className="space-y-2" aria-label={`Carousel with ${cards.length} cards`}>
      {/* Hero image */}
      <div className="relative">
        <CarouselCardImage
          imageUrl={heroCard?.imageUrl}
          headline={heroCard?.headline || adName}
          className="aspect-square"
          objectFit="object-contain"
        />
        <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded tabular-nums">
          {heroIndex + 1}/{cards.length}
        </span>
      </div>

      {/* Thumbnail strip */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {cards.map((card, index) =>
          index !== heroIndex ? (
            <button
              key={index}
              onClick={() => setHeroIndex(index)}
              className="shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 border-transparent hover:border-blue-400 transition-colors duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              title={card.headline || `כרטיס ${index + 1}`}
              aria-label={card.headline || `כרטיס ${index + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/ads/facebook/media?url=${encodeURIComponent(card.imageUrl || "")}`}
                alt={card.headline || `Card ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </button>
          ) : null
        )}
      </div>

      {/* Hero card headline */}
      {heroCard?.headline && (
        <p className="text-xs font-medium text-zinc-700 truncate">{heroCard.headline}</p>
      )}
    </div>
  );
}
