import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, MessageCircle, Tag } from "lucide-react";

import { GameCard } from "@/components/lag/GameCard";
import { Badge, EmptyState, SectionHeading } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { formatDate, whatsappLink } from "@/lib/lag";
import { contactFrom, dealBySlugQuery, dealGamesQuery, gamesQuery, settingsQuery } from "@/lib/queries";

export const Route = createFileRoute("/deals/$slug")({
  head: ({ params }) => {
    const name = params.slug.replace(/-/g, " ");
    const title = `${name} — LAG Deal`;
    const description = `Details, included PlayStation games and dates for the ${name} promotion at LAG LIVE AS GAMERS.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: DealDetailPage,
  errorComponent: () => (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <EmptyState icon={Tag} title="Could not load this deal" body="Please try again in a moment." />
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <EmptyState icon={Tag} title="Deal not found" body="This promotion may have ended." />
    </div>
  ),
});

function daysLeft(end: string | null) {
  if (!end) return null;
  const diff = new Date(end).getTime() - Date.now();
  if (diff < 0) return null;
  return Math.ceil(diff / 86_400_000);
}

function DealDetailPage() {
  const { slug } = Route.useParams();
  const { data: deal, isLoading } = useQuery(dealBySlugQuery(slug));
  const { data: links = [] } = useQuery(dealGamesQuery);
  const { data: games = [] } = useQuery(gamesQuery());
  const { data: settings } = useQuery(settingsQuery);
  const contact = contactFrom(settings);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="glass h-64 animate-pulse rounded-3xl" />
      </div>
    );
  }
  if (!deal || !deal.visible) throw notFound();

  const ids = links.filter((l) => l.deal_id === deal.id).map((l) => l.game_id);
  const dealGames = ids
    .map((id) => games.find((g) => g.id === id))
    .filter((g): g is NonNullable<typeof g> => Boolean(g) && Boolean(g?.visible));
  const left = daysLeft(deal.end_date);
  const external = deal.cta_link?.startsWith("http");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Button asChild variant="nav" size="sm" className="mb-4">
        <Link to="/deals">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All deals
        </Link>
      </Button>

      <article className="glass-strong overflow-hidden rounded-3xl">
        {deal.image_url && (
          <BannerImage src={deal.image_url} alt={`${deal.title} promotional banner`} eager>
            <div aria-hidden className="overlay-fade absolute inset-0" />
          </BannerImage>
        )}
        <div className="p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="red">{deal.badge ?? "DEAL"}</Badge>
            {deal.discount && <Badge tone="blue">{deal.discount}</Badge>}
            {deal.featured && <Badge>Featured</Badge>}
            {left !== null && <Badge tone="blue">{left} days left</Badge>}
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold uppercase sm:text-4xl">{deal.title}</h1>
          {deal.subtitle && <p className="mt-1 font-display font-semibold text-lag-blue">{deal.subtitle}</p>}
          {deal.description && (
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">{deal.description}</p>
          )}
          {(deal.start_date || deal.end_date) && (
            <p className="mt-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
              {deal.start_date ? `From ${formatDate(deal.start_date)}` : null}
              {deal.end_date ? ` · Ends ${formatDate(deal.end_date)}` : null}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="hero">
              <a
                href={whatsappLink(
                  contact.whatsapp,
                  `Hi LAG! I'm interested in the deal: ${deal.title}${deal.discount ? ` (${deal.discount})` : ""}.`,
                )}
                target="_blank"
                rel="noreferrer noopener"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                Enquire on WhatsApp
              </a>
            </Button>
            {deal.cta_link && external && (
              <Button asChild variant="glass">
                <a href={deal.cta_link} target="_blank" rel="noreferrer noopener">
                  {deal.cta_label}
                </a>
              </Button>
            )}
          </div>
        </div>
      </article>

      <div className="mt-10">
        <SectionHeading
          eyebrow="Included"
          title="Games in this deal"
          {...(dealGames.length ? {} : { subtitle: "Games will be added to this promotion soon." })}
        />
        {dealGames.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {dealGames.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
