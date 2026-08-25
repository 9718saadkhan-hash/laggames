import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Lock, RefreshCcw } from "lucide-react";

import { GlassIcon, SectionHeading } from "@/components/lag/ui-bits";
import { settingsQuery } from "@/lib/queries";

export const Route = createFileRoute("/policies")({
  head: () => ({
    meta: [
      { title: "Terms, Privacy & Refund Policy — LAG LIVE AS GAMERS" },
      {
        name: "description",
        content:
          "Read the LAG LIVE AS GAMERS terms of service, privacy policy and refund policy for game rentals and subscriptions.",
      },
      { property: "og:title", content: "Policies — LAG LIVE AS GAMERS" },
      {
        property: "og:description",
        content: "How we handle your orders, your data and refunds at LAG LIVE AS GAMERS.",
      },
    ],
  }),
  component: PoliciesPage,
});

function PoliciesPage() {
  const { data: settings } = useQuery(settingsQuery);
  const policies = (settings?.["policies"] ?? {}) as {
    terms?: string;
    privacy?: string;
    refund?: string;
  };

  const sections = [
    {
      id: "terms",
      icon: FileText,
      title: "Terms of service",
      body:
        policies.terms ??
        "By ordering from LAG you agree to use the account details we share only as instructed. Sharing, reselling or changing account credentials ends your access without refund.",
    },
    {
      id: "privacy",
      icon: Lock,
      title: "Privacy policy",
      body:
        policies.privacy ??
        "We store only what we need to fulfil your order: your name, contact details and order history. We never sell your data, and you can ask us to delete your account any time.",
    },
    {
      id: "refund",
      icon: RefreshCcw,
      title: "Refund policy",
      body:
        policies.refund ??
        "If we cannot deliver a game or subscription you paid for, you get a full refund. Refunds are not available once access has been delivered and used as described.",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <SectionHeading
        eyebrow="Legal"
        title="Policies"
        subtitle="Straightforward terms, written for gamers rather than lawyers."
      />

      <nav aria-label="Policy sections" className="glass mb-8 flex flex-wrap gap-2 rounded-2xl p-3">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full border border-border px-4 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            {s.title}
          </a>
        ))}
      </nav>

      <div className="space-y-6">
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="glass scroll-mt-28 rounded-3xl p-6">
            <div className="flex items-center gap-3">
              <GlassIcon icon={s.icon} tone="blue" />
              <h2 className="font-display text-xl font-bold">{s.title}</h2>
            </div>
            <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
