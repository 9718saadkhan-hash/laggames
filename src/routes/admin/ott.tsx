import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Clapperboard } from "lucide-react";
import { toast } from "sonner";

import { AdminGate, AdminShell } from "@/components/lag/AdminShell";
import { ImagePositionField } from "@/components/lag/ImagePositionField";
import { ImageUploadField } from "@/components/lag/ImageUploadField";
import { SectionHeading, EmptyState, Badge } from "@/components/lag/ui-bits";
import { supabase } from "@/integrations/supabase/client";
import { ottQuery } from "@/lib/queries";
import { money, type OttPlan } from "@/lib/lag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle as ADTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/ott")({
  head: () => ({
    meta: [
      { title: "Manage OTT Plans — LAG Admin" },
      { name: "description", content: "Add, edit and manage OTT streaming subscription plans." },
      { property: "og:title", content: "Manage OTT Plans — LAG Admin" },
      { property: "og:description", content: "Add, edit and manage OTT streaming subscription plans." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminOttPage,
});

type F = {
  id?: string; name: string; logo_url: string; image_position: string; plan: string; duration: string; quality: string;
  screens: string; price: string; old_price: string; description: string; availability: string;
  visible: boolean; display_order: string;
};
const EMPTY: F = { name: "", logo_url: "", image_position: "50% 50%", plan: "", duration: "", quality: "", screens: "", price: "", old_price: "", description: "", availability: "In Stock", visible: true, display_order: "0" };

function toForm(p: OttPlan): F {
  return {
    id: p.id, name: p.name, logo_url: p.logo_url ?? "", image_position: p.image_position ?? "50% 50%",
    plan: p.plan, duration: p.duration,
    quality: p.quality ?? "", screens: p.screens ?? "", price: p.price?.toString() ?? "",
    old_price: p.old_price?.toString() ?? "", description: p.description ?? "",
    availability: p.availability, visible: p.visible, display_order: p.display_order?.toString() ?? "0",
  };
}
function toPayload(f: F) {
  if (!f.name.trim()) throw new Error("Name is required.");
  const num = (v: string) => (v.trim() === "" ? null : Number(v));
  return {
    name: f.name.trim(), logo_url: f.logo_url || null, image_position: f.image_position || "50% 50%",
    plan: f.plan, duration: f.duration,
    quality: f.quality || null, screens: f.screens || null, price: num(f.price), old_price: num(f.old_price),
    description: f.description || null, availability: f.availability || "In Stock", visible: f.visible,
    display_order: num(f.display_order) ?? 0,
  };
}

function AdminOttPage() {
  const { data: plans = [], isLoading, isError } = useQuery(ottQuery);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<F>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["ott_plans"] });

  async function handleSave() {
    setSaving(true);
    try {
      const payload = toPayload(form);
      if (editingId) {
        const { error } = await supabase.from("ott_plans").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Plan updated successfully.");
      } else {
        const { error } = await supabase.from("ott_plans").insert(payload);
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

  async function toggleVisible(p: OttPlan) {
    const { error } = await supabase.from("ott_plans").update({ visible: !p.visible }).eq("id", p.id);
    if (error) toast.error(error.message); else invalidate();
  }
  async function handleDelete(id: string) {
    const { error } = await supabase.from("ott_plans").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Plan deleted."); invalidate(); }
  }

  return (
    <AdminGate>
      <AdminShell>
        <SectionHeading eyebrow="Subscriptions" title="Manage OTT Plans" subtitle="Configure streaming plans, pricing and availability."
          action={<Button variant="hero" onClick={() => { setEditingId(null); setForm(EMPTY); setOpen(true); }}><Plus className="h-4 w-4" /> Add Plan</Button>} />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading plans…</p>
        ) : isError ? (
          <p className="text-sm text-lag-red">Failed to load OTT plans.</p>
        ) : plans.length === 0 ? (
          <EmptyState icon={Clapperboard} title="No OTT plans" body="Add your first streaming plan." />
        ) : (
          <div className="grid gap-3">
            {plans.map((p) => (
              <div key={p.id} className="glass flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
                {p.logo_url ? (
                  <img src={p.logo_url} alt={p.name} className="h-14 w-14 shrink-0 rounded-xl bg-surface-2 object-cover" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-bold">{p.name}</h3>
                    <Badge tone="blue">{p.plan}</Badge>
                    <Badge tone="neutral">{p.duration}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {money(p.price)} {p.old_price ? <span className="line-through">{money(p.old_price)}</span> : null} · {p.quality ?? "—"} · {p.screens ?? "—"} screens
                  </p>
                  <label className="mt-2 flex items-center gap-1.5 text-xs">
                    <Switch checked={p.visible} onCheckedChange={() => toggleVisible(p)} /> Visible
                  </label>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="glass" size="sm" onClick={() => { setEditingId(p.id); setForm(toForm(p)); setOpen(true); }} aria-label={`Edit ${p.name}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="glass" size="sm" aria-label={`Delete ${p.name}`}><Trash2 className="h-4 w-4 text-lag-red" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><ADTitle>Delete "{p.name}"?</ADTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(p.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? "Edit Plan" : "Add Plan"}</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-1.5"><Label htmlFor="o-name">Name</Label><Input id="o-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-1.5">
                <Label>Logo / image</Label>
                <ImageUploadField
                  value={form.logo_url}
                  onChange={(v) => setForm((f) => ({ ...f, logo_url: v ?? "" }))}
                  purpose="ott"
                  label="Upload from device"
                  mediaFolder="ott"
                />
              </div>
              <ImagePositionField
                value={form.image_position}
                onChange={(v) => setForm((f) => ({ ...f, image_position: v }))}
                label="Image focal position"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="o-plan">Plan</Label><Input id="o-plan" value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label htmlFor="o-duration">Duration</Label><Input id="o-duration" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label htmlFor="o-quality">Quality</Label><Input id="o-quality" value={form.quality} onChange={(e) => setForm((f) => ({ ...f, quality: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label htmlFor="o-screens">Screens</Label><Input id="o-screens" value={form.screens} onChange={(e) => setForm((f) => ({ ...f, screens: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label htmlFor="o-price">Price</Label><Input id="o-price" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label htmlFor="o-old">Old Price</Label><Input id="o-old" type="number" value={form.old_price} onChange={(e) => setForm((f) => ({ ...f, old_price: e.target.value }))} /></div>
              </div>
              <div className="space-y-1.5"><Label htmlFor="o-desc">Description</Label><Textarea id="o-desc" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="o-avail">Availability</Label><Input id="o-avail" value={form.availability} onChange={(e) => setForm((f) => ({ ...f, availability: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label htmlFor="o-order">Display Order</Label><Input id="o-order" type="number" value={form.display_order} onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold"><Switch checked={form.visible} onCheckedChange={(v) => setForm((f) => ({ ...f, visible: v }))} /> Visible</label>
            </div>
            <DialogFooter>
              <Button variant="glass" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="hero" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AdminShell>
    </AdminGate>
  );
}
