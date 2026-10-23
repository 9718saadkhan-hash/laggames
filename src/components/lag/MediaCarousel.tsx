import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { GlassIcon } from "@/components/lag/ui-bits";
import { cn } from "@/lib/utils";

/** Best-effort conversion of common trailer links into embeddable iframe URLs. */
function toEmbeddableUrl(url: string): string {
  const youtube = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}?autoplay=1`;
  return url;
}

type MediaCarouselProps = {
  title: string;
  trailerUrl?: string | null;
  trailerPoster?: string;
  trailerPosterPosition?: string;
  screenshots: string[];
  onScreenshot: (src: string) => void;
};

/**
 * PlayStation-Store style media reel: the trailer (if any) is the first slide,
 * followed by the screenshots. Horizontally swipeable with indicator dashes.
 * The trailer iframe is mounted only while it is playing and its slide is on
 * screen, so browsing never downloads trailer media.
 */
export function MediaCarousel({
  title,
  trailerUrl,
  trailerPoster,
  trailerPosterPosition,
  screenshots,
  onScreenshot,
}: MediaCarouselProps) {
  const hasTrailer = Boolean(trailerUrl);
  const count = (hasTrailer ? 1 : 0) + screenshots.length;
  const [active, setActive] = useState(0);
  const [trailerPlaying, setTrailerPlaying] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);

  const handleScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const el = trackRef.current;
      if (!el || !el.firstElementChild) return;
      const slide = el.firstElementChild as HTMLElement;
      const step = slide.offsetWidth + 12; // gap-3
      setActive(Math.max(0, Math.min(count - 1, Math.round(el.scrollLeft / step))));
    });
  }, [count]);

  // Stop playback when the trailer slide scrolls out of view.
  useEffect(() => {
    if (trailerPlaying && active !== 0) setTrailerPlaying(false);
  }, [active, trailerPlaying]);

  const scrollBySlide = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el || !el.firstElementChild) return;
    const step = (el.firstElementChild as HTMLElement).offsetWidth + 12;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  if (count === 0) return null;

  return (
    <section className="mt-8" aria-label={`${title} trailer and screenshots`}>
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="scroll-px-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-1 sm:scroll-px-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {hasTrailer && (
            <div className="w-[88%] shrink-0 snap-start sm:w-[70%]">
              <div className="relative aspect-16/9 overflow-hidden rounded-2xl border border-border/60 bg-surface-2">
                {trailerPlaying && trailerUrl ? (
                  <iframe
                    src={toEmbeddableUrl(trailerUrl)}
                    title={`${title} trailer`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setTrailerPlaying(true)}
                    aria-label="Play trailer"
                    className="relative h-full w-full"
                  >
                    <img
                      src={trailerPoster ?? ""}
                      alt=""
                      style={{ objectPosition: trailerPosterPosition }}
                      className="h-full w-full object-cover"
                    />
                    <span aria-hidden className="overlay-fade absolute inset-0" />
                    <span className="absolute inset-0 grid place-items-center">
                      <GlassIcon icon={Play} tone="red" size="lg" />
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
          {screenshots.map((src, i) => (
            <div key={src + i} className="w-[88%] shrink-0 snap-start sm:w-[70%]">
              <button
                type="button"
                onClick={() => onScreenshot(src)}
                aria-label={`Enlarge screenshot ${i + 1}`}
                className="aspect-16/9 w-full overflow-hidden rounded-2xl border border-border/60 bg-surface-2"
              >
                <img
                  src={src}
                  alt={`${title} screenshot ${i + 1}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </button>
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous media"
              onClick={() => scrollBySlide(-1)}
              className={cn(
                "absolute top-1/2 left-6 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/80 backdrop-blur transition-opacity hover:bg-background sm:grid",
                active === 0 && "pointer-events-none opacity-0",
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next media"
              onClick={() => scrollBySlide(1)}
              className={cn(
                "absolute top-1/2 right-6 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/80 backdrop-blur transition-opacity hover:bg-background sm:grid",
                active === count - 1 && "pointer-events-none opacity-0",
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5" role="tablist" aria-label="Media position">
          {Array.from({ length: count }, (_, i) => (
            <span
              key={i}
              aria-current={i === active}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                i === active ? "w-6 bg-foreground" : "w-3 bg-muted-foreground/40",
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
