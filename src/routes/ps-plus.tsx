import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  Circle,
  Crown,
  Gamepad2,
  MessageCircle,
  ShoppingCart,
  Sparkles,
  Square,
  Triangle,
} from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { useMemo, useState, type ElementType } from "react";

import { Badge, EmptyState, Reveal } from "@/components/lag/ui-bits";
import { PsPlusComparison } from "@/components/lag/PsPlusComparison";
import { Button } from "@/components/ui/button";
import {
  PS_PLUS_DURATIONS,
  PS_PLUS_TIERS,
  buildOrderMessage,
  discountPercent,
  money,
  whatsappLink,
  type PsPlusDurationKey,
  type PsPlusPlan,
} from "@/lib/lag";
import { contactFrom, psPlusQuery, settingsQuery } from "@/lib/queries";
import { safePosition } from "@/lib/media";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ps-plus")({
  head: () => ({
    meta: [
      { title: "PS Plus Subscriptions — Essential, Extra & Deluxe | LAG" },
      {
        name: "description",
        content:
          "Buy PlayStation Plus Essential, Extra and Deluxe memberships at LAG prices. Pick 1, 3 or 12 months and order on WhatsApp.",
      },
      { property: "og:title", content: "PS Plus Subscriptions — LAG LIVE AS GAMERS" },
      {
        property: "og:description",
        content: "Essential, Extra and Deluxe memberships for 1, 3 or 12 months — delivered fast over WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://thelaggames.com/ps-plus" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://thelaggames.com/ps-plus" }],
  }),
  component: PsPlusPage,
});

type Tone = "red" | "blue" | "gold";

/** Per-tier accent + PlayStation-shape watermark. Keeps each category distinct. */
const TIER_META: Record<string, { tone: Tone; chip: ElementType; mark: ElementType }> = {
  Essential: { tone: "red", chip: Sparkles, mark: Triangle },
  Extra: { tone: "blue", chip: Gamepad2, mark: Circle },
  Deluxe: { tone: "gold", chip: Crown, mark: Square },
};

const FALLBACK_META = { tone: "red", chip: Sparkles, mark: Triangle } as const;

const TONE = {
  red: {
    text: "text-lag-red",
    active: "border-lag-red/60 ring-lag-red/15 bg-gradient-to-br from-lag-red/20 to-transparent",
    chip: "bg-lag-red/20 text-lag-red",
    solid: "bg-lag-red text-primary-foreground",
    glow: "shadow-[0_0_30px_-10px_var(--lag-red)]",
  },
  blue: {
    text: "text-lag-blue",
    active: "border-lag-blue/60 ring-lag-blue/15 bg-gradient-to-br from-lag-blue/20 to-transparent",
    chip: "bg-lag-blue/20 text-lag-blue",
    solid: "bg-lag-blue text-primary-foreground",
    glow: "shadow-[0_0_30px_-10px_var(--lag-blue)]",
  },
  gold: {
    text: "text-chart-3",
    active: "border-chart-3/60 ring-chart-3/15 bg-gradient-to-br from-chart-3/20 to-transparent",
    chip: "bg-chart-3/20 text-chart-3",
    solid: "bg-chart-3 text-background",
    glow: "shadow-[0_0_30px_-10px_var(--chart-3)]",
  },
} as const;

const MONTHS: Record<PsPlusDurationKey, number> = {
  price_1m: 1,
  price_3m: 3,
  price_12m: 12,
};

function priceFor(plan: PsPlusPlan | null, key: PsPlusDurationKey): number | null {
  if (!plan) return null;
  return plan[key] ?? plan.price ?? null;
}

