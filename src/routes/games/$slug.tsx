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
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { GameCard } from "@/components/lag/GameCard";
import { Badge, EmptyState, GlassIcon, SectionHeading, StarRating } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
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
} from "@/lib/lag";
import { contactFrom, gameQuery, gamesQuery, settingsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/games/$slug")({
  head: () => ({
    meta: [
      { title: "Game details — LAG LIVE AS GAMERS" },
      {
        name: "description",
        content: "Full details, pricing tiers and instant WhatsApp ordering for this PlayStation title.",
      },
      { property: "og:title", content: "Game details — LAG LIVE AS GAMERS" },
      {
        property: "og:description",
        content: "Primary or secondary account, 30 days, 60 days or permanent. Order on WhatsApp.",
      },
    ],
  }),
  component: GameDetailPage,
});

function priceFor(game: Game, d: DurationKey) {
  return d === "30" ? game.price_30 : d === "60" ? game.price_60 : game.price_permanent;
}

function GameDetailPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const { data: game, isLoading, isError, error } = useQuery(gameQuery(slug));
  const { data: all = [] } = useQuery(gamesQuery());
  const { data: settings } = useQuery(settingsQuery);
  const contact = contactFrom(settings);

  const [duration, setDuration] = useState<DurationKey>("30");
  const [account, setAccount] = useState<AccountKey>("primary");
  const [shot, setShot] = useState(0);

  const related = useMemo(
    () =>
      all
        .filter((g) => g.visible && g.slug !== slug && (!game?.genre || g.genre === game.genre))
        .slice(0, 4),
    [all, slug, game?.genre],
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="glass h-96 animate-pulse rounded-3xl" />
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

  const availableDurations = (["30", "60", "permanent"] as DurationKey[]).filter(
    (d) => priceFor(game, d) !== null,
  );
  const activeDuration = availableDurations.includes(duration) ? duration : (availableDurations[0] ?? "30");
  const price = priceFor(game, activeDuration);
  const off = discountPercent(game.old_price, price);
  const gallery = [game.banner_url, ...(game.gallery ?? []), game.cover_url].filter(
    (s): s is string => Boolean(s),
  );

  const orderMessage = buildOrderMessage(
    {
      productType: "game",
      productName: game.title,
      productId: game.id,
      platform: game.platform,
      optionType: account === "primary" ? "Primary account" : "Secondary account",
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
        product_name: game.title,
        platform: game.platform,
        option_type: account === "primary" ? "Primary" : "Secondary",
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
      {/* Banner */}
      <div className="relative">
        <div className="relative aspect-4/5 w-full overflow-hidden sm:aspect-16/9 lg:aspect-21/9">
          <img
            src={gallery[shot] ?? ""}
            alt={`${game.title} artwork`}
            className="h-full w-full object-cover"
          />
          <div aria-hidden className="overlay-fade absolute inset-0" />
        </div>
        {gallery.length > 1 && (
          <div className="no-scrollbar mx-auto -mt-10 flex max-w-7xl gap-2 overflow-x-auto px-4 sm:px-6">
            {gallery.map((g, i) => (
              <button
                key={g + i}
                type="button"
                onClick={() => setShot(i)}
                aria-label={`Show image ${i + 1}`}
                aria-pressed={i === shot}
                className={cn(
                  "h-16 w-28 shrink-0 overflow-hidden rounded-xl border-2 transition-colors",
                  i === shot ? "border-lag-red" : "border-border/60",
                )}
              >
                <img src={g} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Left: details */}
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge tone="blue">{game.platform}</Badge>
            {game.genre && <Badge>{game.genre}</Badge>}
            {game.new_release && <Badge tone="red">New release</Badge>}
            {game.hot_deal && <Badge tone="red">Hot deal</Badge>}
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

          <dl className="glass mt-6 grid gap-4 rounded-3xl p-5 sm:grid-cols-2">
            <Meta icon={CalendarDays} label="Release date" value={formatDate(game.release_date)} />
            <Meta icon={HardDrive} label="Game size" value={game.game_size ?? "Ask on WhatsApp"} />
            <Meta icon={Users} label="Developer" value={game.developer ?? "—"} />
            <Meta icon={ShieldCheck} label="Publisher" value={game.publisher ?? "—"} />
          </dl>

          {game.description && (
            <section className="mt-8">
              <h2 className="font-display text-xl font-bold">About this game</h2>
              <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                {game.description}
              </p>
            </section>
          )}

          {game.trailer_url && (
            <section className="mt-8">
              <h2 className="font-display text-xl font-bold">Trailer</h2>
              <Button asChild variant="glass" className="mt-3">
                <a href={game.trailer_url} target="_blank" rel="noreferrer noopener">
                  <Play className="h-4 w-4" aria-hidden />
                  Watch trailer
                </a>
              </Button>
            </section>
          )}

          <section className="mt-8">
            <h2 className="font-display text-xl font-bold">Primary vs Secondary</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="glass rounded-2xl p-4">
                <h3 className="font-display font-bold">Primary account</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {game.primary_description ??
                    "Play offline on your own console as the primary user. Best for single-player games."}
                </p>
                <div className="mt-3">
                  <Badge tone={game.primary_available ? "red" : "neutral"}>
                    {game.primary_available ? "Available" : "Unavailable"}
                  </Badge>
                </div>
              </div>
              <div className="glass rounded-2xl p-4">
                <h3 className="font-display font-bold">Secondary account</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {game.secondary_description ??
                    "Requires an internet connection while playing. Great value for online titles."}
                </p>
                <div className="mt-3">
                  <Badge tone={game.secondary_available ? "blue" : "neutral"}>
                    {game.secondary_available ? "Available" : "Unavailable"}
                  </Badge>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right: order panel */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="glass-strong rounded-3xl p-5">
            <p className="text-[11px] font-bold tracking-[0.2em] text-lag-red uppercase">Choose your plan</p>

            <div className="mt-4">
              <span className="mb-2 block text-sm font-semibold">Duration</span>
              <div className="grid grid-cols-3 gap-2">
                {(["30", "60", "permanent"] as DurationKey[]).map((d) => {
                  const p = priceFor(game, d);
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
                      aria-pressed={account === a}
                      className={cn(
                        "rounded-2xl border px-3 py-3 text-sm font-semibold capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                        account === a
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

            <div className="mt-5 flex items-end gap-3">
              <span className="font-display text-3xl font-bold">{money(price)}</span>
              {game.old_price && off && (
                <>
                  <span className="text-sm text-muted-foreground line-through">{money(game.old_price)}</span>
                  <Badge tone="red">{off}% off</Badge>
                </>
              )}
            </div>

            <Button asChild variant="whatsapp" size="lg" className="mt-4 w-full">
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
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <SectionHeading eyebrow="You may also like" title="Similar games" />
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
