import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Clock,
  Gamepad2,
  Instagram,
  MessageCircle,
  ShieldCheck,
  Tv,
  Users,
} from "lucide-react";

import { SectionHeading } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { HELP_MESSAGE, instagramUrl, whatsappLink } from "@/lib/lag";
import { contactFrom, settingsQuery } from "@/lib/queries";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About LAG LIVE AS GAMERS — PS4/PS5 Games & OTT Subs" },
      {
        name: "description",
        content:
          "LAG LIVE AS GAMERS provides affordable PS4 and PS5 digital game rentals, PS Plus memberships and OTT subscriptions with instant WhatsApp support.",
      },
      { property: "og:title", content: "About LAG LIVE AS GAMERS" },
      {
        property: "og:description",
        content:
          "Trusted PlayStation game rentals, PS Plus and OTT subscriptions — fast delivery, genuine accounts, real support.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

const SERVICES = [
  {
    icon: Gamepad2,
    title: "PS4 & PS5 Digital Games",
    body: "Rent the latest PlayStation titles for 30 days, 60 days or keep them permanently — primary and secondary account options available.",
  },
  {
    icon: BadgeCheck,
    title: "PS Plus Memberships",
    body: "Essential, Extra and Deluxe memberships across regions, activated on your own console with clear instructions.",
  },
  {
    icon: Tv,
    title: "OTT Subscriptions",
    body: "Netflix, Prime Video, Disney+ Hotstar and more at genuine prices, with the plan, quality and screens you need.",
  },
];

const VALUES = [
  { icon: ShieldCheck, title: "Genuine accounts", body: "Every order is handled personally — no shady resellers." },
  { icon: Clock, title: "Fast delivery", body: "Most orders are delivered within minutes on WhatsApp." },
  { icon: Users, title: "Real gamer support", body: "Setup help, guidance and after-sales support from gamers." },
];

function AboutPage() {
  const { data: settings } = useQuery(settingsQuery);
  const contact = contactFrom(settings);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <SectionHeading
        eyebrow="Who we are"
        title="ABOUT LAG"
        subtitle="LIVE AS GAMERS — built by gamers, for gamers."
      />

      <div className="glass-strong rounded-3xl p-5 sm:p-8">
        <h2 className="font-display text-xl font-bold uppercase sm:text-2xl">
          {contact.brand}
        </h2>
        <p className="mt-1 font-display text-sm font-semibold tracking-[0.18em] text-lag-red">
          {contact.tagline}
        </p>
        <div className="mt-4 max-w-3xl space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            LAG LIVE AS GAMERS is an Indian gaming store focused on making PlayStation gaming
            affordable. We provide PS4 and PS5 digital games on rent, permanent game purchases, PS
            Plus memberships and OTT subscriptions — all delivered directly over WhatsApp.
          </p>
          <p>
            Instead of paying full price for every title, you can rent a game for 30 or 60 days, or
            buy it permanently. Choose a primary account to play on your own profile, or a secondary
            account at a lower price. We explain the difference clearly before you order, so there
            are no surprises.
          </p>
          <p>
            Every order is handled by a real person. Tell us the game or plan you want, and we'll
            confirm availability, price and delivery time on chat within minutes.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="whatsapp">
            <a
              href={whatsappLink(contact.whatsapp, HELP_MESSAGE)}
              target="_blank"
              rel="noreferrer noopener"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              Chat on WhatsApp
            </a>
          </Button>
          <Button asChild variant="glass">
            <a href={instagramUrl(contact.instagram)} target="_blank" rel="noreferrer noopener">
              <Instagram className="h-4 w-4" aria-hidden />@{contact.instagram}
            </a>
          </Button>
          <Button asChild variant="blue">
            <Link to="/games">Browse the catalogue</Link>
          </Button>
        </div>
      </div>

      <h2 className="mt-12 mb-4 font-display text-xl font-bold uppercase">What we offer</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s) => (
          <article key={s.title} className="glass hover-lift rounded-3xl p-5">
            <span className="glass grid h-11 w-11 place-items-center rounded-2xl text-lag-red">
              <s.icon className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-4 font-display text-base font-bold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </article>
        ))}
      </div>

      <h2 className="mt-12 mb-4 font-display text-xl font-bold uppercase">Why gamers trust LAG</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {VALUES.map((v) => (
          <article key={v.title} className="glass rounded-3xl p-5">
            <span className="glass grid h-11 w-11 place-items-center rounded-2xl text-lag-blue">
              <v.icon className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-4 font-display text-base font-bold">{v.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
          </article>
        ))}
      </div>

      <div className="glass-strong mt-12 grid gap-4 rounded-3xl p-5 sm:grid-cols-2 sm:p-7">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold uppercase">Business details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <dt className="text-muted-foreground">WhatsApp</dt>
              <dd className="font-semibold break-words">{contact.whatsapp_display}</dd>
            </div>
            <div className="flex flex-wrap gap-2">
              <dt className="text-muted-foreground">Instagram</dt>
              <dd className="font-semibold break-words">@{contact.instagram}</dd>
            </div>
            <div className="flex flex-wrap gap-2">
              <dt className="text-muted-foreground">Platforms</dt>
              <dd className="font-semibold">PS4 · PS5</dd>
            </div>
            <div className="flex flex-wrap gap-2">
              <dt className="text-muted-foreground">Support hours</dt>
              <dd className="font-semibold">10:00 AM – 11:00 PM IST, all days</dd>
            </div>
          </dl>
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold uppercase">Get started</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            New here? Read how renting works, then pick your game and send us a message. Orders are
            confirmed on WhatsApp — no online checkout needed.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild variant="glass" size="sm">
              <Link to="/how-it-works">How it works</Link>
            </Button>
            <Button asChild variant="glass" size="sm">
              <Link to="/contact">Contact us</Link>
            </Button>
            <Button asChild variant="glass" size="sm">
              <Link to="/reviews">Reviews</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
