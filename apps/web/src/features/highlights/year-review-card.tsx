"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { HighlightsCard } from "./highlights-card";
import { HighlightsIcon } from "./highlights-icon";

const SLIDESHOW_IMAGES = ["/images/hands-photo.jpg", "/images/beach-family.jpg"];
const SLIDESHOW_INTERVAL = 5000;

export function YearReviewCard() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % SLIDESHOW_IMAGES.length);
    }, SLIDESHOW_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return (
    <HighlightsCard className="relative h-full">
      {SLIDESHOW_IMAGES.map((src, index) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentImageIndex ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image src={src} alt="" fill className="object-cover" priority={index === 0} />
        </div>
      ))}

      <div className="relative z-10 p-[18px] h-full flex flex-col">
        <div className="flex items-center gap-2">
          <HighlightsIcon className="text-white" />
          <span className="text-white text-[16px] font-semibold">2025 in Review</span>
        </div>
      </div>

      <div className="absolute bottom-[18px] left-[18px] flex gap-2 z-10">
        {SLIDESHOW_IMAGES.map((_, index) => (
          <button
            type="button"
            key={index}
            onClick={() => setCurrentImageIndex(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentImageIndex ? "bg-white" : "bg-white/50"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </HighlightsCard>
  );
}
