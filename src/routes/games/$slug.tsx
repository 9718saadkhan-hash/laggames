import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Gamepad2,
  HardDrive,
  Heart,
  MessageCircle,
  Play,
  ShieldCheck,
  ShoppingCart,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { GameCard } from "@/components/lag/GameCard";
import { Badge, EmptyState, GlassIcon, SectionHeading, StarRating } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import {
  buildOrderMessage,
  discountPercent,
  DURATION_LABEL,
  formatDate,
  money,
  whatsappLink,
  type AccountKey,
  type DurationKey,
  type Game,
  type GameEdition,
} from "@/lib/lag";
import { safePosition } from "@/lib/media";
import { contactFrom, gameEditionsQuery, gameQuery, gamesQuery, settingsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { BannerImage } from "@/components/lag/BannerImage";

export const Route = createFileRoute("/games/$slug")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(gameQuery(params.slug)),
  head: ({ params, loaderData: game }) => {
    const gameName = game?.title ?? params.slug.replace(/-/g, " ");
    const title = `${gameName} for PS4 & PS5 — LAG LIVE AS GAMERS`;
    const description =
      game?.short_description?.trim() ||
      `View ${gameName} pricing, availability and rental options for PlayStation at LAG LIVE AS GAMERS.`;
    const url = `https://thelaggames.com/games/${params.slug}`;
    const shareImage = [game?.banner_url, game?.cover_url].find((image) => image?.startsWith("https://"));
    const prices = game
      ? [game.price_30, game.price_60, game.price_permanent].filter(
          (value): value is number => typeof value === "number" && value > 0,
        )
      : [];
    const product = game
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: game.title,
          description,
          ...(shareImage ? { image: [shareImage] } : {}),
          brand: { "@type": "Brand", name: "LAG LIVE AS GAMERS" },
          category: game.genre ?? "PlayStation game",
          offers: {
            "@type": "Offer",
            url,
            priceCurrency: "INR",
            ...(prices.length ? { price: Math.min(...prices) } : {}),
            availability:
              game.availability.toLowerCase().includes("unavailable")
                ? "https://schema.org/OutOfStock"
                : "https://schema.org/InStock",
          },
        }
      : null;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        ...(shareImage
          ? [
              { property: "og:image", content: shareImage },
              { name: "twitter:image", content: shareImage },
            ]
          : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: product ? [{ type: "application/ld+json", children: JSON.stringify(product) }] : [],
    };
  },
  component: GameDetailPage,
});

type PriceSource = Pick<
  Game,
  | "price_30"
  | "price_60"
  | "price_permanent"
  | "price_30_secondary"
  | "price_60_secondary"
  | "price_permanent_secondary"
>;

function priceFor(source: PriceSource, d: DurationKey, account: AccountKey = "primary") {
  const primary = d === "30" ? source.price_30 : d === "60" ? source.price_60 : source.price_permanent;
  if (account === "primary") return primary;
  const secondary =
    d === "30"
      ? source.price_30_secondary
      : d === "60"
        ? source.price_60_secondary
        : source.price_permanent_secondary;
  return secondary ?? primary;
}


