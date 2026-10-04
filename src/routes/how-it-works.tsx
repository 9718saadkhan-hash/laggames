import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard, Gamepad2, MessageCircle, ShieldCheck, Sparkles, Timer } from "lucide-react";

import { Badge, GlassIcon, Reveal, SectionHeading } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { buildOrderMessage, whatsappLink } from "@/lib/lag";
import { contactFrom, settingsQuery } from "@/lib/queries";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — Ordering on WhatsApp | LAG LIVE AS GAMERS" },
      {
        name: "description",
        content:
          "Learn how LAG works: pick your game or subscription, message us on WhatsApp, pay securely and start playing the same day.",
      },
      { property: "og:title", content: "How It Works — LAG LIVE AS GAMERS" },
      {
        property: "og:description",
        content: "Three simple steps from browsing to playing, plus answers to the questions gamers ask most.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://thelaggames.com/how-it-works" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://thelaggames.com/how-it-works" }],
  }),
  component: HowItWorksPage,
});

const FAQ = [
  {
    q: "What is the difference between primary and secondary accounts?",
    a: "On a primary account the game works offline on your console for any user profile. On a secondary account you need to stay online while playing, but it is usually cheaper.",
  },
  {
    q: "How long does delivery take?",
    a: "Most orders are delivered within 10–30 minutes on WhatsApp. During peak hours it can take a little longer, and we keep you updated.",
  },
  {
    q: "What does a 30 or 60 day rental mean?",
    a: "You get full access to the game for that period. When it ends you can renew, switch to another title, or upgrade to permanent access.",
  },
  {
    q: "Is it safe for my PlayStation account?",
    a: "Yes. We share clear step-by-step instructions and only use genuine accounts. Never share your own password with anyone.",
  },
  {
    q: "Which payment methods do you accept?",
    a: "UPI and popular Indian payment apps. Payment details are shared on WhatsApp once availability is confirmed.",
  },
  {
    q: "Do you offer refunds?",
    a: "If a game or subscription cannot be delivered, you get a full refund. See our policies page for details.",
  },
];

function HowItWorksPage() {
  const { data: settings } = useQuery(settingsQuery);
  const contact = contactFrom(settings);
  const how = (settings?.["how_it_works"] ?? {}) as {
    steps?: { title: string; body: string }[];
    primary_text?: string;
    secondary_text?: string;
  };

  const steps = how.steps ?? [
    { title: "Pick your game or plan", body: "Browse the catalog and choose your platform, account type and duration." },
    { title: "Message us on WhatsApp", body: "Tap the order button — your product details are pre-filled for you." },
    { title: "Pay & play the same day", body: "Confirm payment and receive your access details with full instructions." },
  ];

  const link = whatsappLink(
    contact.whatsapp,
    buildOrderMessage({ productType: "general", productName: "I have a question about how LAG works." }, contact.brand),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <SectionHeading
        eyebrow="How it works"
        title="From browsing to playing in three steps"
        subtitle="No checkout, no card forms — every LAG order is completed with a real person on WhatsApp."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {steps.map((s, i) => (
          <Reveal key={s.title} delay={i * 90}>
            <div className="glass hover-lift h-full rounded-3xl p-6">
              <span className="font-display text-4xl font-bold text-gradient-lag">{i + 1}</span>
              <h2 className="mt-3 font-display text-base font-bold">{s.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="glass rounded-3xl p-6">
          <Badge tone="red">PRIMARY</Badge>
          <h2 className="mt-3 font-display text-lg font-bold">Primary account</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {how.primary_text ??
              "Play on your personal PlayStation account with your own trophies and saved progress."}
          </p>
        </div>
        <div className="glass rounded-3xl p-6">
          <Badge tone="blue">SECONDARY</Badge>
          <h2 className="mt-3 font-display text-lg font-bold">Secondary account</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {how.secondary_text ??
              "Play using an account provided by LAG LIVE AS GAMERS at a more affordable price."}
          </p>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="whatsapp" size="lg">
          <a href={link} target="_blank" rel="noreferrer noopener">
            <MessageCircle className="h-4 w-4" aria-hidden />
            Order on WhatsApp
          </a>
        </Button>
        <Button asChild variant="glass" size="lg">
          <Link to="/games">Browse games</Link>
        </Button>
      </div>


      <section className="mt-14">
        <h2 className="font-display text-2xl font-bold">What you get with every order</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            { icon: Timer, title: "Fast delivery", body: "Usually within 10–30 minutes of payment." },
            { icon: ShieldCheck, title: "Safe & genuine", body: "Real accounts with clear setup instructions." },
            { icon: CreditCard, title: "Simple payments", body: "UPI and popular payment apps accepted." },
            { icon: Sparkles, title: "After-sale support", body: "We stay available if anything needs fixing." },
          ].map((f, i) => (
            <div key={f.title} className="glass flex gap-4 rounded-3xl p-5">
              <GlassIcon icon={f.icon} tone={i % 2 ? "blue" : "red"} size="lg" />
              <div className="min-w-0">
                <h3 className="font-display text-base font-bold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-2xl font-bold">Frequently asked questions</h2>
        <Accordion type="single" collapsible className="glass mt-5 rounded-3xl px-5">
          {FAQ.map((f, i) => (
            <AccordionItem key={f.q} value={`item-${i}`}>
              <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="glass-strong mt-14 flex flex-col items-center rounded-3xl px-6 py-12 text-center">
        <GlassIcon icon={Gamepad2} tone="red" size="lg" />
        <h2 className="mt-4 font-display text-2xl font-bold">Ready to play?</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Message us on WhatsApp at {contact.whatsapp_display} and we&apos;ll help you pick the right plan.
        </p>
        <Button asChild variant="whatsapp" size="lg" className="mt-5">
          <a href={link} target="_blank" rel="noreferrer noopener">
            <MessageCircle className="h-4 w-4" aria-hidden />
            Chat with LAG
          </a>
        </Button>
      </section>
    </div>
  );
}
