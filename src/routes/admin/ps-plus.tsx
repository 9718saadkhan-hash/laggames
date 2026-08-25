import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Crown } from "lucide-react";
import { toast } from "sonner";

import { AdminGate, AdminShell } from "@/components/lag/AdminShell";
import { SectionHeading, EmptyState, Badge } from "@/components/lag/ui-bits";
import { supabase } from "@/integrations/supabase/client";
import { psPlusQuery } from "@/lib/queries";
import { money, type PsPlusPlan } from "@/lib/lag";
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

export const Route = createFileRoute("/admin/ps-plus")({
  head: () => ({
    meta: [
      { title: "Manage PS Plus Plans — LAG Admin" },
      { name: "description", content: "Add, edit and manage PS Plus subscription plans." },
      { property: "og:title", content: "Manage PS Plus Plans — LAG Admin" },
      { property: "og:description", content: "Add, edit and manage PS Plus subscription plans." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPsPlusPage,
});

type F = {
  id?: string; name: string; tier: string; duration: string; region: string; platform: string;
  price: string; old_price: string; description: string; features: string; image_url: string;
  availability: string; visible: boolean; display_order: string;
};
const EMPTY: F = { name: "", tier: "", duration: "", region: "", platform: "", price: "", old_price: "", description: "", features: "", image_url: "", availability: "In Stock", visible: true, display_order: "0" };

function toForm(p: PsPlusPlan): F {
  return { id: p.id, name: p.name, tier: p.tier, duration: p.duration, region: p.region, platform: p.platform, price: p.price?.toString() ?? "", old_price: p.old_price?.toString() ?? "", description: p.description ?? "", features: (p.features ?? []).join("\n"), image_url: p.image_url ?? "", availability: p.availability, visible: p.visible, display_order: p.display_order?.toString() ?? "0" };
}
function toPayload(f: F) {
  if (!f.name.trim()) throw new Error("Name is required.");
  const num = (v: string) => (v.trim() === "" ? null : Number(v));
  return {
    name: f.name.trim(), tier: f.tier, duration: f.duration, region: f.region, platform: f.platform,
    price: num(f.price), old_price: num(f.old_price), description: f.description || null,
    features: f.features.split("\n").map((s) => s.trim()).filter(Boolean),
    image_url: f.image_url || null, availability: f.availability || "In Stock", visible: f.visible,
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
        toast.success("Product updated successfully.");
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
    if (error) toast.error(error.message); else invalidate();
  }
  async function handleDelete(id: string) {
    const { error } = await supabase.from("ps_plus_plans").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Plan deleted."); invalidate(); }
  }

  return (
    <AdminGate>
      <AdminShell>
        <SectionHeading eyebrow="Subscriptions" title="Manage PS Plus Plans" subtitle="Configure PlayStation Plus tiers and pricing."
          action={<Button variant="hero" onClick={() => { setEditingId(null); setForm(EMPTY); setOpen(true); }}><Plus className="h-4 w-4" /> Add Plan</Button>} />

        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : plans.length === 0 ? (
          <EmptyState icon={Crown} title="No PS Plus plans" body="Add your first plan." />
        ) : (
          <div className="grid gap-3">
            {plans.map((p) => (
              <div key={p.id} className="glass flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-bold">{p.name}</h3>
                    <Badge tone="blue">{p.tier}</Badge>
                    <Badge tone="neutral">{p.duration}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{money(p.price)} {p.old_price ? <span className="line-through">{money(p.old_price)}</span> : null} · {p.region} · {p.platform}</p>
                  <label className="mt-2 flex items-center gap-1.5 text-xs">
                    <Switch checked={p.visible} onCheckedChange={() => toggleVisible(p)} /> Visible
                  </label>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="glass" size="sm" onClick={() => { setEditingId(p.id); setForm(toForm(p)); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="glass" size="sm"><Trash2 className="h-4 w-4 text-lag-red" /></Button></AlertDialogTrigger>
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
              <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Tier</Label><Input value={form.tier} onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Duration</Label><Input value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Region</Label><Input value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Platform</Label><Input value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Price</Label><Input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Old Price</Label><Input type="number" value={form.old_price} onChange={(e) => setForm((f) => ({ ...f, old_price: e.target.value }))} /></div>
              </div>
              <div className="space-y-1.5"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Features (one per line)</Label><Textarea rows={4} value={form.features} onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Availability</Label><Input value={form.availability} onChange={(e) => setForm((f) => ({ ...f, availability: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Display Order</Label><Input type="number" value={form.display_order} onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))} /></div>
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
