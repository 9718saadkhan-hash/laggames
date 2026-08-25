import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarDays, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { buildOrderMessage, money, formatDate, whatsappLink } from "@/lib/lag";
import { contactFrom, heroQuery, settingsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function HeroSlider() {
  const { data: slides = [] } = useQuery(heroQuery);
  const { data: settings } = useQuery(settingsQuery);
  const contact = contactFrom(settings);
  const [index, setIndex] = useState(0);
  const count = slides.length;

  const go = useCallback((next: number) => setIndex((i) => (count ? (next + count) % count : 0)), [count]);

  useEffect(() => {
    if (count < 2) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % count), 6500);
    return () => window.clearInterval(t);
  }, [count]);

  if (!count) {
    return (
      <section className="glass mx-auto flex max-w-7xl flex-col items-center rounded-3xl px-6 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Your Game. Your Way.</h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          Hot deals are being loaded in. Browse the full catalog in the meantime.
        </p>
        <Button asChild variant="hero" size="lg" className="mt-6">
          <Link to="/games">Browse all games</Link>
        </Button>
      </section>
    );
  }

  const slide = slides[index]!;
  const message = buildOrderMessage(
    {
      productType: "game",
      productName: slide.title,
      platform: slide.platform,
      price: slide.price_from,
    },
    contact.brand,
  );

  return (
    <section aria-label="Hot deals" className="mx-auto max-w-7xl px-3 sm:px-5">
      <div className="relative overflow-hidden rounded-3xl border border-border">
        <div className="relative aspect-4/5 w-full sm:aspect-16/9 lg:aspect-21/9">
          {slides.map((s, i) => (
            <img
              key={s.id}
              src={s.image_url ?? ""}
              alt={`${s.title} artwork`}
              width={1536}
              height={864}
              loading={i === 0 ? "eager" : "lazy"}
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-all duration-1000",
                i === index ? "scale-100 opacity-100" : "scale-105 opacity-0",
              )}
            />
          ))}
          <div aria-hidden className="overlay-fade absolute inset-0" />

          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-12">
            <div className="max-w-xl">
              <div className="flex flex-wrap gap-2">
                {slide.subtitle && <Badge tone="red">{slide.subtitle}</Badge>}
                {slide.platform && <Badge tone="blue">{slide.platform}</Badge>}
                {slide.availability && <Badge>{slide.availability}</Badge>}
              </div>
              <h1 className="mt-3 font-display text-3xl font-bold sm:text-5xl lg:text-6xl">
                {slide.title}
              </h1>
              {slide.description && (
                <p className="mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
                  {slide.description}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <CalendarDays className="h-4 w-4" aria-hidden />
                  {formatDate(slide.release_date)}
                </span>
                {slide.price_from !== null && (
                  <span className="font-display text-lg font-bold">
                    From {money(slide.price_from)}
                  </span>
                )}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild variant="whatsapp" size="lg">
                  <a
                    href={whatsappLink(contact.whatsapp, message)}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    {slide.cta_label}
                  </a>
                </Button>
                {slide.game_slug && (
                  <Button asChild variant="glass" size="lg">
                    <Link to="/games/$slug" params={{ slug: slide.game_slug }}>
                      View details
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {count > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous slide"
                onClick={() => go(index - 1)}
                className="glass absolute top-1/2 left-3 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full sm:grid"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Next slide"
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
                    aria-label={`Go to slide ${i + 1}`}
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
