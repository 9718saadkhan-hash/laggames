import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Tag } from "lucide-react";

import { GameCard } from "@/components/lag/GameCard";
import { Badge, EmptyState, SectionHeading } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { formatDate, slugify } from "@/lib/lag";
import { dealGamesQuery, dealsQuery, gamesQuery } from "@/lib/queries";

export const Route = createFileRoute("/deals/")({
  head: () => ({
    meta: [
      { title: "LAG Deals — Game Offers & PlayStation Promotions" },
      {
        name: "description",
        content:
          "Latest deals, offers and special gaming promotions from LAG LIVE AS GAMERS — Black Friday, Days of Play and LAG specials.",
      },
      { property: "og:title", content: "LAG DEALS — Latest gaming offers" },
      {
        property: "og:description",
        content: "Browse current LAG promotions and the PlayStation games included in each deal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DealsPage,
});

function isLive(end: string | null) {
  if (!end) return true;
  return new Date(end).getTime() >= Date.now() - 86_400_000;
}

function DealsPage() {
  const { data: allDeals = [], isLoading } = useQuery(dealsQuery());
  const { data: links = [] } = useQuery(dealGamesQuery);
  const { data: games = [] } = useQuery(gamesQuery());

  const deals = allDeals
    .filter((d) => d.visible && isLive(d.end_date))
    .sort((a, b) => Number(b.featured) - Number(a.featured));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <SectionHeading
        eyebrow="Offers"
        title="LAG DEALS"
        subtitle="Latest deals, offers and special gaming promotions."
      />

      {isLoading ? (
        <div className="grid gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="glass h-64 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No live deals right now"
          body="New promotions drop regularly — browse the catalogue in the meantime."
          action={
            <Button asChild variant="hero">
              <Link to="/games">Browse games</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-10">
          {deals.map((deal, di) => {
            const ids = links.filter((l) => l.deal_id === deal.id).map((l) => l.game_id);
            const dealGames = ids
              .map((id) => games.find((g) => g.id === id))
              .filter((g): g is NonNullable<typeof g> => Boolean(g) && g!.visible);
            const external = deal.cta_link?.startsWith("http");
            const dealSlug = deal.slug ?? slugify(deal.title);

            return (
              <section key={deal.id} id={deal.id} className="min-w-0 scroll-mt-24">
                <div className="glass-strong overflow-hidden rounded-3xl">
                  {deal.image_url && (
                    <Link
                      to="/deals/$slug"
                      params={{ slug: dealSlug }}
                      className="relative block aspect-16/9 w-full sm:aspect-21/9"
                    >
                      <img
                        src={deal.image_url}
                        alt={`${deal.title} promotional banner`}
                        loading={di === 0 ? "eager" : "lazy"}
                        style={{ objectPosition: deal.image_position ?? "50% 50%" }}
                        className="h-full w-full object-cover"
                      />
                      <div aria-hidden className="overlay-fade absolute inset-0" />
                    </Link>
                  )}
                  <div className="p-5 sm:p-7">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="red">{deal.badge ?? "DEAL"}</Badge>
                      {deal.discount && <Badge tone="blue">{deal.discount}</Badge>}
                      {deal.featured && <Badge>Featured</Badge>}
                    </div>
                    <h2 className="mt-3 font-display text-2xl font-bold uppercase sm:text-3xl">
                      <Link to="/deals/$slug" params={{ slug: dealSlug }} className="hover:text-lag-blue">
                        {deal.title}
                      </Link>
                    </h2>
                    {deal.subtitle && (
                      <p className="mt-1 font-display font-semibold text-lag-blue">{deal.subtitle}</p>
                    )}
                    {deal.description && (
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                        {deal.description}
                      </p>
                    )}
                    {(deal.start_date || deal.end_date) && (
                      <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                        <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
                        {deal.start_date ? `From ${formatDate(deal.start_date)}` : null}
                        {deal.end_date ? ` · Ends ${formatDate(deal.end_date)}` : null}
                      </p>
                    )}
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button asChild variant="hero">
                        <Link to="/deals/$slug" params={{ slug: dealSlug }}>
                          View deal
                        </Link>
                      </Button>
                      {deal.cta_link &&
                        (external ? (
                          <Button asChild variant="glass">
                            <a href={deal.cta_link} target="_blank" rel="noreferrer noopener">
                              {deal.cta_label}
                            </a>
                          </Button>
                        ) : null)}
                    </div>
                  </div>
                </div>

                {dealGames.length > 0 && (
                  <>
                    <h3 className="mt-6 mb-3 font-display text-lg font-bold">
                      Games in this deal
                      <span className="ml-2 text-sm font-semibold text-muted-foreground">
                        {dealGames.length}
                      </span>
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {dealGames.map((g) => (
                        <GameCard key={g.id} game={g} />
                      ))}
                    </div>
                  </>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
