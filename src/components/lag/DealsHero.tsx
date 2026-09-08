import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";

import { Reveal } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { formatDate, slugify } from "@/lib/lag";
import { dealsQuery } from "@/lib/queries";

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
  const count = slides.length;

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

  return (
    <section aria-label="Deals" className="mx-auto w-full max-w-7xl px-3 sm:px-5">
      <div className="glass-strong overflow-hidden rounded-3xl border border-border p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {slides.map((deal, i) => {
            const external = deal.cta_link?.startsWith("http");
            const dealSlug = deal.slug ?? slugify(deal.title);

            const card = (
              <>
                {deal.image_url ? (
                  <>
                    <img
                      src={deal.image_url}
                      alt={`${deal.title} promotional banner`}
                      loading={i === 0 ? "eager" : "lazy"}
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      style={{ objectPosition: deal.image_position ?? "50% 50%" }}
                    />
                    <span
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent"
                    />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-lag-red/20 via-surface-2 to-background" />
                )}

                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                  <h3 className="font-display text-lg font-bold uppercase leading-tight sm:text-xl">
                    {deal.title}
                  </h3>
                  {deal.subtitle && (
                    <p className="mt-1 text-sm font-semibold text-lag-blue">{deal.subtitle}</p>
                  )}
                  {deal.end_date && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      Ends {formatDate(deal.end_date)}
                    </p>
                  )}
                </div>
              </>
            );

            const classes =
              "group relative block aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border/60 bg-surface-2";

            return (
              <Reveal key={deal.id} delay={i * 80}>
                {external ? (
                  <a
                    href={deal.cta_link!}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`View ${deal.title} deal`}
                    className={classes}
                  >
                    {card}
                  </a>
                ) : (
                  <Link to="/deals/$slug" params={{ slug: dealSlug }} aria-label={`View ${deal.title} deal`} className={classes}>
                    {card}
                  </Link>
                )}
              </Reveal>
            );
          })}
        </div>

      </div>
    </section>
  );
}
