import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, TicketPercent } from "lucide-react";
import { toast } from "sonner";

import { AdminGate, AdminShell } from "@/components/lag/AdminShell";
import { SectionHeading, EmptyState, Badge } from "@/components/lag/ui-bits";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/coupons")({
  head: () => ({
    meta: [
      { title: "Manage Coupons — LAG Admin" },
      { name: "description", content: "Create and manage customer coupon codes." },
      { property: "og:title", content: "Manage Coupons — LAG Admin" },
      { property: "og:description", content: "Create and manage customer coupon codes." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminGate>
      <AdminShell>
        <CouponsPage />
      </AdminShell>
    </AdminGate>
  ),
});

type Coupon = {
  id: string; code: string; description: string | null; discount_type: string; discount_value: number;
  min_order: number | null; max_discount: number | null; max_uses: number | null; used_count: number;
  starts_at: string | null; expires_at: string | null; active: boolean;
};
type F = {
  id?: string; code: string; description: string; discount_type: "percent" | "fixed"; discount_value: string;
  min_order: string; max_discount: string; max_uses: string; starts_at: string; expires_at: string; active: boolean;
};
const EMPTY: F = { code: "", description: "", discount_type: "percent", discount_value: "", min_order: "", max_discount: "", max_uses: "", starts_at: "", expires_at: "", active: true };

const couponsQuery = {
  queryKey: ["coupons"],
  queryFn: async () => {
    const { data, error } = await supabase.from("coupons" as never).select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Coupon[];
  },
};

function CouponsPage() {
  const qc = useQueryClient();
  const { data: coupons = [], isLoading } = useQuery(couponsQuery);
  const [form, setForm] = useState<F | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof F>(k: K, v: F[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  async function save() {
    if (!form) return;
    const num = (v: string) => (v.trim() === "" ? null : Number(v));
    const code = form.code.trim().toUpperCase();
    const value = Number(form.discount_value);
    if (!code) return toast.error("Coupon code is required.");
    if (!(value > 0)) return toast.error("Discount must be more than 0.");
    if (form.discount_type === "percent" && value > 100) return toast.error("Percent discount can't exceed 100.");
    const payload = {
      code, description: form.description.trim() || null, discount_type: form.discount_type, discount_value: value,
      min_order: num(form.min_order), max_discount: num(form.max_discount), max_uses: num(form.max_uses),
      starts_at: form.starts_at || null, expires_at: form.expires_at || null, active: form.active,
    };
    setSaving(true);
    const table = supabase.from("coupons" as never);
    const { error } = form.id
      ? await table.update(payload as never).eq("id", form.id)
      : await table.insert(payload as never);
    setSaving(false);
    if (error) return toast.error(error.code === "23505" ? "That code already exists." : error.message);
    toast.success("Coupon saved.");
    setForm(null);
    void qc.invalidateQueries({ queryKey: ["coupons"] });
  }

  async function remove(c: Coupon) {
    if (!confirm(`Delete coupon ${c.code}?`)) return;
    const { error } = await supabase.from("coupons" as never).delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Coupon deleted.");
    void qc.invalidateQueries({ queryKey: ["coupons"] });
  }

  async function toggle(c: Coupon) {
    const { error } = await supabase.from("coupons" as never).update({ active: !c.active } as never).eq("id", c.id);
    if (error) return toast.error(error.message);
    void qc.invalidateQueries({ queryKey: ["coupons"] });
  }

  const s = (v: number | null) => (v === null ? "" : String(v));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionHeading eyebrow="Admin" title="Coupons" />
        <Button variant="hero" onClick={() => setForm({ ...EMPTY })}><Plus aria-hidden /> New coupon</Button>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : coupons.length === 0 ? (
          <EmptyState icon={TicketPercent} title="No coupons yet" body="Create a code customers can use at checkout." />
        ) : coupons.map((c) => (
          <div key={c.id} className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-lg font-bold tracking-wider">{c.code}</span>
                <Badge>{c.discount_type === "percent" ? `${c.discount_value}% off` : `₹${c.discount_value} off`}</Badge>
                {!c.active && <Badge>Off</Badge>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Used {c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}
                {c.min_order ? ` · Min ₹${c.min_order}` : ""}
                {c.max_discount ? ` · Max ₹${c.max_discount}` : ""}
                {c.expires_at ? ` · Expires ${c.expires_at}` : ""}
                {c.description ? ` · ${c.description}` : ""}
              </p>
            </div>
            <Switch checked={c.active} onCheckedChange={() => void toggle(c)} aria-label={`Turn ${c.code} on or off`} />
            <Button variant="nav" size="icon" aria-label={`Edit ${c.code}`} onClick={() => setForm({
              id: c.id, code: c.code, description: c.description ?? "", discount_type: c.discount_type as F["discount_type"],
              discount_value: String(c.discount_value), min_order: s(c.min_order), max_discount: s(c.max_discount),
              max_uses: s(c.max_uses), starts_at: c.starts_at ?? "", expires_at: c.expires_at ?? "", active: c.active,
            })}><Pencil aria-hidden /></Button>
            <Button variant="nav" size="icon" className="text-lag-red" aria-label={`Delete ${c.code}`} onClick={() => void remove(c)}><Trash2 aria-hidden /></Button>
          </div>
        ))}
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "Edit coupon" : "New coupon"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Code</Label><Input value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="LAG10" /></div>
              <div className="sm:col-span-2"><Label>Description (optional)</Label><Input value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
              <div><Label>Type</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.discount_type} onChange={(e) => set("discount_type", e.target.value as F["discount_type"])}>
                  <option value="percent">Percent (%)</option><option value="fixed">Fixed amount (₹)</option>
                </select>
              </div>
              <div><Label>Discount {form.discount_type === "percent" ? "(%)" : "(₹)"}</Label><Input type="number" value={form.discount_value} onChange={(e) => set("discount_value", e.target.value)} /></div>
              <div><Label>Minimum order ₹ (optional)</Label><Input type="number" value={form.min_order} onChange={(e) => set("min_order", e.target.value)} /></div>
              <div><Label>Max discount ₹ (optional)</Label><Input type="number" value={form.max_discount} onChange={(e) => set("max_discount", e.target.value)} /></div>
              <div><Label>Usage limit (optional)</Label><Input type="number" value={form.max_uses} onChange={(e) => set("max_uses", e.target.value)} /></div>
              <div className="flex items-end gap-2 pb-2"><Switch checked={form.active} onCheckedChange={(v) => set("active", v)} /><Label>Active</Label></div>
              <div><Label>Starts (optional)</Label><Input type="date" value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} /></div>
              <div><Label>Expires (optional)</Label><Input type="date" value={form.expires_at} onChange={(e) => set("expires_at", e.target.value)} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="nav" onClick={() => setForm(null)}>Cancel</Button>
            <Button variant="hero" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
