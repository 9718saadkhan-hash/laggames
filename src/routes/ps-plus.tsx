import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, MessageCircle, ShoppingCart, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { useMemo, useState } from "react";

import { Badge, EmptyState, GlassIcon, Reveal, SectionHeading } from "@/components/lag/ui-bits";
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
  const price = priceFor(selected, duration);
  const durationLabel = PS_PLUS_DURATIONS.find((d) => d.key === duration)?.label ?? "1 Month";

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
      <SectionHeading
        eyebrow="Subscriptions"
        title="PlayStation Plus"
        subtitle="Three memberships, three durations. Pick your category, choose 1, 3 or 12 months and the price updates instantly."
      />

      {isError ? (
        <EmptyState icon={Sparkles} title="Couldn't load plans" body={(error as Error).message} />
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass h-56 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : byTier.size === 0 ? (
        <EmptyState icon={Sparkles} title="No PS Plus plans yet" body="Memberships are being added — message us on WhatsApp meanwhile." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {PS_PLUS_TIERS.map((t, i) => {
              const plan = byTier.get(t);
              const active = tier === t;
              const from = plan ? priceFor(plan, "price_1m") : null;
              return (
                <Reveal key={t} delay={i * 80}>
                  <button
                    type="button"
                    disabled={!plan}
                    aria-pressed={active}
                    onClick={() => setTier(t)}
                    className={cn(
                      "glass relative flex h-full w-full flex-col overflow-hidden rounded-3xl p-5 text-left transition-transform duration-300",
                      active ? "glow-red -translate-y-1 border-lag-red/50" : "hover:-translate-y-1",
                      !plan && "opacity-45",
                    )}
                  >
                    {plan?.image_url && (
                      <img
                        src={plan.image_url}
                        alt=""
                        aria-hidden
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover opacity-20"
                        style={{ objectPosition: safePosition(plan.image_position) }}
                      />
                    )}
                    <div className="relative">
                      <GlassIcon icon={Sparkles} tone={i === 1 ? "blue" : "red"} size="lg" />
                      <h2 className="mt-4 font-display text-xl font-bold">PS Plus {t}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {plan ? `From ${money(from)}` : "Coming soon"}
                      </p>
                    </div>
                  </button>
                </Reveal>
              );
            })}
          </div>

          {selected && (
            <div className="glass-strong mt-6 rounded-3xl p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="red">PS Plus {tier}</Badge>
                <Badge tone="blue">{selected.platform}</Badge>
                <Badge>{selected.region}</Badge>
                <Badge>{selected.availability}</Badge>
              </div>

              <h3 className="mt-4 font-display text-lg font-bold">Choose your duration</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {PS_PLUS_DURATIONS.map((d) => {
                  const value = priceFor(selected, d.key);
                  const active = duration === d.key;
                  return (
                    <button
                      key={d.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setDuration(d.key)}
                      className={cn(
                        "glass rounded-2xl px-4 py-4 text-left transition-transform duration-200",
                        active ? "glow-blue border-lag-blue/50" : "hover:-translate-y-0.5",
                      )}
                    >
                      <span className="block text-xs font-bold tracking-widest text-muted-foreground uppercase">
                        {d.label}
                      </span>
                      <span className="mt-1 block font-display text-xl font-bold">{money(value)}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-end gap-3">
                <span className="font-display text-3xl font-bold">{money(price)}</span>
                {selected.old_price && (
                  <span className="text-sm text-muted-foreground line-through">{money(selected.old_price)}</span>
                )}
                {discountPercent(selected.old_price, price) && (
                  <Badge tone="red">{discountPercent(selected.old_price, price)}% off</Badge>
                )}
                <span className="text-sm text-muted-foreground">for {durationLabel}</span>
              </div>

              {selected.description && (
                <p className="mt-3 text-sm text-muted-foreground">{selected.description}</p>
              )}

              {selected.features?.length > 0 && (
                <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
                  {selected.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-lag-red" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Button
                  variant="glass"
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    addItem({
                      key: `psplus:${selected.id}:${duration}`,
                      name: `PS Plus ${tier}`,
                      price,
                      image: selected.image_url,
                      productType: "PS Plus",
                      productId: selected.id,
                      option: `${durationLabel} · ${selected.region} · ${selected.platform}`,
                    });
                    toast.success(`PS Plus ${tier} added to cart.`);
                  }}
                >
                  <ShoppingCart className="h-4 w-4" aria-hidden />
                  Add to Cart
                </Button>
              <Button asChild variant="whatsapp" size="lg" className="w-full">
                <a href={whatsappLink(contact.whatsapp, message)} target="_blank" rel="noreferrer noopener">
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  Order {tier} · {durationLabel}
                </a>
              </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