function PsPlusPage() {
  const { addItem } = useCart();
  const { data: plans = [], isLoading, isError, error } = useQuery(psPlusQuery);
  const { data: settings } = useQuery(settingsQuery);
  const contact = contactFrom(settings);

  const [tier, setTier] = useState<string>(PS_PLUS_TIERS[0]);
  const [duration, setDuration] = useState<PsPlusDurationKey>("price_1m");

  const visible = useMemo(() => plans.filter((p) => p.visible), [plans]);

  /** One card per category — the first visible plan of that tier. */
  const byTier = useMemo(() => {
    const map = new Map<string, PsPlusPlan>();
    for (const t of PS_PLUS_TIERS) {
      const found = visible.find((p) => (p.tier || p.name).toLowerCase().includes(t.toLowerCase()));
      if (found) map.set(t, found);
    }
    return map;
  }, [visible]);

  const selected = byTier.get(tier) ?? null;
  const meta = TIER_META[tier] ?? FALLBACK_META;
  const tone = TONE[meta.tone];
  const price = priceFor(selected, duration);
  const durationLabel = PS_PLUS_DURATIONS.find((d) => d.key === duration)?.label ?? "1 Month";
  const off = discountPercent(selected?.old_price, price);

  /** Which duration saves the most per month, so only that one gets the flag. */
  const bestSave = useMemo(() => {
    const base = priceFor(selected, "price_1m");
    if (!base) return null;
    let best: { key: PsPlusDurationKey; pct: number } | null = null;
    for (const d of PS_PLUS_DURATIONS) {
      const value = priceFor(selected, d.key);
      if (!value) continue;
      const pct = Math.round((1 - value / MONTHS[d.key] / base) * 100);
      if (pct > 5 && (!best || pct > best.pct)) best = { key: d.key, pct };
    }
    return best;
  }, [selected]);

  const message = selected
    ? buildOrderMessage(
        {
          productType: "ps-plus",
          productName: `PS Plus ${tier}`,
          productId: selected.id,
          duration: durationLabel,
          region: selected.region,
          platform: selected.platform,
          price,
        },
        contact.brand,
      )
    : "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-lag-red">Subscriptions</p>
        <h1 className="font-display text-3xl font-bold italic tracking-tight sm:text-4xl">PlayStation Plus</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Pick your membership, choose how long you want it, and the price updates instantly.
        </p>
      </div>

      {isError ? (
        <EmptyState icon={Sparkles} title="Couldn't load plans" body={(error as Error).message} />
      ) : isLoading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass h-36 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : byTier.size === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No PS Plus plans yet"
          body="Memberships are being added — message us on WhatsApp meanwhile."
        />
      ) : (
        <>
          {/* Membership tiles: a scroll rail on phones, a row on larger screens. */}
          <div className="rail -mx-4 px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            {PS_PLUS_TIERS.map((t, i) => {
              const plan = byTier.get(t);
              const active = tier === t;
              const m = TIER_META[t] ?? FALLBACK_META;
              const tn = TONE[m.tone];
              const from = plan ? priceFor(plan, "price_1m") : null;
              const Mark = m.mark;
              const Chip = m.chip;
              return (
                <Reveal key={t} delay={i * 70} className="min-w-[150px] sm:min-w-0">
                  <button
                    type="button"
                    disabled={!plan}
                    aria-pressed={active}
                    onClick={() => setTier(t)}
                    className={cn(
                      "relative flex h-full w-full flex-col overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300",
                      active ? cn("border-2 ring-4", tn.active, tn.glow) : "border-border bg-muted/30",
                      !active && "opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0",
                      !plan && "cursor-not-allowed opacity-40 grayscale",
                    )}
                  >
                    {plan?.image_url ? (
                      <img
                        src={plan.image_url}
                        alt=""
                        aria-hidden
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover opacity-20"
                        style={{ objectPosition: safePosition(plan.image_position) }}
                      />
                    ) : (
                      <Mark
                        aria-hidden
                        className="absolute -right-3 -top-3 h-20 w-20 text-foreground opacity-10"
                      />
                    )}
                    <span
                      className={cn(
                        "relative mb-8 grid h-8 w-8 place-items-center rounded-full",
                        active ? tn.chip : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Chip className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="relative font-display text-sm font-bold uppercase leading-tight">{t}</span>
                    <span
                      className={cn(
                        "relative mt-1 text-[11px] font-bold",
                        active ? tn.text : "text-muted-foreground",
                      )}
                    >
                      {plan ? `From ${money(from)}` : "Coming soon"}
                    </span>
                  </button>
                </Reveal>
              );
            })}
          </div>

          {selected && (
            <div id="ps-plus-selection" className="glass-strong relative mt-5 scroll-mt-24 overflow-hidden rounded-[2rem] p-5 sm:p-7">
              {/* Accent light bleeding in from the corner. */}
              <div
                aria-hidden
                className={cn(
                  "pointer-events-none absolute -left-20 -top-20 h-40 w-40 rounded-full blur-[80px]",
                  meta.tone === "blue" ? "bg-lag-blue/25" : meta.tone === "gold" ? "bg-chart-3/25" : "bg-lag-red/25",
                )}
              />

              <div className="relative flex flex-wrap gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-tight",
                    tone.solid,
                  )}
                >
                  PS Plus {tier}
                </span>
                <Badge tone="blue">{selected.platform}</Badge>
                <Badge>{selected.region}</Badge>
                <Badge>{selected.availability}</Badge>
              </div>

              <h2 className="relative mt-6 font-display text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Select Duration
              </h2>
              <div className="relative mt-3 grid grid-cols-3 gap-2">
                {PS_PLUS_DURATIONS.map((d) => {
                  const value = priceFor(selected, d.key);
                  const active = duration === d.key;
                  const save = bestSave?.key === d.key ? bestSave.pct : null;
                  return (
                    <button
                      key={d.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setDuration(d.key)}
                      className={cn(
                        "relative flex flex-col items-center justify-center rounded-2xl px-2 py-3 transition-all duration-200",
                        active
                          ? cn("border-2 ring-4", tone.active, tone.glow)
                          : "border border-border bg-muted/30 hover:border-input",
                      )}
                    >
                      {save && (
                        <span className="absolute -top-2 rounded bg-lag-blue px-1.5 py-0.5 text-[8px] font-black tracking-tighter text-primary-foreground">
                          SAVE {save}%
                        </span>
                      )}
                      <span
                        className={cn(
                          "text-[9px] font-bold uppercase tracking-wide",
                          active ? tone.text : "text-muted-foreground",
                        )}
                      >
                        {d.label}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 font-display text-base font-bold tracking-tight",
                          active ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {money(value)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="relative mt-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-4xl font-black italic tracking-tighter">{money(price)}</span>
                    {selected.old_price && (
                      <span className="text-sm text-muted-foreground line-through opacity-70">
                        {money(selected.old_price)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    One-time payment for {durationLabel} access
                  </p>
                </div>
                {off && (
                  <span className="rounded bg-lag-red px-2 py-1 text-[10px] font-black text-primary-foreground">
                    {off}% OFF
                  </span>
                )}
              </div>

              {selected.description && (
                <p className="relative mt-4 text-sm text-muted-foreground">{selected.description}</p>
              )}

              {selected.features?.length > 0 && (
                <ul className="relative mt-5 grid gap-y-3 sm:grid-cols-2">
                  {selected.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={cn("grid h-4 w-4 shrink-0 place-items-center rounded-full", tone.chip)}>
                        <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              )}

              <div className="relative mt-7 grid gap-3 sm:grid-cols-2">
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full uppercase tracking-wide"
                  onClick={() => {
                    if (!addItem({
                      key: `psplus:${selected.id}:${duration}`,
                      name: `PS Plus ${tier}`,
                      price,
                      image: selected.image_url?.startsWith("data:") ? null : selected.image_url,
                      productType: "PS Plus",
                      productId: selected.id,
                      option: `${durationLabel} · ${selected.region} · ${selected.platform}`,
                    })) return;
                    toast.success(`PS Plus ${tier} added to cart.`);
                  }}
                >
                  <ShoppingCart className="h-4 w-4" aria-hidden />
                  Add to Cart
                </Button>
                <Button asChild variant="whatsapp" size="lg" className="w-full uppercase tracking-wide">
                  <a href={whatsappLink(contact.whatsapp, message)} target="_blank" rel="noreferrer noopener">
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    Order {tier} · {durationLabel}
                  </a>
                </Button>
              </div>
            </div>
          )}
          <PsPlusComparison
            selectedTier={tier}
            durationLabel={durationLabel}
            prices={{ Essential: money(priceFor(byTier.get("Essential") ?? null, duration)), Extra: money(priceFor(byTier.get("Extra") ?? null, duration)), Deluxe: money(priceFor(byTier.get("Deluxe") ?? null, duration)) }}
            available={{ Essential: byTier.has("Essential"), Extra: byTier.has("Extra"), Deluxe: byTier.has("Deluxe") }}
            onSelect={(value) => {
              setTier(value);
              document.getElementById("ps-plus-selection")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
            }}
          />
        </>
      )}
    </div>
  );
}
