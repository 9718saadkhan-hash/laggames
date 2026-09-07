import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  BadgeCheck,
  Check,
  Flame,
  Gamepad2,
  Headphones,
  Instagram,
  MessageCircle,
  Monitor,
  Play,
  ShieldCheck,
  Sparkles,
  Tv,
  X,
  Zap,
} from "lucide-react";

import { GameCard } from "@/components/lag/GameCard";
import { DealsHero } from "@/components/lag/DealsHero";
import { Badge, EmptyState, GlassIcon, Reveal, SectionHeading, StarRating } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { buildOrderMessage, instagramUrl, whatsappLink, type CollabVideo, type Game } from "@/lib/lag";
import {
  collabsQuery,
  contactFrom,
  gamesQuery,
  ottQuery,
  psPlusQuery,
  reviewsQuery,
  settingsQuery,
} from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LAG LIVE AS GAMERS — PlayStation Games, PS Plus & OTT Deals" },
      {
        name: "description",
        content:
          "Rent or own PS4 & PS5 games from 30 days to permanent, grab PS Plus and OTT subscriptions, and order instantly on WhatsApp.",
      },
      { property: "og:title", content: "LAG LIVE AS GAMERS — Your Game. Your Way." },
      {
        property: "og:description",
        content:
          "Premium PlayStation game rentals, PS Plus memberships and OTT subscriptions with instant WhatsApp delivery.",
      },
    ],
  }),
  component: HomePage,
});

const WHY = [
  { icon: Zap, title: "Instant delivery", body: "Most orders are delivered within minutes over WhatsApp." },
  { icon: ShieldCheck, title: "100% safe accounts", body: "Genuine accounts, clear instructions, zero risk of bans." },
  { icon: BadgeCheck, title: "Best prices", body: "Rentals from 30 days keep your gaming budget under control." },
  { icon: Headphones, title: "Real human support", body: "Chat with a gamer, not a bot, before and after your order." },
];

