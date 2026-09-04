import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarDays, ChevronLeft, ChevronRight, Tag } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { formatDate, slugify } from "@/lib/lag";
import { dealsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

function isLive(end: string | null) {
  if (!end) return true;
  return new Date(end).getTime() >= Date.now() - 86_400_000;
}

/**
 * Homepage top section: promotional DEALS banners (Black Friday, Days of Play,
 * LAG specials…), fully controlled from Admin → Deals.
 */
export function DealsHero() {
  const { data: all = [] } = useQuery(dealsQuery());
  const slides = all.filter((d) => d.visible && d.show_in_hero && isLive(d.end_date));
  const [index, setIndex] = useState(0);
  const count = slides.length;

  const go = useCallback(
    (next: number) => setIndex((i) => (count ? (next + count) % count : 0)),
    [count],
  );

  useEffect(() => {
    if (count < 2) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % count), 6500);
    return () => window.clearInterval(t);
  }, [count]);

  if (!count) {
    return (
      <section
        aria-label="Deals"
        className="glass mx-auto flex max-w-7xl flex-col items-center rounded-3xl px-5 py-16 text-center sm:px-6"
      >
        <p className="text-[11px] font-bold tracking-[0.28em] text-lag-red">DEALS</p>
        <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">LAG Special Deals</h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          New promotions are loading in. Browse the catalogue in the meantime.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild variant="hero" size="lg">
            <Link to="/deals">View deals</Link>
          </Button>
          <Button asChild variant="glass" size="lg">
            <Link to="/games">Browse games</Link>
          </Button>
        </div>
      </section>
    );
  }

  const slide = slides[Math.min(index, count - 1)]!;
  const external = slide.cta_link?.startsWith("http");
  const dealSlug = slide.slug ?? slugify(slide.title);

  return (
    <section aria-label="Deals" className="mx-auto w-full max-w-7xl px-3 sm:px-5">
      <div className="relative overflow-hidden rounded-3xl border border-border">
        <div className="relative aspect-4/5 w-full sm:aspect-16/9 lg:aspect-21/9">
          <Link
            to="/deals/$slug"
            params={{ slug: dealSlug }}
            aria-label={`View ${slide.title} deal`}
            className="absolute inset-0 block"
          >
            {slides.map((s, i) => (
              <img
                key={s.id}
                src={s.image_url ?? ""}
                alt={`${s.title} promotional banner`}
                width={1536}
                height={864}
                loading={i === 0 ? "eager" : "lazy"}
                style={{ objectPosition: s.image_position ?? "50% 50%" }}
                className={cn(
                  "absolute inset-0 h-full w-full object-cover transition-all duration-1000",
                  i === index ? "scale-100 opacity-100" : "scale-105 opacity-0",
                )}
              />
            ))}
          </Link>
          <div aria-hidden className="overlay-fade absolute inset-0" />

          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-12">
            <div className="max-w-xl min-w-0">
              <div className="flex flex-wrap gap-2">
                <Badge tone="red">{slide.badge ?? "DEALS"}</Badge>
                {slide.discount && <Badge tone="blue">{slide.discount}</Badge>}
                {slide.featured && <Badge>Featured</Badge>}
              </div>
              <h1 className="mt-3 font-display text-3xl font-bold uppercase sm:text-5xl lg:text-6xl">
                {slide.title}
              </h1>
              {slide.subtitle && (
                <p className="mt-2 font-display text-base font-semibold text-lag-blue sm:text-lg">
                  {slide.subtitle}
                </p>
              )}
              {slide.description && (
                <p className="mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
                  {slide.description}
                </p>
              )}
              {slide.end_date && (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
                  Ends {formatDate(slide.end_date)}
                </p>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                {external ? (
                  <Button asChild variant="hero" size="lg">
                    <a href={slide.cta_link!} target="_blank" rel="noreferrer noopener">
                      <Tag className="h-4 w-4" aria-hidden />
                      {slide.cta_label}
                    </a>
                  </Button>
                ) : (
                  <Button asChild variant="hero" size="lg">
                    <Link to="/deals/$slug" params={{ slug: dealSlug }}>
                      <Tag className="h-4 w-4" aria-hidden />
                      {slide.cta_label}
                    </Link>
                  </Button>
                )}
                <Button asChild variant="glass" size="lg">
                  <Link to="/games">Browse games</Link>
                </Button>
              </div>
            </div>
          </div>

          {count > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous deal"
                onClick={() => go(index - 1)}
                className="glass absolute top-1/2 left-3 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full sm:grid"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Next deal"
                onClick={() => go(index + 1)}
                className="glass absolute top-1/2 right-3 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full sm:grid"
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
              <div className="absolute top-4 right-4 flex gap-1.5">
                {slides.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={`Go to deal ${i + 1}`}
                    aria-current={i === index}
                    onClick={() => setIndex(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === index ? "w-7 bg-lag-red" : "w-3 bg-foreground/40",
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
