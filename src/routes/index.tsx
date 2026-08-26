import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import { HeroSlider } from "@/components/lag/HeroSlider";
import { Badge, EmptyState, GlassIcon, Reveal, SectionHeading, StarRating } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { buildOrderMessage, instagramUrl, money, whatsappLink, type Game } from "@/lib/lag";
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
  const comparison = (settings?.["comparison"] ?? {}) as {
    title?: string;
    rows?: { feature: string; lag: boolean; others: boolean }[];
  };
  const how = (settings?.["how_it_works"] ?? {}) as {
    steps?: { title: string; body: string }[];
    primary_text?: string;
  };

  const generalLink = whatsappLink(
    contact.whatsapp,
    buildOrderMessage({ productType: "general", productName: "I need help choosing a game." }, contact.brand),
  );

  return (
    <div className="pb-8">
      <div className="pt-4 sm:pt-6">
        <HeroSlider />
      </div>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <SectionHeading
          eyebrow="Browse gaming"
          title="Pick your category"
          subtitle="Games, PlayStation Plus and OTT subscriptions — all delivered over WhatsApp."
        />
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { to: "/games" as const, icon: Gamepad2, title: "PS4 & PS5 Games", body: `${visible.length} titles available`, tone: "red" as const },
            { to: "/ps-plus" as const, icon: Sparkles, title: "PS Plus", body: `${psPlus.filter((p) => p.visible).length} membership plans`, tone: "blue" as const },
            { to: "/ott" as const, icon: Tv, title: "OTT Subscriptions", body: `${ott.filter((p) => p.visible).length} streaming plans`, tone: "red" as const },
          ].map((c, i) => (
            <Reveal key={c.title} delay={i * 90}>
              <Link
                to={c.to}
                className="glass hover-lift group flex h-full items-center gap-4 rounded-3xl p-5"
              >
                <GlassIcon icon={c.icon} tone={c.tone} size="lg" />
                <div className="min-w-0">
                  <h3 className="truncate font-display text-lg font-bold">{c.title}</h3>
                  <p className="truncate text-sm text-muted-foreground">{c.body}</p>
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

      {deals.length > 0 && (
        <GameRow eyebrow="Limited time" title="Latest deals" subtitle="Discounted rentals and permanent copies." games={deals} />
      )}

      {newReleases.length > 0 && (
        <GameRow eyebrow="Fresh drops" title="New releases" subtitle="The newest titles added to the LAG library." games={newReleases} />
      )}

      {/* Subscriptions strip */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <SectionHeading
          eyebrow="Subscriptions"
          title="PS Plus & OTT plans"
          subtitle="Multiplayer, monthly games and every streaming app you actually use."
          action={
            <Button asChild variant="glass" size="sm">
              <Link to="/ps-plus">All plans</Link>
            </Button>
          }
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="glass rounded-3xl p-5">
            <div className="flex items-center gap-3">
              <GlassIcon icon={Sparkles} tone="blue" />
              <h3 className="font-display text-lg font-bold">PlayStation Plus</h3>
            </div>
            <ul className="mt-4 space-y-2">
              {psPlus.filter((p) => p.visible).slice(0, 4).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 text-sm last:border-0">
                  <span className="min-w-0 truncate">
                    {p.name} <span className="text-muted-foreground">· {p.duration}</span>
                  </span>
                  <span className="shrink-0 font-display font-bold">{money(p.price)}</span>
                </li>
              ))}
            </ul>
            <Button asChild variant="blue" className="mt-5 w-full">
              <Link to="/ps-plus">View PS Plus plans</Link>
            </Button>
          </div>
          <div className="glass rounded-3xl p-5">
            <div className="flex items-center gap-3">
              <GlassIcon icon={Monitor} tone="red" />
              <h3 className="font-display text-lg font-bold">OTT Subscriptions</h3>
            </div>
            <ul className="mt-4 space-y-2">
              {ott.filter((p) => p.visible).slice(0, 4).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 text-sm last:border-0">
                  <span className="min-w-0 truncate">
                    {p.name} <span className="text-muted-foreground">· {p.duration}</span>
                  </span>
                  <span className="shrink-0 font-display font-bold">{money(p.price)}</span>
                </li>
              ))}
            </ul>
            <Button asChild variant="hero" className="mt-5 w-full">
              <Link to="/ott">View OTT plans</Link>
            </Button>
          </div>
        </div>
      </section>

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
              {how.primary_text ?? "Order on WhatsApp"}
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

      {/* Collabs */}
      {collabs.filter((c) => c.visible).length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <SectionHeading eyebrow="Collabs" title="Creator collaborations" subtitle="Reviews and gameplay from our partners." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collabs
              .filter((c) => c.visible)
              .map((c) => (
                <a
                  key={c.id}
                  href={c.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="glass hover-lift group overflow-hidden rounded-3xl"
                >
                  <div className="relative aspect-video">
                    {c.thumbnail_url ? (
                      <img
                        src={c.thumbnail_url}
                        alt={`${c.title} thumbnail`}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-muted">
                        <Play className="h-8 w-8 text-muted-foreground" aria-hidden />
                      </div>
                    )}
                    <span className="absolute inset-0 grid place-items-center bg-background/30 opacity-0 transition-opacity group-hover:opacity-100">
                      <GlassIcon icon={Play} tone="red" size="lg" />
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2">
                      <Badge tone="blue">{c.platform}</Badge>
                    </div>
                    <h3 className="mt-2 font-display text-base font-bold">{c.title}</h3>
                    {c.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                    )}
                  </div>
                </a>
              ))}
          </div>
        </section>
      )}

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