function HomePage() {
  const { data: games = [], isLoading } = useQuery(gamesQuery());
  const { data: psPlus = [] } = useQuery(psPlusQuery);
  const { data: ott = [] } = useQuery(ottQuery);
  const { data: reviews = [] } = useQuery(reviewsQuery({ approvedOnly: true }));
  const { data: collabs = [] } = useQuery(collabsQuery);
  const { data: settings } = useQuery(settingsQuery);
  const contact = contactFrom(settings);

  const visible = games.filter((g) => g.visible);
  const trending = visible.filter((g) => g.trending).slice(0, 8);
  const deals = visible.filter((g) => g.hot_deal).slice(0, 8);
  const newReleases = visible.filter((g) => g.new_release).slice(0, 8);

  const about = (settings?.["about"] ?? {}) as { heading?: string; body?: string };
  const categories = (settings?.["categories"] ?? {}) as {
    games_image?: string;
    games_position?: string;
    ps_plus_image?: string;
    ps_plus_position?: string;
    ott_image?: string;
    ott_position?: string;
  };
  const comparison = (settings?.["comparison"] ?? {}) as {
    title?: string;
    rows?: { feature: string; lag: boolean; others: boolean }[];
  };
  const how = (settings?.["how_it_works"] ?? {}) as {
    steps?: { title: string; body: string }[];
  };

  const generalLink = whatsappLink(
    contact.whatsapp,
    buildOrderMessage({ productType: "general", productName: "I need help choosing a game." }, contact.brand),
  );

  return (
    <div className="pb-8">
      <div className="pt-4 sm:pt-6">
        <DealsHero />
      </div>

      {/* Pick a category */}
      <section className="section-perf mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <SectionHeading
          eyebrow="Browse gaming"
          title="Pick a category"
          subtitle="Games, PlayStation Plus and OTT subscriptions — all delivered over WhatsApp."
        />
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              to: "/games" as const,
              icon: Gamepad2,
              title: "GAMES",
              body: `${visible.length} PS4 & PS5 titles`,
              tone: "red" as const,
              image: categories.games_image ?? null,
              position: categories.games_position ?? "50% 50%",
            },
            {
              to: "/ps-plus" as const,
              icon: Sparkles,
              title: "PS PLUS",
              body: "Essential · Extra · Deluxe",
              tone: "blue" as const,
              image: categories.ps_plus_image ?? null,
              position: categories.ps_plus_position ?? "50% 50%",
            },
            {
              to: "/ott" as const,
              icon: Tv,
              title: "OTT",
              body: `${ott.filter((p) => p.visible).length} streaming plans`,
              tone: "red" as const,
              image: categories.ott_image ?? null,
              position: categories.ott_position ?? "50% 50%",
            },
          ].map((c, i) => (
            <Reveal key={c.title} delay={i * 90}>
              <Link
                to={c.to}
                className="glass hover-lift group relative block h-full overflow-hidden rounded-3xl"
              >
                <div className="relative aspect-[4/3] w-full sm:aspect-[3/4] lg:aspect-[4/3]">
                  {c.image ? (
                    <img
                      src={c.image}
                      alt={`${c.title} category`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 will-change-transform group-hover:scale-[1.04]"
                      style={{ objectPosition: c.position }}
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-surface-2">
                      <GlassIcon icon={c.icon} tone={c.tone} size="lg" />
                    </div>
                  )}
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h3 className="font-display text-xl font-bold tracking-wide">{c.title}</h3>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{c.body}</p>
                    <span className="glass-btn-pro mt-4 inline-flex items-center rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest">
                      Explore
                    </span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>


      <GameRow
        eyebrow="Hot right now"
        title="Trending games"
        subtitle="What the LAG community is playing this week."
        games={trending.length ? trending : visible.slice(0, 8)}
        loading={isLoading}
      />

      <CollabRail collabs={collabs.filter((c) => c.visible)} />


      {/* Why choose us */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <SectionHeading eyebrow="Why LAG" title="Why gamers choose us" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((w, i) => (
            <Reveal key={w.title} delay={i * 80}>
              <div className="glass hover-lift h-full rounded-3xl p-5">
                <GlassIcon icon={w.icon} tone={i % 2 ? "blue" : "red"} />
                <h3 className="mt-4 font-display text-base font-bold">{w.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{w.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Comparison */}
      {(comparison.rows?.length ?? 0) > 0 && (
        <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
          <SectionHeading eyebrow="Compare" title={comparison.title ?? "LAG vs other stores"} />
          <div className="glass-strong overflow-hidden rounded-3xl">
            <div className="grid grid-cols-[minmax(0,1fr)_5rem_5rem] items-center gap-2 border-b border-border px-4 py-3 text-[11px] font-bold tracking-widest uppercase sm:grid-cols-[minmax(0,1fr)_7rem_7rem] sm:px-6">
              <span className="text-muted-foreground">Feature</span>
              <span className="text-center text-lag-red">LAG</span>
              <span className="text-center text-muted-foreground">Others</span>
            </div>
            {(comparison.rows ?? []).map((row) => (
              <div
                key={row.feature}
                className="grid grid-cols-[minmax(0,1fr)_5rem_5rem] items-center gap-2 border-b border-border/50 px-4 py-3 text-sm last:border-0 sm:grid-cols-[minmax(0,1fr)_7rem_7rem] sm:px-6"
              >
                <span className="min-w-0">{row.feature}</span>
                <span className="grid place-items-center">
                  {row.lag ? (
                    <Check className="h-5 w-5 text-lag-red" aria-label="Yes" />
                  ) : (
                    <X className="h-5 w-5 text-muted-foreground" aria-label="No" />
                  )}
                </span>
                <span className="grid place-items-center">
                  {row.others ? (
                    <Check className="h-5 w-5 text-muted-foreground" aria-label="Yes" />
                  ) : (
                    <X className="h-5 w-5 text-muted-foreground/60" aria-label="No" />
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <SectionHeading
          eyebrow="How it works"
          title="Three steps to playing"
          action={
            <Button asChild variant="glass" size="sm">
              <Link to="/how-it-works">Full guide</Link>
            </Button>
          }
        />
        <div className="grid gap-4 sm:grid-cols-3">
          {(how.steps ?? [
            { title: "Pick your game", body: "Browse the catalog and choose your duration." },
            { title: "Message on WhatsApp", body: "Tap the order button — details are pre-filled." },
            { title: "Play the same day", body: "Get your account details and start gaming." },
          ]).map((s, i) => (
            <Reveal key={s.title} delay={i * 90}>
              <div className="glass hover-lift h-full rounded-3xl p-6">
                <span className="font-display text-4xl font-bold text-gradient-lag">{i + 1}</span>
                <h3 className="mt-3 font-display text-base font-bold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="whatsapp" size="lg">
            <a href={generalLink} target="_blank" rel="noreferrer noopener">
              <MessageCircle className="h-4 w-4" aria-hidden />
              Order on WhatsApp
            </a>
          </Button>
          <Button asChild variant="glass" size="lg">
            <Link to="/games">Browse catalog</Link>
          </Button>
        </div>
      </section>

      {/* Reviews */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <SectionHeading
          eyebrow="Community"
          title="What gamers say"
          action={
            <Button asChild variant="glass" size="sm">
              <Link to="/reviews">All reviews</Link>
            </Button>
          }
        />
        {reviews.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No reviews yet"
            body="Be the first to share your LAG experience."
            action={
              <Button asChild variant="hero">
                <Link to="/reviews">Write a review</Link>
              </Button>
            }
          />
        ) : (
          <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
            {reviews.slice(0, 6).map((r) => (
              <figure key={r.id} className="glass min-w-[80%] snap-start rounded-3xl p-5 sm:min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <figcaption className="min-w-0 truncate font-display font-bold">{r.name}</figcaption>
                  <StarRating value={r.rating} />
                </div>
                <blockquote className="mt-3 text-sm text-muted-foreground">{r.review}</blockquote>
                {r.featured && (
                  <div className="mt-3">
                    <Badge tone="red">Featured</Badge>
                  </div>
                )}
              </figure>
            ))}
          </div>
        )}
      </section>


      {/* About + CTA */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="glass-strong grid gap-6 rounded-3xl p-6 sm:p-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <p className="mb-2 text-[11px] font-bold tracking-[0.24em] text-lag-red">About LAG</p>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              {about.heading ?? "Live As Gamers"}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {about.body ??
                "LAG is a gamer-run store built to make PlayStation gaming affordable. We deliver games, PS Plus and OTT subscriptions over WhatsApp with real support behind every order."}
            </p>
          </div>
          <div className="flex flex-col justify-center gap-3">
            <Button asChild variant="whatsapp" size="lg">
              <a href={generalLink} target="_blank" rel="noreferrer noopener">
                <MessageCircle className="h-4 w-4" aria-hidden />
                Chat on WhatsApp
              </a>
            </Button>
            <Button asChild variant="glass" size="lg">
              <a href={instagramUrl(contact.instagram)} target="_blank" rel="noreferrer noopener">
                <Instagram className="h-4 w-4" aria-hidden />@{contact.instagram}
              </a>
            </Button>
            <Button asChild variant="blue" size="lg">
              <Link to="/contact">Contact us</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function GameRow({
  eyebrow,
  title,
  subtitle,
  games,
  loading,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  games: Game[];
  loading?: boolean;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle ?? ""}
        action={
          <Button asChild variant="glass" size="sm">
            <Link to="/games">
              <Flame className="h-4 w-4" aria-hidden />
              See all
            </Link>
          </Button>
        }
      />
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass h-72 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <EmptyState icon={Gamepad2} title="No games here yet" body="New titles are added every week." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {games.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      )}
    </section>
  );
}

function CollabRail({ collabs }: { collabs: CollabVideo[] }) {
  const [playing, setPlaying] = useState<string | null>(null);
  if (collabs.length === 0) return null;

  return (
    <section className="section-perf mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <SectionHeading
        eyebrow="Collabs"
        title="Collab videos"
        subtitle="Gameplay and reviews from creators we work with. Swipe to browse."
      />
      <div className="rail no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
        {collabs.map((c) => {
          const isUpload = Boolean(c.storage_path) && Boolean(c.url);
          const active = playing === c.id;
          return (
            <article
              key={c.id}
              className="glass hover-lift w-[78%] shrink-0 snap-start overflow-hidden rounded-3xl sm:w-[46%] lg:w-[31%]"
            >
              <div className="relative aspect-video bg-surface-2">
                {isUpload && active ? (
                  <video
                    src={c.url ?? undefined}
                    poster={c.thumbnail_url ?? undefined}
                    controls
                    autoPlay
                    playsInline
                    preload="none"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <>
                    {c.thumbnail_url ? (
                      <img
                        src={c.thumbnail_url}
                        alt={`${c.title} thumbnail`}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center">
                        <Play className="h-8 w-8 text-muted-foreground" aria-hidden />
                      </div>
                    )}
                    {isUpload ? (
                      <button
                        type="button"
                        onClick={() => setPlaying(c.id)}
                        aria-label={`Play ${c.title}`}
                        className="absolute inset-0 grid place-items-center bg-background/25 transition-opacity hover:bg-background/40"
                      >
                        <GlassIcon icon={Play} tone="red" size="lg" />
                      </button>
                    ) : (
                      <a
                        href={c.url ?? "#"}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={`Watch ${c.title}`}
                        className="absolute inset-0 grid place-items-center bg-background/25 transition-opacity hover:bg-background/40"
                      >
                        <GlassIcon icon={Play} tone="red" size="lg" />
                      </a>
                    )}
                  </>
                )}
              </div>
              <div className="p-4">
                <Badge tone="blue">{c.platform}</Badge>
                <h3 className="mt-2 font-display text-base font-bold">{c.title}</h3>
                {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
