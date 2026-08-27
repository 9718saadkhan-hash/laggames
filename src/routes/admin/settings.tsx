import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminGate, AdminShell } from "@/components/lag/AdminShell";
import { SectionHeading } from "@/components/lag/ui-bits";
import { supabase } from "@/integrations/supabase/client";
import { settingsQuery } from "@/lib/queries";
import { DEFAULT_CONTACT, type ContactSettings } from "@/lib/lag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Site Settings — LAG Admin" },
      { name: "description", content: "Manage contact info, policies and footer content." },
      { property: "og:title", content: "Site Settings — LAG Admin" },
      { property: "og:description", content: "Manage contact info, policies and footer content." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSettingsPage,
});

type Policies = { terms: string; privacy: string; refund: string };
const DEFAULT_POLICIES: Policies = { terms: "", privacy: "", refund: "" };

type Footer = { note: string };
const DEFAULT_FOOTER: Footer = { note: "" };

function ContactSection({ initial }: { initial: ContactSettings }) {
  const qc = useQueryClient();
  const [value, setValue] = useState<ContactSettings>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => setValue(initial), [initial]);

  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase.from("site_settings").upsert({ key: "contact", value });
      if (error) throw error;
      toast.success("Contact info updated successfully.");
      qc.invalidateQueries({ queryKey: ["site_settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="glass border-0">
      <CardHeader><CardTitle className="font-display">Contact Info</CardTitle></CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="c-brand">Brand</Label><Input id="c-brand" value={value.brand} onChange={(e) => setValue((v) => ({ ...v, brand: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label htmlFor="c-tagline">Tagline</Label><Input id="c-tagline" value={value.tagline} onChange={(e) => setValue((v) => ({ ...v, tagline: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label htmlFor="c-wa">WhatsApp Number</Label><Input id="c-wa" value={value.whatsapp} onChange={(e) => setValue((v) => ({ ...v, whatsapp: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label htmlFor="c-wa-display">WhatsApp Display</Label><Input id="c-wa-display" value={value.whatsapp_display} onChange={(e) => setValue((v) => ({ ...v, whatsapp_display: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label htmlFor="c-insta">Instagram Handle</Label><Input id="c-insta" value={value.instagram} onChange={(e) => setValue((v) => ({ ...v, instagram: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label htmlFor="c-wa-group">WhatsApp Group Link</Label><Input id="c-wa-group" value={value.whatsapp_group} onChange={(e) => setValue((v) => ({ ...v, whatsapp_group: e.target.value }))} /></div>
        </div>
        <Button variant="hero" className="w-max" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Contact Info"}</Button>
      </CardContent>
    </Card>
  );
}

function PoliciesSection({ initial }: { initial: Policies }) {
  const qc = useQueryClient();
  const [value, setValue] = useState<Policies>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => setValue(initial), [initial]);

  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase.from("site_settings").upsert({ key: "policies", value });
      if (error) throw error;
      toast.success("Policies updated successfully.");
      qc.invalidateQueries({ queryKey: ["site_settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="glass border-0">
      <CardHeader><CardTitle className="font-display">Policies</CardTitle></CardHeader>
      <CardContent className="grid gap-3">
        <div className="space-y-1.5"><Label htmlFor="p-terms">Terms of Service</Label><Textarea id="p-terms" rows={5} value={value.terms} onChange={(e) => setValue((v) => ({ ...v, terms: e.target.value }))} /></div>
        <div className="space-y-1.5"><Label htmlFor="p-privacy">Privacy Policy</Label><Textarea id="p-privacy" rows={5} value={value.privacy} onChange={(e) => setValue((v) => ({ ...v, privacy: e.target.value }))} /></div>
        <div className="space-y-1.5"><Label htmlFor="p-refund">Refund Policy</Label><Textarea id="p-refund" rows={5} value={value.refund} onChange={(e) => setValue((v) => ({ ...v, refund: e.target.value }))} /></div>
        <Button variant="hero" className="w-max" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Policies"}</Button>
      </CardContent>
    </Card>
  );
}

function FooterSection({ initial }: { initial: Footer }) {
  const qc = useQueryClient();
  const [value, setValue] = useState<Footer>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => setValue(initial), [initial]);

  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase.from("site_settings").upsert({ key: "footer", value });
      if (error) throw error;
      toast.success("Footer updated successfully.");
      qc.invalidateQueries({ queryKey: ["site_settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="glass border-0">
      <CardHeader><CardTitle className="font-display">Footer</CardTitle></CardHeader>
      <CardContent className="grid gap-3">
        <div className="space-y-1.5"><Label htmlFor="f-note">Footer Note</Label><Textarea id="f-note" rows={3} value={value.note} onChange={(e) => setValue((v) => ({ ...v, note: e.target.value }))} /></div>
        <Button variant="hero" className="w-max" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Footer"}</Button>
      </CardContent>
    </Card>
  );
}

function AdminSettingsPage() {
  const { data: settings, isLoading, isError } = useQuery(settingsQuery);

  const contact = { ...DEFAULT_CONTACT, ...((settings?.["contact"] as Partial<ContactSettings>) ?? {}) };
  const policies = { ...DEFAULT_POLICIES, ...((settings?.["policies"] as Partial<Policies>) ?? {}) };
  const footer = { ...DEFAULT_FOOTER, ...((settings?.["footer"] as Partial<Footer>) ?? {}) };

  return (
    <AdminGate>
      <AdminShell>
        <SectionHeading eyebrow="Configuration" title="Site Settings" subtitle="Manage contact details, policies and footer content." />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading settings…</p>
        ) : isError ? (
          <p className="text-sm text-lag-red">Failed to load settings.</p>
        ) : (
          <div className="grid gap-5">
            <ContactSection initial={contact} />
            <PoliciesSection initial={policies} />
            <FooterSection initial={footer} />
          </div>
        )}
      </AdminShell>
    </AdminGate>
  );
}
