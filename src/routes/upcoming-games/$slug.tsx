import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, CalendarClock, MessageCircle } from "lucide-react";
import { useState } from "react";

import { Badge, EmptyState, SectionHeading } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatDate, whatsappLink } from "@/lib/lag";
import { contactFrom, settingsQuery, upcomingGameQuery, upcomingGamesQuery } from "@/lib/queries";

export const Route = createFileRoute("/upcoming-games/$slug")({
  head: ({ params }) => {
    const name = params.slug.replace(/-/g, " ");
    const title = `${name} — Upcoming on PlayStation | LAG`;
    const description = `Release date, trailer and details for the upcoming PlayStation title ${name} at LAG LIVE AS GAMERS.`;
    const url = `https://thelaggames.com/upcoming-games/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: UpcomingDetailPage,
  errorComponent: () => (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <EmptyState icon={CalendarClock} title="Could not load this title" body="Please try again in a moment." />
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <EmptyState icon={CalendarClock} title="Title not found" body="It may have already released." />
    </div>
  ),
});

function countdown(date: string | null) {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  if (diff <= 0) return null;
  return Math.ceil(diff / 86_400_000);
}

function embedUrl(url: string | null) {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|v=)([\w-]{6,})/);
  return yt ? `https://www.youtube.com/embed/${yt[1]}` : null;
}

function UpcomingDetailPage() {
  const { slug } = Route.useParams();
  const { data: game, isLoading } = useQuery(upcomingGameQuery(slug));
  const { data: all = [] } = useQuery(upcomingGamesQuery());
  const { data: settings } = useQuery(settingsQuery);
  const contact = contactFrom(settings);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [playTrailer, setPlayTrailer] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="glass h-64 animate-pulse rounded-3xl" />
      </div>
    );
  }
  if (!game || !game.visible) throw notFound();

  const days = countdown(game.release_date);
  const trailer = embedUrl(game.trailer_url);
  const related = all.filter((g) => g.visible && g.id !== game.id).slice(0, 4);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Button asChild variant="nav" size="sm" className="mb-4">
        <Link to="/upcoming-games">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All upcoming
        </Link>
      </Button>

      <article className="glass-strong overflow-hidden rounded-3xl">
        {(game.banner_url ?? game.cover_url) && (
          <div className="relative aspect-16/9 max-h-[52vh] w-full sm:aspect-21/9">
            <img
              src={game.banner_url ?? game.cover_url ?? ""}
              alt={`${game.title} artwork`}
              style={{ objectPosition: game.banner_position ?? game.cover_position ?? "50% 50%" }}
              className="h-full w-full object-cover"
            />
            <div aria-hidden className="overlay-fade absolute inset-0" />
          </div>
        )}
        <div className="p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="blue">{game.platform}</Badge>
            {game.genre && <Badge>{game.genre}</Badge>}
            {days !== null && <Badge tone="red">{days} days to go</Badge>}
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold uppercase sm:text-4xl">{game.title}</h1>
          {game.short_description && (
            <p className="mt-2 font-display font-semibold text-lag-blue">{game.short_description}</p>
          )}

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div className="glass rounded-2xl p-3">
              <dt className="text-xs uppercase tracking-widest text-muted-foreground">Release</dt>
              <dd className="mt-0.5 font-semibold">
                {game.release_date ? formatDate(game.release_date) : (game.release_note ?? "To be announced")}
              </dd>
            </div>
            <div className="glass rounded-2xl p-3">
              <dt className="text-xs uppercase tracking-widest text-muted-foreground">Developer</dt>
              <dd className="mt-0.5 font-semibold">{game.developer ?? "—"}</dd>
            </div>
            <div className="glass rounded-2xl p-3">
              <dt className="text-xs uppercase tracking-widest text-muted-foreground">Publisher</dt>
              <dd className="mt-0.5 font-semibold">{game.publisher ?? "—"}</dd>
            </div>
            <div className="glass rounded-2xl p-3">
              <dt className="text-xs uppercase tracking-widest text-muted-foreground">Platform</dt>
              <dd className="mt-0.5 font-semibold">{game.platform}</dd>
            </div>
          </dl>

          {game.description && (
            <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">{game.description}</p>
          )}

          <div className="mt-6">
            <Button asChild variant="hero">
              <a
                href={whatsappLink(
                  contact.whatsapp,
                  `Hi LAG! Please notify me when ${game.title} (${game.platform}) is available.`,
                )}
                target="_blank"
                rel="noreferrer noopener"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                Notify me on WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </article>

      {game.gallery.length > 0 && (
        <div className="mt-10">
          <SectionHeading eyebrow="Gallery" title="Screenshots" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {game.gallery.map((src, i) => (
              <button
                key={src + i}
                type="button"
                onClick={() => setLightbox(src)}
                className="glass overflow-hidden rounded-2xl transition-transform hover:scale-[1.02]"
              >
                <img
                  src={src}
                  alt={`${game.title} screenshot ${i + 1}`}
                  loading="lazy"
                  className="aspect-16/9 w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {trailer && (
        <div className="mt-10">
          <SectionHeading eyebrow="Video" title="Trailer" />
          <div className="glass overflow-hidden rounded-3xl">
            {playTrailer ? (
              <iframe
                src={`${trailer}?autoplay=1`}
                title={`${game.title} trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
                className="aspect-video w-full"
              />
            ) : (
              <button
                type="button"
                onClick={() => setPlayTrailer(true)}
                className="grid aspect-video w-full place-items-center text-sm font-semibold"
              >
                Play trailer
              </button>
            )}
          </div>
        </div>
      )}

      {related.length > 0 && (
        <div className="mt-10">
          <SectionHeading eyebrow="More" title="Other upcoming titles" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {related.map((g) => (
              <Link
                key={g.id}
                to="/upcoming-games/$slug"
                params={{ slug: g.slug }}
                className="glass hover-lift overflow-hidden rounded-2xl"
              >
                {g.cover_url && (
                  <img
                    src={g.cover_url}
                    alt={g.title}
                    loading="lazy"
                    style={{ objectPosition: g.cover_position ?? "50% 50%" }}
                    className="aspect-2/3 w-full object-cover"
                  />
                )}
                <p className="truncate p-3 text-sm font-semibold">{g.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Dialog open={Boolean(lightbox)} onOpenChange={(v) => !v && setLightbox(null)}>
        <DialogContent className="max-w-4xl p-2">
          {lightbox && (
            <img src={lightbox} alt={`${game.title} screenshot`} className="w-full rounded-xl object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
