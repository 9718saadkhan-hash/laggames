import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminGate, AdminShell } from "@/components/lag/AdminShell";
import { ImageUploadField } from "@/components/lag/ImageUploadField";
import { Badge, EmptyState, SectionHeading } from "@/components/lag/ui-bits";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as ADTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatDate, type Deal } from "@/lib/lag";
import { dealGamesQuery, dealsQuery, gamesQuery, logActivity } from "@/lib/queries";

export const Route = createFileRoute("/admin/deals")({
  head: () => ({
    meta: [
      { title: "Manage Deals — LAG Admin" },
      { name: "description", content: "Create and manage promotional deals and hero banners." },
      { property: "og:title", content: "Manage Deals — LAG Admin" },
      { property: "og:description", content: "Create and manage promotional deals." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDealsPage,
});

type F = {
  title: string;
  subtitle: string;
  description: string;
  image_url: string | null;
  discount: string;
  badge: string;
  cta_label: string;
  cta_link: string;
  start_date: string;
  end_date: string;
  featured: boolean;
  show_in_hero: boolean;
  visible: boolean;
  display_order: string;
  gameIds: string[];
};

const EMPTY: F = {
  title: "",
  subtitle: "",
  description: "",
  image_url: null,
  discount: "",
  badge: "DEAL",
  cta_label: "VIEW DEALS",
  cta_link: "/deals",
  start_date: "",
  end_date: "",
  featured: false,
  show_in_hero: true,
  visible: true,
  display_order: "0",
  gameIds: [],
};

function toForm(d: Deal, gameIds: string[]): F {
  return {
    title: d.title,
    subtitle: d.subtitle ?? "",
    description: d.description ?? "",
    image_url: d.image_url ?? null,
    discount: d.discount ?? "",
    badge: d.badge ?? "DEAL",
    cta_label: d.cta_label ?? "VIEW DEALS",
    cta_link: d.cta_link ?? "/deals",
    start_date: d.start_date ?? "",
    end_date: d.end_date ?? "",
    featured: d.featured,
    show_in_hero: d.show_in_hero,
    visible: d.visible,
    display_order: String(d.display_order ?? 0),
    gameIds,
  };
}

function toPayload(f: F) {
  if (!f.title.trim()) throw new Error("Deal title is required.");
  return {
    title: f.title.trim(),
    subtitle: f.subtitle.trim() || null,
    description: f.description.trim() || null,
    image_url: f.image_url || null,
    discount: f.discount.trim() || null,
    badge: f.badge.trim() || null,
    cta_label: f.cta_label.trim() || "VIEW DEALS",
    cta_link: f.cta_link.trim() || null,
    start_date: f.start_date || null,
    end_date: f.end_date || null,
    featured: f.featured,
    show_in_hero: f.show_in_hero,
    visible: f.visible,
    display_order: f.display_order.trim() === "" ? 0 : Number(f.display_order),
  };
}

function AdminDealsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: deals = [], isLoading, isError } = useQuery(dealsQuery({ admin: true }));
  const { data: links = [] } = useQuery(dealGamesQuery);
  const { data: games = [] } = useQuery(gamesQuery({ admin: true }));

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<F>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["deals"] });
    void qc.invalidateQueries({ queryKey: ["deal_games"] });
    void qc.invalidateQueries({ queryKey: ["activity_log"] });
  };
  const actor = { actorId: user?.id ?? null, actorName: user?.email ?? "Admin" };

  async function syncGames(dealId: string, gameIds: string[]) {
    const { error: delErr } = await supabase.from("deal_games").delete().eq("deal_id", dealId);
    if (delErr) throw new Error(delErr.message);
    if (gameIds.length === 0) return;
    const { error } = await supabase
      .from("deal_games")
      .insert(gameIds.map((game_id, i) => ({ deal_id: dealId, game_id, display_order: i })));
    if (error) throw new Error(error.message);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = toPayload(form);
      if (editingId) {
        const { error } = await supabase.from("deals").update(payload).eq("id", editingId);
        if (error) throw new Error(error.message);
        await syncGames(editingId, form.gameIds);
        await logActivity({
          action: "Deal Updated",
          entityType: "deal",
          entityId: editingId,
          entityLabel: payload.title,
          ...actor,
        });
        toast.success("Deal updated.");
      } else {
        const { data, error } = await supabase.from("deals").insert(payload).select("id").single();
        if (error) throw new Error(error.message);
        await syncGames(data.id, form.gameIds);
        await logActivity({
          action: "Deal Added",
          entityType: "deal",
          entityId: data.id,
          entityLabel: payload.title,
          ...actor,
        });
        toast.success("Deal created.");
      }
      invalidate();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(deal: Deal, field: "visible" | "featured" | "show_in_hero") {
    const patch =
      field === "visible"
        ? { visible: !deal.visible }
        : field === "featured"
          ? { featured: !deal.featured }
          : { show_in_hero: !deal.show_in_hero };
    const { error } = await supabase.from("deals").update(patch).eq("id", deal.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logActivity({
      action: "Deal Updated",
      entityType: "deal",
      entityId: deal.id,
      entityLabel: `${deal.title} — ${field.replace("_", " ")} ${!deal[field] ? "on" : "off"}`,
      ...actor,
    });
    invalidate();
  }

  async function handleDelete(deal: Deal) {
    const { error } = await supabase.from("deals").delete().eq("id", deal.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logActivity({
      action: "Deal Deleted",
      entityType: "deal",
      entityId: deal.id,
      entityLabel: deal.title,
      ...actor,
    });
    toast.success("Deal deleted.");
    invalidate();
  }

  function openNew() {
    setEditingId(null);
    setForm(EMPTY);
    setOpen(true);
  }
  function openEdit(deal: Deal) {
    setEditingId(deal.id);
    setForm(toForm(deal, links.filter((l) => l.deal_id === deal.id).map((l) => l.game_id)));
    setOpen(true);
  }

  return (
    <AdminGate>
      <AdminShell>
        <SectionHeading
          eyebrow="Promotions"
          title="Manage Deals"
          subtitle="Control the homepage DEALS hero and the /deals page."
          action={
            <Button variant="hero" onClick={openNew}>
              <Plus className="h-4 w-4" aria-hidden /> Add Deal
            </Button>
          }
        />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading deals…</p>
        ) : isError ? (
          <p className="text-sm text-lag-red">Failed to load deals.</p>
        ) : deals.length === 0 ? (
          <EmptyState icon={Tag} title="No deals yet" body="Create your first promotional deal." />
        ) : (
          <div className="grid gap-3">
            {deals.map((d) => (
              <div key={d.id} className="glass flex flex-col gap-3 rounded-2xl p-4 sm:flex-row">
                {d.image_url ? (
                  <img
                    src={d.image_url}
                    alt={d.title}
                    loading="lazy"
                    className="h-20 w-full shrink-0 rounded-xl bg-surface-2 object-cover sm:w-36"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-bold break-words">{d.title}</h3>
                    {d.discount && <Badge tone="red">{d.discount}</Badge>}
                    {d.featured && <Badge tone="blue">Featured</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {d.start_date || d.end_date
                      ? `${formatDate(d.start_date)} → ${formatDate(d.end_date)}`
                      : "No date range"}
                    {" · "}
                    {links.filter((l) => l.deal_id === d.id).length} games
                  </p>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs">
                    <label className="flex items-center gap-1.5">
                      <Switch checked={d.visible} onCheckedChange={() => toggle(d, "visible")} />{" "}
                      Visible
                    </label>
                    <label className="flex items-center gap-1.5">
                      <Switch
                        checked={d.show_in_hero}
                        onCheckedChange={() => toggle(d, "show_in_hero")}
                      />{" "}
                      In hero
                    </label>
                    <label className="flex items-center gap-1.5">
                      <Switch checked={d.featured} onCheckedChange={() => toggle(d, "featured")} />{" "}
                      Featured
                    </label>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={() => openEdit(d)}
                    aria-label={`Edit ${d.title}`}
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="glass" size="sm" aria-label={`Delete ${d.title}`}>
                        <Trash2 className="h-4 w-4 text-lag-red" aria-hidden />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <ADTitle>Delete "{d.title}"?</ADTitle>
                        <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(d)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Deal" : "Add Deal"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="d-title">Title</Label>
                <Input
                  id="d-title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-sub">Subtitle</Label>
                <Input
                  id="d-sub"
                  value={form.subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-desc">Description</Label>
                <Textarea
                  id="d-desc"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <ImageUploadField
                label="Deal banner"
                value={form.image_url}
                onChange={(v) => setForm((f) => ({ ...f, image_url: v }))}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="d-discount">Discount text</Label>
                  <Input
                    id="d-discount"
                    placeholder="UP TO 70% OFF"
                    value={form.discount}
                    onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="d-badge">Badge</Label>
                  <Input
                    id="d-badge"
                    value={form.badge}
                    onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="d-start">Start date</Label>
                  <Input
                    id="d-start"
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="d-end">End date</Label>
                  <Input
                    id="d-end"
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="d-cta">CTA label</Label>
                  <Input
                    id="d-cta"
                    value={form.cta_label}
                    onChange={(e) => setForm((f) => ({ ...f, cta_label: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="d-link">CTA link</Label>
                  <Input
                    id="d-link"
                    value={form.cta_link}
                    onChange={(e) => setForm((f) => ({ ...f, cta_link: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="d-order">Display order</Label>
                  <Input
                    id="d-order"
                    type="number"
                    value={form.display_order}
                    onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Games in this deal</Label>
                <div className="glass max-h-48 overflow-y-auto rounded-2xl p-3">
                  {games.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No games in the catalogue yet.</p>
                  ) : (
                    games.map((g) => {
                      const checked = form.gameIds.includes(g.id);
                      return (
                        <label
                          key={g.id}
                          className="flex cursor-pointer items-center gap-2 py-1 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setForm((f) => ({
                                ...f,
                                gameIds: checked
                                  ? f.gameIds.filter((id) => id !== g.id)
                                  : [...f.gameIds, g.id],
                              }))
                            }
                            className="h-4 w-4 shrink-0 accent-[hsl(var(--lag-red))]"
                          />
                          <span className="min-w-0 truncate">{g.title}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm font-semibold">
                <label className="flex items-center gap-2">
                  <Switch
                    checked={form.visible}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, visible: v }))}
                  />{" "}
                  Visible
                </label>
                <label className="flex items-center gap-2">
                  <Switch
                    checked={form.show_in_hero}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, show_in_hero: v }))}
                  />{" "}
                  Show in hero
                </label>
                <label className="flex items-center gap-2">
                  <Switch
                    checked={form.featured}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))}
                  />{" "}
                  Featured
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="glass" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="hero" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Deal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AdminShell>
    </AdminGate>
  );
}
