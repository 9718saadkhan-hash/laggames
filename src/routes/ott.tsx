import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Monitor, ShoppingCart, Tv, Users } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";

import { Badge, EmptyState, GlassIcon, Reveal, SectionHeading } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { buildOrderMessage, discountPercent, money, whatsappLink } from "@/lib/lag";
import { contactFrom, ottQuery, settingsQuery } from "@/lib/queries";

export const Route = createFileRoute("/ott")({
  head: () => ({
    meta: [
      { title: "OTT Subscriptions — Netflix, Prime & More | LAG LIVE AS GAMERS" },
      {
        name: "description",
        content:
          "Affordable OTT subscription plans with 4K quality and multi-screen options. Pick a plan and order instantly on WhatsApp.",
      },
      { property: "og:title", content: "OTT Subscriptions — LAG LIVE AS GAMERS" },
      {
        property: "og:description",
        content: "Streaming subscriptions at gamer-friendly prices, delivered over WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://thelaggames.com/ott" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://thelaggames.com/ott" }],
  }),
  component: OttPage,
});

function OttPage() {
  const { addItem } = useCart();
  const { data: plans = [], isLoading, isError, error } = useQuery(ottQuery);
  const { data: settings } = useQuery(settingsQuery);
  const contact = contactFrom(settings);
  const visible = plans.filter((p) => p.visible);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SectionHeading
        eyebrow="Subscriptions"
        title="OTT Subscriptions"
        subtitle="Streaming plans for every screen in the house — activated the same day you order."
      />

      {isError ? (
        <EmptyState icon={Tv} title="Couldn't load plans" body={(error as Error).message} />
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass h-64 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState icon={Tv} title="No OTT plans yet" body="Streaming plans are on the way." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p, i) => {
            const off = discountPercent(p.old_price, p.price);
            const message = buildOrderMessage(
              {
                productType: "ott",
                productName: p.name,
                productId: p.id,
                optionType: p.plan,
                duration: p.duration,
                price: p.price,
              },
              contact.brand,
            );
            return (
              <Reveal key={p.id} delay={i * 80}>
                <article className="glass hover-lift flex h-full flex-col rounded-3xl p-5">
                  {/* Brand band: the logo shown large over a blurred copy of itself,
                      its edges fading into the card. */}
                  <div className="relative h-28 overflow-hidden rounded-2xl bg-surface sm:h-32">
                    {p.logo_url ? (
                      <>
                        <img
                          src={p.logo_url}
                          alt=""
                          aria-hidden
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 h-full w-full scale-125 object-cover opacity-80 blur-2xl brightness-[0.7]"
                        />
                        <img
                          src={p.logo_url}
                          alt={`${p.name} logo`}
                          loading="lazy"
                          decoding="async"
                          className="media-fade absolute inset-0 m-auto h-24 w-24 object-contain sm:h-28 sm:w-28"
                        />
                      </>
                    ) : (
                      <div className="absolute inset-0 grid place-items-center">
                        <GlassIcon icon={Monitor} tone="red" size="lg" />
                      </div>
                    )}
                    <div
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background/70 to-transparent"
                    />
                    {off && (
                      <Badge tone="red" className="absolute right-2 top-2 border-lag-red bg-lag-red text-primary-foreground">
                        {off}% off
                      </Badge>
                    )}
                  </div>
                  <h2 className="mt-4 font-display text-xl font-bold">{p.name}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone="blue">{p.plan}</Badge>
                    <Badge>{p.duration}</Badge>
                    {p.quality && <Badge>{p.quality}</Badge>}
                  </div>
                  {p.description && <p className="mt-3 text-sm text-muted-foreground">{p.description}</p>}
                  {p.screens && (
                    <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4 text-lag-blue" aria-hidden />
                      {p.screens}
                    </p>
                  )}
                  <div className="mt-5 flex items-end gap-2">
                    <span className="font-display text-2xl font-bold">{money(p.price)}</span>
                    {p.old_price && (
                      <span className="text-sm text-muted-foreground line-through">{money(p.old_price)}</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{p.availability}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      variant="hero"
                      className="w-full"
                      onClick={() => {
                        if (!addItem({
                          key: `ott:${p.id}`,
                          name: p.name,
                          price: p.price,
                          image: p.logo_url?.startsWith("data:") ? null : p.logo_url,
                          productType: "OTT",
                          productId: p.id,
                          option: `${p.plan} · ${p.duration}`,
                        })) return;
                        toast.success(`${p.name} added to cart.`);
                      }}
                    >
                      <ShoppingCart className="h-4 w-4" aria-hidden />
                      Add to Cart
                    </Button>
                  <Button asChild variant="whatsapp" className="w-full">
                    <a href={whatsappLink(contact.whatsapp, message)} target="_blank" rel="noreferrer noopener">
                      <MessageCircle className="h-4 w-4" aria-hidden />
                      Order on WhatsApp
                    </a>
                  </Button>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}
