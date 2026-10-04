import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { HomeInitialLoader } from "@/components/lag/HomeInitialLoader";
import { Badge, EmptyState, GlassIcon, Reveal, SectionHeading, StarRating } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import logoAsset from "@/assets/lag-logo.jpg.asset.json";
import { buildOrderMessage, formatDate, instagramUrl, whatsappLink, type CollabVideo, type Game } from "@/lib/lag";
import { safePosition } from "@/lib/media";
import {
  collabsQuery,
  contactFrom,
  dealsQuery,
  gameCoversQuery,
  homeGamesQuery,
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const gamesResult = useQuery(homeGamesQuery);
  const dealsResult = useQuery(dealsQuery());
  const settingsResult = useQuery(settingsQuery);
  const { data: reviews = [] } = useQuery(reviewsQuery({ approvedOnly: true }));
  const { data: collabs = [] } = useQuery(collabsQuery);
  const gamesWithoutCovers = gamesResult.data ?? [];
  const homepageDeals = dealsResult.data ?? [];
  const settings = settingsResult.data;
  const contact = contactFrom(settings);

  const visibleWithoutCovers = useMemo(
    () => gamesWithoutCovers.filter((game) => game.visible),
    [gamesWithoutCovers],
  );
  const homepageGamesWithoutCovers = useMemo(() => {
    const selected = visibleWithoutCovers.filter((game) => game.trending).slice(0, 8);
    return selected.length ? selected : visibleWithoutCovers.slice(0, 8);
  }, [visibleWithoutCovers]);
  const homepageGameIds = useMemo(
    () => homepageGamesWithoutCovers.map((game) => game.id),
    [homepageGamesWithoutCovers],
  );
  const coversResult = useQuery(gameCoversQuery(homepageGameIds));
  const visible = useMemo(
    () =>
      homepageGamesWithoutCovers.map((game) => ({
        ...game,
        cover_url: coversResult.data?.[game.id] ?? null,
      })),
    [coversResult.data, homepageGamesWithoutCovers],
  );
  const trending = visible;

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

  const criticalResults = homepageGameIds.length > 0
    ? [gamesResult, dealsResult, settingsResult, coversResult]
    : [gamesResult, dealsResult, settingsResult];
  const criticalDataSettled = criticalResults.filter(
    (result) => result.isSuccess || result.isError,
  ).length;
  const criticalDataReady = criticalDataSettled === criticalResults.length;
  const criticalImages = useMemo(
    () =>
      Array.from(
        new Set(
          [
            logoAsset.url,
            ...homepageDeals
              .filter((deal) => deal.visible && deal.show_in_hero)
              .slice(0, 3)
              .map((deal) => deal.image_url),
            categories.games_image,
            categories.ps_plus_image,
            categories.ott_image,
            ...(trending.length ? trending : visible.slice(0, 8)).slice(0, 4).map((game) => game.cover_url),
          ].filter((url): url is string => Boolean(url)),
        ),
      ),
    [categories.games_image, categories.ott_image, categories.ps_plus_image, homepageDeals, trending, visible],
  );
  const [loadedImages, setLoadedImages] = useState(0);
  const [loaderFinished, setLoaderFinished] = useState(false);
  const [loaderLeaving, setLoaderLeaving] = useState(false);
  const preloadKeyRef = useRef("");

  useEffect(() => {
    if (loaderFinished || !criticalDataReady) return;
    const key = criticalImages.join("|");
    if (preloadKeyRef.current === key) return;
    preloadKeyRef.current = key;
    setLoadedImages(0);

    let cancelled = false;
    const preload = async (src: string) => {
      await new Promise<void>((resolve) => {
        const image = new Image();
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        image.onload = finish;
        image.onerror = finish;
        image.src = src;
        if (image.complete) finish();
      });
      if (!cancelled) setLoadedImages((count) => count + 1);
    };

    void Promise.all(criticalImages.map(preload)).then(() => {
      if (cancelled) return;
      setLoaderLeaving(true);
      window.setTimeout(() => setLoaderFinished(true), 300);
    });
    return () => {
      cancelled = true;
    };
  }, [criticalDataReady, criticalImages, loaderFinished]);

  useEffect(() => {
    if (loaderFinished) return;
    document.documentElement.style.overflow = "hidden";
    const safety = window.setTimeout(() => {
      setLoaderLeaving(true);
      window.setTimeout(() => setLoaderFinished(true), 300);
    }, 8_000);
    return () => {
      window.clearTimeout(safety);
      document.documentElement.style.overflow = "";
    };
  }, [loaderFinished]);

  const dataProgress = (criticalDataSettled / criticalResults.length) * 45;
  const imageProgress = criticalImages.length > 0 ? (loadedImages / criticalImages.length) * 45 : criticalDataReady ? 45 : 0;
  const loaderProgress = loaderLeaving ? 100 : Math.min(95, 5 + dataProgress + imageProgress);
  const loaderPhase = !criticalDataReady ? "Loading game data" : loadedImages < criticalImages.length ? "Preparing featured images" : "Ready to play";

  const generalLink = whatsappLink(
    contact.whatsapp,
    buildOrderMessage({ productType: "general", productName: "I need help choosing a game." }, contact.brand),
  );

  return (
    <>
      {!loaderFinished && <HomeInitialLoader progress={loaderProgress} phase={loaderPhase} leaving={loaderLeaving} />}
      <div
        className={`pb-8 transition-opacity duration-300 ${loaderFinished ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden={!loaderFinished}
      >
      <div className="pt-4 sm:pt-6">
        <DealsHero deals={homepageDeals} />
      </div>

      {/* Pick a category */}
      <section className="section-perf mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <SectionHeading
          eyebrow="Browse gaming"
          title="Pick a category"
          subtitle="Games, PlayStation Plus and OTT subscriptions — all delivered over WhatsApp."
        />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {[
            {
              to: "/games" as const,
              icon: Gamepad2,
              title: "GAMES",
              tone: "red" as const,
              image: categories.games_image ?? null,
              position: categories.games_position ?? "50% 50%",
            },
            {
              to: "/ps-plus" as const,
              icon: Sparkles,
              title: "PS PLUS",
              tone: "blue" as const,
              image: categories.ps_plus_image ?? null,
              position: categories.ps_plus_position ?? "50% 50%",
            },
            {
              to: "/ott" as const,
              icon: Tv,
              title: "OTT",
              tone: "red" as const,
              image: categories.ott_image ?? null,
              position: categories.ott_position ?? "50% 50%",
            },
          ].map((c, i) => (
            <Reveal key={c.title} delay={i * 90}>
              <Link
                to={c.to}
                aria-label={`Browse ${c.title}`}
                className="glass hover-lift group relative block aspect-[1.55/1] overflow-hidden rounded-2xl border-border/80 shadow-[inset_0_1px_0_var(--glass-highlight)]"
              >
                <span
                  aria-hidden
                  className={`absolute inset-0 opacity-70 transition-opacity duration-300 group-hover:opacity-100 ${
                    c.tone === "red"
                      ? "bg-gradient-to-br from-lag-red/45 via-surface to-background"
                      : "bg-gradient-to-br from-lag-blue/50 via-surface to-background"
                  }`}
                />
                {c.image ? (
                  <div className="absolute inset-0 overflow-hidden">
                    <img
                      src={c.image}
                      alt=""
                      loading={i < 2 ? "eager" : "lazy"}
                      fetchPriority={i < 2 ? "high" : "low"}
                      decoding="async"
                      width={620}
                      height={400}
                      className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
                      style={{ objectPosition: c.position }}
                    />
                    <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/15 to-transparent" />
                  </div>
                ) : (
                  <div className="absolute inset-0 grid place-items-center opacity-50">
                    <GlassIcon icon={c.icon} tone={c.tone} size="lg" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 z-10 p-3 sm:p-5">
                  <span className="glass inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-foreground sm:text-[10px]">
                    Explore
                  </span>
                  <h3 className="mt-2 font-display text-base font-bold tracking-wide sm:text-xl">{c.title}</h3>
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
        loading={!gamesResult.isSuccess && !gamesResult.isError}
      />

      <CollabRail collabs={collabs.filter((c) => c.visible)} />


      {/* Why choose us */}
      <section className="section-perf mx-auto max-w-7xl px-4 py-14 sm:px-6">
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
        <section className="section-perf mx-auto max-w-4xl px-4 py-14 sm:px-6">
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
      <section className="section-perf mx-auto max-w-7xl px-4 py-14 sm:px-6">
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
      <section className="section-perf mx-auto max-w-7xl px-4 py-14 sm:px-6">
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
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                {r.image_url && (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-border aspect-video">
                    <img
                      src={r.image_url}
                      alt={`Photo shared by ${r.name}`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                      style={{ objectPosition: safePosition(r.image_position) }}
                    />
                  </div>
                )}
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
      <section className="section-perf mx-auto max-w-7xl px-4 py-14 sm:px-6">
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
    </>
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
    <section className="section-perf mx-auto max-w-7xl px-4 py-8 sm:px-6">
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
          {games.map((g, index) => (
            <GameCard key={g.id} game={g} priority={index < 4} />
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
