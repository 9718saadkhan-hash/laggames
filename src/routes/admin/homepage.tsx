import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Home, X } from "lucide-react";
import { toast } from "sonner";

import { AdminGate, AdminShell } from "@/components/lag/AdminShell";
import { ImagePositionField } from "@/components/lag/ImagePositionField";
import { ImageUploadField } from "@/components/lag/ImageUploadField";
import { SectionHeading, EmptyState, Badge } from "@/components/lag/ui-bits";
import { supabase } from "@/integrations/supabase/client";
import { heroQuery, settingsQuery } from "@/lib/queries";
import { money, formatDate, type HeroBanner } from "@/lib/lag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle as ADTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/homepage")({
  head: () => ({
    meta: [
      { title: "Manage Homepage — LAG Admin" },
      { name: "description", content: "Edit hero banners and homepage content sections." },
      { property: "og:title", content: "Manage Homepage — LAG Admin" },
      { property: "og:description", content: "Edit hero banners and homepage content sections." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminHomepagePage,
});

// ---------- Hero banners ----------

type HF = {
  id?: string; title: string; subtitle: string; description: string; image_url: string; game_slug: string;
  platform: string; price_from: string; release_date: string; availability: string; cta_label: string;
  visible: boolean; display_order: string;
};
const EMPTY_HERO: HF = {
  title: "", subtitle: "", description: "", image_url: "", game_slug: "", platform: "", price_from: "",
  release_date: "", availability: "", cta_label: "Order Now", visible: true, display_order: "0",
};

function heroToForm(h: HeroBanner): HF {
  return {
    id: h.id, title: h.title, subtitle: h.subtitle ?? "", description: h.description ?? "",
    image_url: h.image_url ?? "", game_slug: h.game_slug ?? "", platform: h.platform ?? "",
    price_from: h.price_from?.toString() ?? "", release_date: h.release_date ?? "",
    availability: h.availability ?? "", cta_label: h.cta_label, visible: h.visible,
    display_order: h.display_order?.toString() ?? "0",
  };
}
function heroToPayload(f: HF) {
  if (!f.title.trim()) throw new Error("Title is required.");
  const num = (v: string) => (v.trim() === "" ? null : Number(v));
  return {
    title: f.title.trim(), subtitle: f.subtitle || null, description: f.description || null,
    image_url: f.image_url || null, game_slug: f.game_slug || null, platform: f.platform || null,
    price_from: num(f.price_from), release_date: f.release_date || null, availability: f.availability || null,
    cta_label: f.cta_label || "Order Now", visible: f.visible, display_order: num(f.display_order) ?? 0,
  };
}

function HeroBannersSection() {
  const { data: banners = [], isLoading, isError } = useQuery(heroQuery);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<HF>(EMPTY_HERO);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["hero_banners"] });

  async function handleSave() {
    setSaving(true);
    try {
      const payload = heroToPayload(form);
      if (editingId) {
        const { error } = await supabase.from("hero_banners").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Banner updated successfully.");
      } else {
        const { error } = await supabase.from("hero_banners").insert(payload);
        if (error) throw error;
        toast.success("Banner added successfully.");
      }
      invalidate();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }
  async function toggleVisible(h: HeroBanner) {
    const { error } = await supabase.from("hero_banners").update({ visible: !h.visible }).eq("id", h.id);
    if (error) toast.error(error.message); else invalidate();
  }
  async function handleDelete(id: string) {
    const { error } = await supabase.from("hero_banners").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Banner deleted."); invalidate(); }
  }

  return (
    <Card className="glass border-0">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="font-display">Hero Banners</CardTitle>
        <Button variant="hero" size="sm" onClick={() => { setEditingId(null); setForm(EMPTY_HERO); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Add Banner
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading banners…</p>
        ) : isError ? (
          <p className="text-sm text-lag-red">Failed to load banners.</p>
        ) : banners.length === 0 ? (
          <EmptyState icon={Home} title="No hero banners" body="Add your first homepage banner." />
        ) : (
          <div className="grid gap-3">
            {banners.map((h) => (
              <div key={h.id} className="glass flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
                {h.image_url ? (
                  <img src={h.image_url} alt={h.title} className="h-16 w-28 shrink-0 rounded-xl bg-surface-2 object-cover" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-bold">{h.title}</h3>
                    {h.platform && <Badge tone="blue">{h.platform}</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    From {money(h.price_from)} · {formatDate(h.release_date)} · {h.availability ?? "—"}
                  </p>
                  <label className="mt-2 flex items-center gap-1.5 text-xs">
                    <Switch checked={h.visible} onCheckedChange={() => toggleVisible(h)} /> Visible
                  </label>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="glass" size="sm" onClick={() => { setEditingId(h.id); setForm(heroToForm(h)); setOpen(true); }} aria-label={`Edit ${h.title}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="glass" size="sm" aria-label={`Delete ${h.title}`}><Trash2 className="h-4 w-4 text-lag-red" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><ADTitle>Delete "{h.title}"?</ADTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(h.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit Banner" : "Add Banner"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="h-title">Title</Label><Input id="h-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label htmlFor="h-subtitle">Subtitle</Label><Input id="h-subtitle" value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="h-desc">Description</Label><Textarea id="h-desc" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-1.5">
              <Label>Banner image</Label>
              <ImageUploadField
                value={form.image_url}
                onChange={(v) => setForm((f) => ({ ...f, image_url: v ?? "" }))}
                purpose="hero-banner"
                label="Upload from device"
                mediaFolder="banners"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="h-slug">Game Slug</Label><Input id="h-slug" value={form.game_slug} onChange={(e) => setForm((f) => ({ ...f, game_slug: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label htmlFor="h-platform">Platform</Label><Input id="h-platform" value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label htmlFor="h-price">Price From</Label><Input id="h-price" type="number" value={form.price_from} onChange={(e) => setForm((f) => ({ ...f, price_from: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label htmlFor="h-release">Release Date</Label><Input id="h-release" type="date" value={form.release_date} onChange={(e) => setForm((f) => ({ ...f, release_date: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label htmlFor="h-avail">Availability</Label><Input id="h-avail" value={form.availability} onChange={(e) => setForm((f) => ({ ...f, availability: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label htmlFor="h-cta">CTA Label</Label><Input id="h-cta" value={form.cta_label} onChange={(e) => setForm((f) => ({ ...f, cta_label: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label htmlFor="h-order">Display Order</Label><Input id="h-order" type="number" value={form.display_order} onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold"><Switch checked={form.visible} onCheckedChange={(v) => setForm((f) => ({ ...f, visible: v }))} /> Visible</label>
          </div>
          <DialogFooter>
            <Button variant="glass" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------- Comparison settings ----------

type ComparisonRow = { feature: string; lag: boolean; others: boolean };
type ComparisonValue = { title: string; rows: ComparisonRow[] };
const DEFAULT_COMPARISON: ComparisonValue = { title: "Why Choose LAG", rows: [] };

function ComparisonSection({ initial }: { initial: ComparisonValue }) {
  const qc = useQueryClient();
  const [value, setValue] = useState<ComparisonValue>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => setValue(initial), [initial]);

  function updateRow(i: number, patch: Partial<ComparisonRow>) {
    setValue((v) => ({ ...v, rows: v.rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) }));
  }
  function addRow() {
    setValue((v) => ({ ...v, rows: [...v.rows, { feature: "", lag: true, others: false }] }));
  }
  function removeRow(i: number) {
    setValue((v) => ({ ...v, rows: v.rows.filter((_, idx) => idx !== i) }));
  }

  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase.from("site_settings").upsert({ key: "comparison", value });
      if (error) throw error;
      toast.success("Comparison section updated successfully.");
      qc.invalidateQueries({ queryKey: ["site_settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="glass border-0">
      <CardHeader><CardTitle className="font-display">Comparison Table</CardTitle></CardHeader>
      <CardContent className="grid gap-3">
        <div className="space-y-1.5"><Label htmlFor="cmp-title">Title</Label><Input id="cmp-title" value={value.title} onChange={(e) => setValue((v) => ({ ...v, title: e.target.value }))} /></div>
        <div className="grid gap-2">
          {value.rows.map((r, i) => (
            <div key={i} className="glass flex flex-wrap items-center gap-3 rounded-xl p-3">
              <Input
                className="min-w-[10rem] flex-1"
                aria-label="Feature name"
                placeholder="Feature"
                value={r.feature}
                onChange={(e) => updateRow(i, { feature: e.target.value })}
              />
              <label className="flex items-center gap-1.5 text-xs font-semibold">
                <Switch checked={r.lag} onCheckedChange={(v) => updateRow(i, { lag: v })} /> LAG
              </label>
              <label className="flex items-center gap-1.5 text-xs font-semibold">
                <Switch checked={r.others} onCheckedChange={(v) => updateRow(i, { others: v })} /> Others
              </label>
              <Button variant="glass" size="sm" onClick={() => removeRow(i)} aria-label="Remove row">
                <X className="h-4 w-4 text-lag-red" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="glass" size="sm" className="w-max" onClick={addRow}><Plus className="h-4 w-4" /> Add Row</Button>
        <Button variant="hero" className="w-max" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Comparison"}</Button>
      </CardContent>
    </Card>
  );
}

// ---------- How it works settings ----------

type Step = { title: string; body: string };
type HowItWorksValue = { steps: Step[]; primary_text: string; secondary_text: string };
const DEFAULT_HOW: HowItWorksValue = {
  steps: [{ title: "", body: "" }, { title: "", body: "" }, { title: "", body: "" }],
  primary_text: "",
  secondary_text: "",
};

function HowItWorksSection({ initial }: { initial: HowItWorksValue }) {
  const qc = useQueryClient();
  const [value, setValue] = useState<HowItWorksValue>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => setValue(initial), [initial]);

  function updateStep(i: number, patch: Partial<Step>) {
    setValue((v) => ({ ...v, steps: v.steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));
  }

  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase.from("site_settings").upsert({ key: "how_it_works", value });
      if (error) throw error;
      toast.success("How It Works section updated successfully.");
      qc.invalidateQueries({ queryKey: ["site_settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="glass border-0">
      <CardHeader><CardTitle className="font-display">How It Works</CardTitle></CardHeader>
      <CardContent className="grid gap-3">
        {value.steps.map((s, i) => (
          <div key={i} className="grid gap-2 rounded-xl bg-surface-2 p-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`step-title-${i}`}>Step {i + 1} Title</Label>
              <Input id={`step-title-${i}`} value={s.title} onChange={(e) => updateStep(i, { title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`step-body-${i}`}>Step {i + 1} Body</Label>
              <Input id={`step-body-${i}`} value={s.body} onChange={(e) => updateStep(i, { body: e.target.value })} />
            </div>
          </div>
        ))}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="how-primary">Primary CTA Text</Label><Input id="how-primary" value={value.primary_text} onChange={(e) => setValue((v) => ({ ...v, primary_text: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label htmlFor="how-secondary">Secondary CTA Text</Label><Input id="how-secondary" value={value.secondary_text} onChange={(e) => setValue((v) => ({ ...v, secondary_text: e.target.value }))} /></div>
        </div>
        <Button variant="hero" className="w-max" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save How It Works"}</Button>
      </CardContent>
    </Card>
  );
}

// ---------- About settings ----------

type AboutValue = { heading: string; body: string };
const DEFAULT_ABOUT: AboutValue = { heading: "", body: "" };

function AboutSection({ initial }: { initial: AboutValue }) {
  const qc = useQueryClient();
  const [value, setValue] = useState<AboutValue>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => setValue(initial), [initial]);

  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase.from("site_settings").upsert({ key: "about", value });
      if (error) throw error;
      toast.success("About section updated successfully.");
      qc.invalidateQueries({ queryKey: ["site_settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="glass border-0">
      <CardHeader><CardTitle className="font-display">About Section</CardTitle></CardHeader>
      <CardContent className="grid gap-3">
        <div className="space-y-1.5"><Label htmlFor="about-heading">Heading</Label><Input id="about-heading" value={value.heading} onChange={(e) => setValue((v) => ({ ...v, heading: e.target.value }))} /></div>
        <div className="space-y-1.5"><Label htmlFor="about-body">Body</Label><Textarea id="about-body" rows={4} value={value.body} onChange={(e) => setValue((v) => ({ ...v, body: e.target.value }))} /></div>
        <Button variant="hero" className="w-max" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save About"}</Button>
      </CardContent>
    </Card>
  );
}

// ---------- Category card images ----------

type CategoriesValue = {
  games_image: string;
  games_position: string;
  ps_plus_image: string;
  ps_plus_position: string;
  ott_image: string;
  ott_position: string;
};
const DEFAULT_CATEGORIES: CategoriesValue = {
  games_image: "",
  games_position: "50% 50%",
  ps_plus_image: "",
  ps_plus_position: "50% 50%",
  ott_image: "",
  ott_position: "50% 50%",
};

function CategoriesSection({ initial }: { initial: CategoriesValue }) {
  const qc = useQueryClient();
  const [value, setValue] = useState<CategoriesValue>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => setValue(initial), [initial]);

  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase.from("site_settings").upsert({ key: "categories", value });
      if (error) throw error;
      toast.success("Category images updated successfully.");
      qc.invalidateQueries({ queryKey: ["site_settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const cards: { label: string; imageKey: keyof CategoriesValue; posKey: keyof CategoriesValue }[] = [
    { label: "Games", imageKey: "games_image", posKey: "games_position" },
    { label: "PS Plus", imageKey: "ps_plus_image", posKey: "ps_plus_position" },
    { label: "OTT", imageKey: "ott_image", posKey: "ott_position" },
  ];

  return (
    <Card className="glass border-0">
      <CardHeader>
        <CardTitle className="font-display">Pick A Category Images</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        {cards.map((c) => (
          <div key={c.label} className="grid gap-3 border-b border-border/50 pb-5 last:border-0 last:pb-0">
            <Label>{c.label} card image</Label>
            <ImageUploadField
              value={value[c.imageKey] || null}
              onChange={(v) => setValue((s) => ({ ...s, [c.imageKey]: v ?? "" }))}
              purpose="hero-banner"
              label="Upload from device"
              mediaFolder="categories"
            />
            <ImagePositionField
              value={value[c.posKey]}
              onChange={(v) => setValue((s) => ({ ...s, [c.posKey]: v }))}
              preview={value[c.imageKey] || null}
              label={`${c.label} focal position`}
            />
          </div>
        ))}
        <Button variant="hero" className="w-max" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Category Images"}
        </Button>
      </CardContent>
    </Card>
  );
}

function AdminHomepagePage() {
  const { data: settings, isLoading } = useQuery(settingsQuery);

  const comparison = (settings?.["comparison"] as ComparisonValue | undefined) ?? DEFAULT_COMPARISON;
  const howItWorks = (settings?.["how_it_works"] as HowItWorksValue | undefined) ?? DEFAULT_HOW;
  const about = (settings?.["about"] as AboutValue | undefined) ?? DEFAULT_ABOUT;
  const categories = (settings?.["categories"] as CategoriesValue | undefined) ?? DEFAULT_CATEGORIES;

  return (
    <AdminGate>
      <AdminShell>
        <SectionHeading
          eyebrow="Content"
          title="Manage Homepage"
          subtitle="Control hero banners and homepage content sections."
        />

        <div className="grid gap-5">
          <HeroBannersSection />
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading content sections…</p>
          ) : (
            <>
              <ComparisonSection initial={comparison} />
              <HowItWorksSection initial={howItWorks} />
              <AboutSection initial={about} />
            </>
          )}
        </div>
      </AdminShell>
    </AdminGate>
  );
}
