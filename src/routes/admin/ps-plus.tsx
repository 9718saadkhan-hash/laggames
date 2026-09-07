import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Crown } from "lucide-react";
import { toast } from "sonner";

import { AdminGate, AdminShell } from "@/components/lag/AdminShell";
import { ImagePositionField } from "@/components/lag/ImagePositionField";
import { ImageUploadField } from "@/components/lag/ImageUploadField";
import { SectionHeading, EmptyState, Badge } from "@/components/lag/ui-bits";
import { supabase } from "@/integrations/supabase/client";
import { psPlusQuery } from "@/lib/queries";
import { PS_PLUS_TIERS, money, type PsPlusPlan } from "@/lib/lag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle as ADTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/ps-plus")({
  head: () => ({
    meta: [
      { title: "Manage PS Plus Plans — LAG Admin" },
      { name: "description", content: "Edit PS Plus Essential, Extra and Deluxe pricing, details and images." },
      { property: "og:title", content: "Manage PS Plus Plans — LAG Admin" },
      { property: "og:description", content: "Edit PS Plus Essential, Extra and Deluxe pricing, details and images." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPsPlusPage,
});

type F = {
  id?: string;
  name: string;
  tier: string;
  region: string;
  platform: string;
  price_1m: string;
  price_3m: string;
  price_12m: string;
  old_price: string;
  description: string;
  features: string;
  image_url: string | null;
  image_position: string;
  availability: string;
  visible: boolean;
  display_order: string;
};

const EMPTY: F = {
  name: "PS Plus Essential",
  tier: "Essential",
  region: "India",
  platform: "PS4 & PS5",
  price_1m: "",
  price_3m: "",
  price_12m: "",
  old_price: "",
  description: "",
  features: "",
  image_url: null,
  image_position: "50% 50%",
  availability: "In Stock",
  visible: true,
  display_order: "0",
};

function toForm(p: PsPlusPlan): F {
  return {
    id: p.id,
    name: p.name,
    tier: PS_PLUS_TIERS.find((t) => (p.tier || p.name).toLowerCase().includes(t.toLowerCase())) ?? "Essential",
    region: p.region,
    platform: p.platform,
    price_1m: p.price_1m?.toString() ?? p.price?.toString() ?? "",
    price_3m: p.price_3m?.toString() ?? "",
    price_12m: p.price_12m?.toString() ?? "",
    old_price: p.old_price?.toString() ?? "",
    description: p.description ?? "",
    features: (p.features ?? []).join("\n"),
    image_url: p.image_url ?? null,
    image_position: p.image_position ?? "50% 50%",
    availability: p.availability,
    visible: p.visible,
    display_order: p.display_order?.toString() ?? "0",
  };
}

function toPayload(f: F) {
  if (!f.name.trim()) throw new Error("Name is required.");
  const num = (v: string) => (v.trim() === "" ? null : Number(v));
  return {
    name: f.name.trim(),
    tier: f.tier,
    duration: "1 / 3 / 12 Months",
    region: f.region || "India",
    platform: f.platform || "PS4 & PS5",
    price: num(f.price_1m),
    price_1m: num(f.price_1m),
    price_3m: num(f.price_3m),
    price_12m: num(f.price_12m),
    old_price: num(f.old_price),
    description: f.description || null,
    features: f.features.split("\n").map((s) => s.trim()).filter(Boolean),
    image_url: f.image_url || null,
    image_position: f.image_position || "50% 50%",
    availability: f.availability || "In Stock",
    visible: f.visible,
    display_order: num(f.display_order) ?? 0,
  };
}

function AdminPsPlusPage() {
  const { data: plans = [], isLoading } = useQuery(psPlusQuery);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<F>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["ps_plus_plans"] });

  async function handleSave() {
    setSaving(true);
    try {
      const payload = toPayload(form);
      if (editingId) {
        const { error } = await supabase.from("ps_plus_plans").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Plan updated successfully.");
      } else {
        const { error } = await supabase.from("ps_plus_plans").insert(payload);
        if (error) throw error;
        toast.success("Plan added successfully.");
      }
      invalidate();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisible(p: PsPlusPlan) {
    const { error } = await supabase.from("ps_plus_plans").update({ visible: !p.visible }).eq("id", p.id);
    if (error) toast.error(error.message);
    else invalidate();
  }
  async function handleDelete(id: string) {
    const { error } = await supabase.from("ps_plus_plans").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Plan deleted.");
      invalidate();
    }
  }

  return (
    <AdminGate>
      <AdminShell>
        <SectionHeading
          eyebrow="Subscriptions"
          title="Manage PS Plus Plans"
          subtitle="Three categories only — Essential, Extra and Deluxe — each with 1, 3 and 12 month prices."
          action={
            <Button
              variant="hero"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add Plan
            </Button>
          }
        />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : plans.length === 0 ? (
          <EmptyState icon={Crown} title="No PS Plus plans" body="Add Essential, Extra and Deluxe." />
        ) : (
          <div className="grid gap-3">
            {plans.map((p) => (
              <div key={p.id} className="glass flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
                {p.image_url && (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    loading="lazy"
                    className="h-16 w-24 shrink-0 rounded-xl bg-surface-2 object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-bold">{p.name}</h3>
                    <Badge tone="blue">{p.tier}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    1M {money(p.price_1m ?? p.price)} · 3M {money(p.price_3m)} · 12M {money(p.price_12m)} · {p.region} · {p.platform}
                  </p>
                  <label className="mt-2 flex items-center gap-1.5 text-xs">
                    <Switch checked={p.visible} onCheckedChange={() => toggleVisible(p)} /> Visible
                  </label>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="glass"
                    size="sm"
                    aria-label={`Edit ${p.name}`}
                    onClick={() => {
                      setEditingId(p.id);
                      setForm(toForm(p));
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="glass" size="sm" aria-label={`Delete ${p.name}`}>
                        <Trash2 className="h-4 w-4 text-lag-red" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <ADTitle>Delete "{p.name}"?</ADTitle>
                        <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(p.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[88vh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Plan" : "Add Plan"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={form.tier}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, tier: v, name: `PS Plus ${v}` }))
                  }
                >
                  <SelectTrigger aria-label="Category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PS_PLUS_TIERS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Display name</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>1 Month price</Label>
                  <Input type="number" value={form.price_1m} onChange={(e) => setForm((f) => ({ ...f, price_1m: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>3 Months price</Label>
                  <Input type="number" value={form.price_3m} onChange={(e) => setForm((f) => ({ ...f, price_3m: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>12 Months price</Label>
                  <Input type="number" value={form.price_12m} onChange={(e) => setForm((f) => ({ ...f, price_12m: e.target.value }))} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Region</Label>
                  <Input value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Platform</Label>
                  <Input value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Old / strike-through price</Label>
                  <Input type="number" value={form.old_price} onChange={(e) => setForm((f) => ({ ...f, old_price: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Availability</Label>
                  <Input value={form.availability} onChange={(e) => setForm((f) => ({ ...f, availability: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Features (one per line)</Label>
                <Textarea rows={4} value={form.features} onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Card image</Label>
                <ImageUploadField
                  value={form.image_url}
                  onChange={(v) => setForm((f) => ({ ...f, image_url: v }))}
                  purpose="ps-plus"
                  label="Upload from device"
                  mediaFolder="ps-plus"
                />
              </div>
              <ImagePositionField
                value={form.image_position}
                onChange={(v) => setForm((f) => ({ ...f, image_position: v }))}
                label="Image focal position"
              />
              <div className="space-y-1.5">
                <Label>Display order</Label>
                <Input type="number" value={form.display_order} onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <Switch checked={form.visible} onCheckedChange={(v) => setForm((f) => ({ ...f, visible: v }))} /> Visible
              </label>
            </div>
            <DialogFooter>
              <Button variant="glass" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="hero" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AdminShell>
    </AdminGate>
  );
}
