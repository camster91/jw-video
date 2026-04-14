import { useRef, useCallback, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Video } from "../types";
import { VideoCard } from "./VideoCard";

interface VideoCarouselProps {
  title: string;
  videos: Video[];
  onPlay?: (video: Video) => void;
}

export function VideoCarousel({ title, videos, onPlay }: VideoCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  const scroll = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.clientWidth * 0.8;
    el.scrollBy({ left: direction === "left" ? -distance : distance, behavior: "smooth" });
  }, []);

  if (videos.length === 0) return null;

  return (
    <div className="video-carousel">
      <h2 className="carousel-title">{title}</h2>
      <div className="carousel-wrapper">
        {canScrollLeft && (
          <button className="carousel-btn left" onClick={() => scroll("left")} aria-label="Scroll left">
            <ChevronLeft size={28} />
          </button>
        )}
        <div
          ref={scrollRef}
          className="carousel-track"
          onScroll={updateScrollButtons}
        >
          {videos.map((video) => (
            <VideoCard key={video.key} video={video} onPlay={onPlay} />
          ))}
        </div>
        {canScrollRight && (
          <button className="carousel-btn right" onClick={() => scroll("right")} aria-label="Scroll right">
            <ChevronRight size={28} />
          </button>
        )}
      </div>
    </div>
  );
}