function GameDetailPage() {
  const { slug } = Route.useParams();
  const loadedGame = Route.useLoaderData();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { data: game, isLoading, isError, error } = useQuery({ ...gameQuery(slug), initialData: loadedGame });
  const { data: all = [] } = useQuery(gamesQuery());
  const { data: settings } = useQuery(settingsQuery);
  const contact = contactFrom(settings);

  const { data: editions = [] } = useQuery(gameEditionsQuery(game?.id));
  const [editionId, setEditionId] = useState<string | null>(null);
  const [duration, setDuration] = useState<DurationKey>("30");
  const [account, setAccount] = useState<AccountKey>("primary");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [trailerPlaying, setTrailerPlaying] = useState(false);

  // Four random visible games, re-shuffled on every visit to the page.
  const related = useMemo(() => {
    const pool = all.filter((g) => g.visible && g.slug !== slug);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    return pool.slice(0, 4);
  }, [all, slug]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="glass aspect-4/3 max-h-[40vh] animate-pulse rounded-3xl sm:aspect-16/9 sm:max-h-none" />
      </div>
    );
  }

  if (isError || !game) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={Gamepad2}
          title={isError ? "Couldn't load this game" : "Game not found"}
          body={isError ? (error as Error).message : "This title may have been removed from the catalog."}
          action={
            <Button asChild variant="hero">
              <Link to="/games">Browse all games</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const activeEdition: GameEdition | null = editions.find((e) => e.id === editionId) ?? null;
  const priceSource: PriceSource = activeEdition ?? game;
  const oldPrice = activeEdition ? activeEdition.old_price : game.old_price;
  const hasAccountToggle = game.primary_available && game.secondary_available;
  const activeAccount = account === "primary" && !game.primary_available ? "secondary" : account;
  const availableDurations = (["30", "60", "permanent"] as DurationKey[]).filter(
    (d) => priceFor(priceSource, d, activeAccount) !== null,
  );
  const activeDuration = availableDurations.includes(duration) ? duration : (availableDurations[0] ?? "30");
  const price = priceFor(priceSource, activeDuration, activeAccount);
  const off = discountPercent(oldPrice, price);
  const heroImage = game.banner_url ?? game.cover_url ?? "";
  const heroPosition = safePosition(game.banner_url ? game.banner_position : game.cover_position);
  const gallery = (game.gallery ?? []).filter((s): s is string => Boolean(s));


  const orderMessage = buildOrderMessage(
    {
      productType: "game",
      productName: activeEdition ? `${game.title} — ${activeEdition.name}` : game.title,
      productId: game.id,
      platform: game.platform,
      optionType: activeAccount === "primary" ? "Primary account" : "Secondary account",
      duration: DURATION_LABEL[activeDuration],
      price,
    },
    contact.brand,
  );

  const recordOrder = async () => {
    try {
      await supabase.from("orders").insert({
        user_id: user?.id ?? null,
        product_type: "game",
        product_id: game.id,
        product_name: activeEdition ? `${game.title} — ${activeEdition.name}` : game.title,
        platform: game.platform,
        option_type: activeAccount === "primary" ? "Primary" : "Secondary",
        duration: DURATION_LABEL[activeDuration],
        price,
        status: "Pending",
      });
    } catch {
      /* ordering continues on WhatsApp regardless */
    }
    toast.success("Opening WhatsApp with your order details.");
  };

  return (
    <div className="pb-10">
      {/* Hero */}
      <div className="relative w-full overflow-hidden">
        {heroImage ? (
          <BannerImage src={heroImage} alt={`${game.title} artwork`} eager />
        ) : (
          <div aria-hidden className="aspect-video w-full bg-surface-2" />
        )}
        <div aria-hidden className="overlay-fade absolute inset-0" />
        {game.pre_order && (
          <span className="absolute top-3 left-3 rounded-full bg-lag-blue px-3 py-1.5 text-xs font-bold tracking-wider text-primary-foreground">
            PRE-ORDER
          </span>
        )}
        <button
          type="button"
          aria-label={game.title}
          className="absolute top-3 right-3 opacity-0"
          tabIndex={-1}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Badges, title, description, rating */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="blue">{game.platform}</Badge>
          {game.genre && <Badge>{game.genre}</Badge>}
          {game.pre_order && <Badge tone="blue">Pre-Order</Badge>}
          <Badge>{game.availability}</Badge>
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">{game.title}</h1>
        {game.short_description && (
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">{game.short_description}</p>
        )}
        {typeof game.rating === "number" && (
          <div className="mt-3 flex items-center gap-2">
            <StarRating value={game.rating} />
            <span className="text-sm text-muted-foreground">{game.rating.toFixed(1)} / 5</span>
          </div>
        )}

        {/* Purchase card — reachable with minimal scrolling on mobile */}
        <div className="glass-strong mt-6 rounded-3xl p-5">
          <p className="text-[11px] font-bold tracking-[0.2em] text-lag-red uppercase">
            Price &amp; select option
          </p>

          {editions.length > 0 && (
            <div className="mt-4">
              <span className="mb-2 block text-sm font-semibold">Edition</span>
              <div className="grid grid-cols-2 gap-2">
                {[null, ...editions].map((e) => {
                  const selected = (e?.id ?? null) === (activeEdition?.id ?? null);
                  const label = e ? e.name : "Standard Edition";
                  const from =
                    priceFor(e ?? game, activeDuration, activeAccount) ??
                    priceFor(e ?? game, "30", activeAccount);
                  return (
                    <button
                      key={e?.id ?? "standard"}
                      type="button"
                      onClick={() => setEditionId(e?.id ?? null)}
                      aria-pressed={selected}
                      className={cn(
                        "rounded-2xl border px-3 py-3 text-left transition-colors",
                        selected
                          ? "border-lag-blue/60 bg-lag-blue/15"
                          : "border-border bg-muted/30 hover:border-lag-blue/40",
                      )}
                    >
                      <span className="block text-xs font-bold tracking-wide uppercase">{label}</span>
                      <span className="mt-1 block font-display text-sm font-bold">{money(from)}</span>
                      {e?.note && (
                        <span className="mt-1 block text-[11px] text-muted-foreground">{e.note}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {hasAccountToggle && (
            <div className="mt-4">
              <span className="mb-2 block text-sm font-semibold">Account type</span>
              <div className="grid grid-cols-2 gap-2">
                {(["primary", "secondary"] as AccountKey[]).map((a) => {
                  const enabled = a === "primary" ? game.primary_available : game.secondary_available;
                  return (
                    <button
                      key={a}
                      type="button"
                      disabled={!enabled}
                      onClick={() => setAccount(a)}
                      aria-pressed={activeAccount === a}
                      className={cn(
                        "rounded-2xl border px-3 py-3 text-sm font-semibold capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                        activeAccount === a
                          ? "border-lag-blue/60 bg-lag-blue/15 text-lag-blue"
                          : "border-border bg-muted/30",
                      )}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-4">
            <span className="mb-2 block text-sm font-semibold">Duration</span>
            <div className="grid grid-cols-3 gap-2">
              {(["30", "60", "permanent"] as DurationKey[]).map((d) => {
                const p = priceFor(priceSource, d, activeAccount);
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={p === null}
                    onClick={() => setDuration(d)}
                    aria-pressed={activeDuration === d}
                    className={cn(
                      "rounded-2xl border px-2 py-3 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                      activeDuration === d
                        ? "border-lag-red/60 bg-lag-red/15"
                        : "border-border bg-muted/30 hover:border-lag-red/40",
                    )}
                  >
                    <span className="block text-xs font-bold tracking-wide uppercase">
                      {DURATION_LABEL[d]}
                    </span>
                    <span className="mt-1 block font-display text-sm font-bold">{money(p)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 flex items-end gap-3">
            <span className="font-display text-3xl font-bold">{money(price)}</span>
            {oldPrice && off && (
              <>
                <span className="text-sm text-muted-foreground line-through">{money(oldPrice)}</span>
                <Badge tone="red">{off}% off</Badge>
              </>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              variant="hero"
              size="lg"
              onClick={() => {
                if (!addItem({
                  key: `game:${game.id}:${activeEdition?.id ?? "std"}:${activeAccount}:${activeDuration}`,
                  name: activeEdition ? `${game.title} — ${activeEdition.name}` : game.title,
                  price,
                  image: game.cover_url,
                  productType: "Game",
                  productId: game.id,
                  option: `${activeAccount === "primary" ? "Primary" : "Secondary"} account · ${DURATION_LABEL[activeDuration]}`,
                })) return;
                toast.success(`${game.title} added to cart.`);
              }}
            >
              <ShoppingCart className="h-4 w-4" aria-hidden />
              Add to Cart
            </Button>
            <Button asChild variant="whatsapp" size="lg">
              <a
                href={whatsappLink(contact.whatsapp, orderMessage)}
                target="_blank"
                rel="noreferrer noopener"
                onClick={() => void recordOrder()}
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                Order on WhatsApp
              </a>
            </Button>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            No checkout needed — we confirm availability and payment on WhatsApp.
          </p>

          {!user && (
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Heart className="h-3.5 w-3.5" aria-hidden />
              <Link to="/login" className="underline">
                Sign in
              </Link>{" "}
              to save this game to your wishlist.
            </p>
          )}
        </div>

        {/* Game information */}
        <section className="mt-8">
          <h2 className="font-display text-xl font-bold">Game information</h2>
          <dl className="glass mt-3 grid gap-4 rounded-3xl p-5 sm:grid-cols-2">
            <Meta icon={CalendarDays} label="Release date" value={formatDate(game.release_date)} />
            <Meta icon={HardDrive} label="Game size" value={game.game_size ?? "Ask on WhatsApp"} />
            <Meta icon={Users} label="Developer" value={game.developer ?? "—"} />
            <Meta icon={ShieldCheck} label="Publisher" value={game.publisher ?? "—"} />
            <Meta icon={Gamepad2} label="Availability" value={game.availability} />
          </dl>
        </section>

        {/* About */}
        {game.description && (
          <section className="mt-8">
            <h2 className="font-display text-xl font-bold">About this game</h2>
            <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
              {game.description}
            </p>
          </section>
        )}

        {/* Screenshots */}
        {gallery.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-xl font-bold">Screenshots</h2>
            <Dialog open={!!lightbox} onOpenChange={(open) => !open && setLightbox(null)}>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {gallery.map((src, i) => (
                  <DialogTrigger key={src + i} asChild>
                    <button
                      type="button"
                      onClick={() => setLightbox(src)}
                      aria-label={`Enlarge screenshot ${i + 1}`}
                      className="aspect-16/9 overflow-hidden rounded-2xl border border-border/60 bg-surface-2"
                    >
                      <img
                        src={src}
                        alt={`${game.title} screenshot ${i + 1}`}
                        loading="lazy"
                        className="h-full w-full object-contain transition-transform duration-500 hover:scale-105"
                      />
                    </button>
                  </DialogTrigger>
                ))}
              </div>
              <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
                {lightbox && (
                  <img
                    src={lightbox}
                    alt={`${game.title} screenshot enlarged`}
                    className="max-h-[85vh] w-full rounded-2xl object-contain"
                  />
                )}
              </DialogContent>
            </Dialog>
          </section>
        )}

        {/* Trailer */}
        {game.trailer_url && (
          <section className="mt-8">
            <h2 className="font-display text-xl font-bold">Trailer</h2>
            <div className="mt-3 aspect-16/9 overflow-hidden rounded-2xl">
              {trailerPlaying ? (
                <iframe
                  src={toEmbeddableUrl(game.trailer_url)}
                  title={`${game.title} trailer`}
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
                    src={game.banner_url ?? game.cover_url ?? ""}
                    alt=""
                    style={{ objectPosition: heroPosition }}
                    className="h-full w-full object-cover"
                  />
                  <span aria-hidden className="overlay-fade absolute inset-0" />
                  <span className="absolute inset-0 grid place-items-center">
                    <GlassIcon icon={Play} tone="red" size="lg" />
                  </span>
                </button>
              )}
            </div>
          </section>
        )}
      </div>

      {related.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <SectionHeading eyebrow="You may also like" title="Recommended games" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** Best-effort conversion of common trailer links into embeddable iframe URLs. */
function toEmbeddableUrl(url: string): string {
  const youtube = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}?autoplay=1`;
  return url;
}

function Meta({
  icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <GlassIcon icon={icon} tone="blue" />
      <div className="min-w-0">
        <dt className="text-xs tracking-wide text-muted-foreground uppercase">{label}</dt>
        <dd className="truncate text-sm font-semibold">{value}</dd>
      </div>
    </div>
  );
}
