import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRightLeft, Pencil, Plus, Rocket, Trash2 } from "lucide-react";
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
import { AdminSearch, useAdminSearch } from "@/components/lag/AdminSearch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatDate, PLATFORMS, type UpcomingGame } from "@/lib/lag";
import { logActivity, upcomingGamesQuery } from "@/lib/queries";

export const Route = createFileRoute("/admin/upcoming-games")({
  head: () => ({
    meta: [
      { title: "Manage Upcoming Games — LAG Admin" },
      { name: "description", content: "Add, edit and release upcoming PlayStation titles." },
      { property: "og:title", content: "Manage Upcoming Games — LAG Admin" },
      { property: "og:description", content: "Add, edit and release upcoming titles." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminUpcomingPage,
});

type F = {
  title: string;
  slug: string;
  short_description: string;
  description: string;
  cover_url: string | null;
  banner_url: string | null;
  platform: string;
  genre: string;
  developer: string;
  publisher: string;
  release_date: string;
  release_note: string;
  trailer_url: string;
  featured: boolean;
  visible: boolean;
  display_order: string;
};

const EMPTY: F = {
  title: "",
  slug: "",
  short_description: "",
  description: "",
  cover_url: null,
  banner_url: null,
  platform: "PS5",
  genre: "",
  developer: "",
  publisher: "",
  release_date: "",
  release_note: "",
  trailer_url: "",
  featured: false,
  visible: true,
  display_order: "0",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toForm(g: UpcomingGame): F {
  return {
    title: g.title,
    slug: g.slug,
    short_description: g.short_description ?? "",
    description: g.description ?? "",
    cover_url: g.cover_url ?? null,
    banner_url: g.banner_url ?? null,
    platform: g.platform,
    genre: g.genre ?? "",
    developer: g.developer ?? "",
    publisher: g.publisher ?? "",
    release_date: g.release_date ?? "",
    release_note: g.release_note ?? "",
    trailer_url: g.trailer_url ?? "",
    featured: g.featured,
    visible: g.visible,
    display_order: String(g.display_order ?? 0),
  };
}

function toPayload(f: F) {
  if (!f.title.trim()) throw new Error("Title is required.");
  return {
    title: f.title.trim(),
    slug: (f.slug.trim() || slugify(f.title)).trim(),
    short_description: f.short_description.trim() || null,
    description: f.description.trim() || null,
    cover_url: f.cover_url || null,
    banner_url: f.banner_url || null,
    platform: f.platform || "PS5",
    genre: f.genre.trim() || null,
    developer: f.developer.trim() || null,
    publisher: f.publisher.trim() || null,
    release_date: f.release_date || null,
    release_note: f.release_note.trim() || null,
    trailer_url: f.trailer_url.trim() || null,
    featured: f.featured,
    visible: f.visible,
    display_order: f.display_order.trim() === "" ? 0 : Number(f.display_order),
  };
}

function AdminUpcomingPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: allItems = [], isLoading, isError } = useQuery(upcomingGamesQuery({ admin: true }));
  const { query, setQuery, results: items } = useAdminSearch(allItems, (g) => [
    g.title, g.slug, g.genre, g.platform, g.publisher, g.developer,
  ]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<F>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);

  const actor = { actorId: user?.id ?? null, actorName: user?.email ?? "Admin" };
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["upcoming_games"] });
    void qc.invalidateQueries({ queryKey: ["games"] });
    void qc.invalidateQueries({ queryKey: ["activity_log"] });
  };

  async function handleSave() {
    setSaving(true);
    try {
      const payload = toPayload(form);
      if (editingId) {
        const { error } = await supabase.from("upcoming_games").update(payload).eq("id", editingId);
        if (error) throw new Error(error.message);
        await logActivity({
          action: "Upcoming Game Updated",
          entityType: "upcoming_game",
          entityId: editingId,
          entityLabel: payload.title,
          ...actor,
        });
        toast.success("Upcoming game updated.");
      } else {
        const { data, error } = await supabase
          .from("upcoming_games")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        await logActivity({
          action: "Upcoming Game Added",
          entityType: "upcoming_game",
          entityId: data.id,
          entityLabel: payload.title,
          ...actor,
        });
        toast.success("Upcoming game added.");
      }
      invalidate();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisible(g: UpcomingGame) {
    const { error } = await supabase
      .from("upcoming_games")
      .update({ visible: !g.visible })
      .eq("id", g.id);
    if (error) toast.error(error.message);
    else invalidate();
  }

  async function handleDelete(g: UpcomingGame) {
    const { error } = await supabase.from("upcoming_games").delete().eq("id", g.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logActivity({
      action: "Upcoming Game Deleted",
      entityType: "upcoming_game",
      entityId: g.id,
      entityLabel: g.title,
      ...actor,
    });
    toast.success("Removed.");
    invalidate();
  }

  /** Promote a released title into the main catalogue, then remove it from upcoming. */
  async function moveToGames(g: UpcomingGame) {
    setMoving(g.id);
    try {
      const { data: existing } = await supabase
        .from("games")
        .select("id")
        .eq("slug", g.slug)
        .maybeSingle();
      if (existing) throw new Error("A game with this slug already exists in the catalogue.");

      const { data, error } = await supabase
        .from("games")
        .insert({
          slug: g.slug,
          title: g.title,
          short_description: g.short_description,
          description: g.description,
          cover_url: g.cover_url,
          banner_url: g.banner_url,
          trailer_url: g.trailer_url,
          platform: g.platform,
          genre: g.genre,
          developer: g.developer,
          publisher: g.publisher,
          release_date: g.release_date,
          availability: "In Stock",
          new_release: true,
          visible: true,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      const { error: delErr } = await supabase.from("upcoming_games").delete().eq("id", g.id);
      if (delErr) throw new Error(delErr.message);

      await logActivity({
        action: "Upcoming Game Released",
        entityType: "game",
        entityId: data.id,
        entityLabel: `${g.title} moved to catalogue`,
        ...actor,
      });
      toast.success(`${g.title} moved to Games — set its pricing next.`);
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not move this game.");
    } finally {
      setMoving(null);
    }
  }

  return (
    <AdminGate>
      <AdminShell>
        <SectionHeading
          eyebrow="Catalogue"
          title="Upcoming Games"
          subtitle="Manage announced titles and move them to the catalogue on release."
          action={
            <Button
              variant="hero"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden /> Add Upcoming
            </Button>
          }
        />

        <AdminSearch value={query} onChange={setQuery} placeholder="Search upcoming games by title, genre…" count={items.length} label="games" />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading upcoming games…</p>
        ) : isError ? (
          <p className="text-sm text-lag-red">Failed to load upcoming games.</p>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Rocket}
            title="No upcoming games"
            body="Add announced PS4/PS5 titles with their release dates."
          />
        ) : (
          <div className="grid gap-3">
            {items.map((g) => (
              <div key={g.id} className="glass flex flex-col gap-3 rounded-2xl p-4 sm:flex-row">
                {g.cover_url ? (
                  <img
                    src={g.cover_url}
                    alt={g.title}
                    loading="lazy"
                    className="h-20 w-full shrink-0 rounded-xl bg-surface-2 object-cover sm:w-32"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-bold break-words">{g.title}</h3>
                    <Badge tone="blue">{g.platform}</Badge>
                    {g.featured && <Badge tone="red">Featured</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Releases {formatDate(g.release_date)}
                    {g.release_note ? ` · ${g.release_note}` : ""}
                  </p>
                  <label className="mt-2 flex items-center gap-1.5 text-xs">
                    <Switch checked={g.visible} onCheckedChange={() => toggleVisible(g)} /> Visible
                  </label>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    variant="blue"
                    size="sm"
                    disabled={moving === g.id}
                    onClick={() => moveToGames(g)}
                  >
                    <ArrowRightLeft className="h-4 w-4" aria-hidden />
                    {moving === g.id ? "Moving…" : "Move to Games"}
                  </Button>
                  <Button
                    variant="glass"
                    size="sm"
                    aria-label={`Edit ${g.title}`}
                    onClick={() => {
                      setEditingId(g.id);
                      setForm(toForm(g));
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="glass" size="sm" aria-label={`Delete ${g.title}`}>
                        <Trash2 className="h-4 w-4 text-lag-red" aria-hidden />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <ADTitle>Delete "{g.title}"?</ADTitle>
                        <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(g)}>Delete</AlertDialogAction>
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
              <DialogTitle>{editingId ? "Edit Upcoming Game" : "Add Upcoming Game"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="u-title">Title</Label>
                <Input
                  id="u-title"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      title: e.target.value,
                      slug: f.slug || slugify(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-slug">Slug</Label>
                <Input
                  id="u-slug"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-short">Short description</Label>
                <Textarea
                  id="u-short"
                  rows={2}
                  value={form.short_description}
                  onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-desc">Full description</Label>
                <Textarea
                  id="u-desc"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <ImageUploadField
                label="Cover artwork"
                value={form.cover_url}
                onChange={(v) => setForm((f) => ({ ...f, cover_url: v }))}
              />
              <ImageUploadField
                label="Banner artwork"
                value={form.banner_url}
                onChange={(v) => setForm((f) => ({ ...f, banner_url: v }))}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="u-platform">Platform</Label>
                  <select
                    id="u-platform"
                    value={form.platform}
                    onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
                    className="glass h-10 w-full rounded-xl px-3 text-sm font-semibold"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p} className="bg-surface text-foreground">
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="u-genre">Genre</Label>
                  <Input
                    id="u-genre"
                    value={form.genre}
                    onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="u-dev">Developer</Label>
                  <Input
                    id="u-dev"
                    value={form.developer}
                    onChange={(e) => setForm((f) => ({ ...f, developer: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="u-pub">Publisher</Label>
                  <Input
                    id="u-pub"
                    value={form.publisher}
                    onChange={(e) => setForm((f) => ({ ...f, publisher: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="u-date">Release date</Label>
                  <Input
                    id="u-date"
                    type="date"
                    value={form.release_date}
                    onChange={(e) => setForm((f) => ({ ...f, release_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="u-note">Release note</Label>
                  <Input
                    id="u-note"
                    placeholder="Expected / TBA 2026"
                    value={form.release_note}
                    onChange={(e) => setForm((f) => ({ ...f, release_note: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="u-trailer">Trailer URL</Label>
                  <Input
                    id="u-trailer"
                    value={form.trailer_url}
                    onChange={(e) => setForm((f) => ({ ...f, trailer_url: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="u-order">Display order</Label>
                  <Input
                    id="u-order"
                    type="number"
                    value={form.display_order}
                    onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))}
                  />
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
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AdminShell>
    </AdminGate>
  );
}
