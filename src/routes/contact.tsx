import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Instagram, MessageCircle, Send, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { GlassIcon, SectionHeading } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { buildOrderMessage, instagramUrl, whatsappLink } from "@/lib/lag";
import { contactFrom, settingsQuery } from "@/lib/queries";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact LAG LIVE AS GAMERS — WhatsApp & Instagram" },
      {
        name: "description",
        content:
          "Reach the LAG team on WhatsApp or Instagram, or send a message through the contact form. We reply fast.",
      },
      { property: "og:title", content: "Contact LAG LIVE AS GAMERS" },
      {
        property: "og:description",
        content: "Questions about games, PS Plus or OTT plans? Talk to a real gamer on WhatsApp.",
      },
    ],
  }),
  component: ContactPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(60, "Name is too long"),
  email: z.string().trim().email("Enter a valid email").max(255).or(z.literal("")),
  phone: z.string().trim().max(20, "Phone number is too long"),
  message: z.string().trim().min(10, "Tell us a little more").max(1000, "Keep it under 1000 characters"),
});

function ContactPage() {
  const { data: settings } = useQuery(settingsQuery);
  const contact = contactFrom(settings);

  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const send = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) {
        const map: Record<string, string> = {};
        for (const issue of parsed.error.issues) map[String(issue.path[0])] = issue.message;
        setErrors(map);
        throw new Error("invalid");
      }
      setErrors({});
      const { error } = await supabase.from("contact_messages").insert({
        name: parsed.data.name,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        message: parsed.data.message,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Message sent. We'll get back to you soon.");
      setForm({ name: "", email: "", phone: "", message: "" });
    },
    onError: (e) => {
      if (e.message !== "invalid") toast.error(e.message);
    },
  });

  const waLink = whatsappLink(
    contact.whatsapp,
    buildOrderMessage({ productType: "general", productName: "Hi! I have a question." }, contact.brand),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <SectionHeading
        eyebrow="Contact"
        title="Talk to the LAG team"
        subtitle="WhatsApp is the fastest way to reach us — usually a reply within minutes."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer noopener"
            className="glass hover-lift flex items-center gap-4 rounded-3xl p-5"
          >
            <GlassIcon icon={MessageCircle} tone="red" size="lg" />
            <div className="min-w-0">
              <p className="font-display font-bold">WhatsApp</p>
              <p className="truncate text-sm text-muted-foreground">{contact.whatsapp_display}</p>
            </div>
          </a>
          <a
            href={instagramUrl(contact.instagram)}
            target="_blank"
            rel="noreferrer noopener"
            className="glass hover-lift flex items-center gap-4 rounded-3xl p-5"
          >
            <GlassIcon icon={Instagram} tone="blue" size="lg" />
            <div className="min-w-0">
              <p className="font-display font-bold">Instagram</p>
              <p className="truncate text-sm text-muted-foreground">@{contact.instagram}</p>
            </div>
          </a>
          <a
            href={contact.whatsapp_group}
            target="_blank"
            rel="noreferrer noopener"
            className="glass hover-lift flex items-center gap-4 rounded-3xl p-5"
          >
            <GlassIcon icon={Users} tone="red" size="lg" />
            <div className="min-w-0">
              <p className="font-display font-bold">WhatsApp community</p>
              <p className="truncate text-sm text-muted-foreground">Deals, drops and giveaways</p>
            </div>
          </a>
        </div>

        <form
          className="glass-strong rounded-3xl p-5 sm:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            send.mutate();
          }}
        >
          <h2 className="font-display text-lg font-bold">Send a message</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="c-name">Name</Label>
              <Input
                id="c-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                maxLength={60}
                aria-invalid={Boolean(errors["name"])}
                className="mt-1.5"
              />
              {errors["name"] && <p className="mt-1 text-xs text-destructive">{errors["name"]}</p>}
            </div>
            <div>
              <Label htmlFor="c-phone">Phone (optional)</Label>
              <Input
                id="c-phone"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                maxLength={20}
                className="mt-1.5"
              />
              {errors["phone"] && <p className="mt-1 text-xs text-destructive">{errors["phone"]}</p>}
            </div>
          </div>
          <div className="mt-4">
            <Label htmlFor="c-email">Email (optional)</Label>
            <Input
              id="c-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              maxLength={255}
              aria-invalid={Boolean(errors["email"])}
              className="mt-1.5"
            />
            {errors["email"] && <p className="mt-1 text-xs text-destructive">{errors["email"]}</p>}
          </div>
          <div className="mt-4">
            <Label htmlFor="c-message">Message</Label>
            <Textarea
              id="c-message"
              rows={6}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              maxLength={1000}
              placeholder="What can we help you with?"
              aria-invalid={Boolean(errors["message"])}
              className="mt-1.5"
            />
            {errors["message"] && <p className="mt-1 text-xs text-destructive">{errors["message"]}</p>}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="submit" variant="hero" disabled={send.isPending}>
              <Send className="h-4 w-4" aria-hidden />
              {send.isPending ? "Sending…" : "Send message"}
            </Button>
            <Button asChild variant="whatsapp">
              <a href={waLink} target="_blank" rel="noreferrer noopener">
                <MessageCircle className="h-4 w-4" aria-hidden />
                WhatsApp instead
              </a>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
