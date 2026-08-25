import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, MessageCircle, Sparkles } from "lucide-react";
import { useState } from "react";

import { Badge, EmptyState, GlassIcon, Reveal, SectionHeading } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { buildOrderMessage, discountPercent, money, whatsappLink } from "@/lib/lag";
import { contactFrom, psPlusQuery, settingsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ps-plus")({
  head: () => ({
    meta: [
      { title: "PS Plus Subscriptions — Essential, Extra & Deluxe | LAG" },
      {
        name: "description",
        content:
          "Buy PlayStation Plus Essential, Extra and Deluxe memberships at LAG prices. Choose your region and duration, then order on WhatsApp.",
      },
      { property: "og:title", content: "PS Plus Subscriptions — LAG LIVE AS GAMERS" },
      {
        property: "og:description",
        content: "Online multiplayer, monthly games and the classics catalog — delivered fast over WhatsApp.",
      },
    ],
  }),
  component: PsPlusPage,
});

function PsPlusPage() {
  const { data: plans = [], isLoading, isError, error } = useQuery(psPlusQuery);
  const { data: settings } = useQuery(settingsQuery);
  const contact = contactFrom(settings);
  const [tier, setTier] = useState("all");

  const visible = plans.filter((p) => p.visible);
  const tiers = ["all", ...Array.from(new Set(visible.map((p) => p.tier).filter(Boolean)))];
  const results = tier === "all" ? visible : visible.filter((p) => p.tier === tier);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SectionHeading
        eyebrow="Subscriptions"
        title="PlayStation Plus"
        subtitle="Online multiplayer, free monthly games, cloud saves and the game catalog — pick the tier that fits you."
      />

      {tiers.length > 2 && (
        <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
          {tiers.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTier(t)}
              aria-pressed={tier === t}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold capitalize transition-colors",
                tier === t
                  ? "border-lag-blue/50 bg-lag-blue/20 text-lag-blue"
                  : "border-border bg-muted/40 text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "all" ? "All tiers" : t}
            </button>
          ))}
        </div>
      )}

      {isError ? (
        <EmptyState icon={Sparkles} title="Couldn't load plans" body={(error as Error).message} />
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass h-80 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <EmptyState icon={Sparkles} title="No PS Plus plans yet" body="New membership plans are added regularly." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p, i) => {
            const off = discountPercent(p.old_price, p.price);
            const message = buildOrderMessage(
              {
                productType: "ps-plus",
                productName: p.name,
                productId: p.id,
                duration: p.duration,
                region: p.region,
                platform: p.platform,
                price: p.price,
              },
              contact.brand,
            );
            return (
              <Reveal key={p.id} delay={i * 80}>
                <article className="glass hover-lift flex h-full flex-col rounded-3xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <GlassIcon icon={Sparkles} tone="blue" size="lg" />
                    {off && <Badge tone="red">{off}% off</Badge>}
                  </div>
                  <h2 className="mt-4 font-display text-xl font-bold">{p.name}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone="blue">{p.tier}</Badge>
                    <Badge>{p.duration}</Badge>
                    <Badge>{p.region}</Badge>
                  </div>
                  {p.description && (
                    <p className="mt-3 text-sm text-muted-foreground">{p.description}</p>
                  )}
                  {p.features?.length > 0 && (
                    <ul className="mt-4 space-y-1.5">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-lag-red" aria-hidden />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-5 flex items-end gap-2">
                    <span className="font-display text-2xl font-bold">{money(p.price)}</span>
                    {p.old_price && (
                      <span className="text-sm text-muted-foreground line-through">{money(p.old_price)}</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.platform} · {p.availability}
                  </p>
                  <Button asChild variant="whatsapp" className="mt-4 w-full">
                    <a href={whatsappLink(contact.whatsapp, message)} target="_blank" rel="noreferrer noopener">
                      <MessageCircle className="h-4 w-4" aria-hidden />
                      Order on WhatsApp
                    </a>
                  </Button>
                </article>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}
