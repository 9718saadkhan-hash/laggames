import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Pencil, Copy, Trash2, Gamepad2, Layers, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  autofillGames,
  type AutofillField,
  type AutofillResult,
} from "@/lib/autofill.functions";

import { AdminGate, AdminShell } from "@/components/lag/AdminShell";
import { EditionsManager } from "@/components/lag/EditionsManager";
import { ImagePositionField } from "@/components/lag/ImagePositionField";
import { ImageUploadField } from "@/components/lag/ImageUploadField";
import { SectionHeading, EmptyState, Badge } from "@/components/lag/ui-bits";
import { supabase } from "@/integrations/supabase/client";
import { gamesQuery } from "@/lib/queries";
import { money, discountPercent, hasManualOrder, PLATFORMS, type Game } from "@/lib/lag";
import { AdminSearch, useAdminSearch } from "@/components/lag/AdminSearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/admin/games")({
  head: () => ({
    meta: [
      { title: "Manage Games — LAG Admin" },
      { name: "description", content: "Add, edit and manage PlayStation games in the LAG catalog." },
      { property: "og:title", content: "Manage Games — LAG Admin" },
      { property: "og:description", content: "Add, edit and manage PlayStation games in the LAG catalog." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminGamesPage,
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const AUTOFILL_LABEL: Record<AutofillField, string> = {
  genre: "Genre",
  game_size: "Game Size",
  developer: "Developer",
  publisher: "Publisher",
  rating: "Rating",
  release_date: "Release Date",
  short_description: "Short Description",
  description: "Description",
};

function autofillSummary(r: AutofillResult): string {
  const lines: string[] = [];
  if (r.filled.length)
    lines.push(`Updated: ${r.filled.map((f) => `✓ ${AUTOFILL_LABEL[f]}`).join(", ")}`);
  if (r.alreadyFilled.length)
    lines.push(
      `Already available: ${r.alreadyFilled.map((f) => `✓ ${AUTOFILL_LABEL[f]}`).join(", ")}`,
    );
  if (r.unresolved.length)
    lines.push(`Still missing: ${r.unresolved.map((f) => `⚠ ${AUTOFILL_LABEL[f]}`).join(", ")}`);
  if (r.note) lines.push(r.note);
  return lines.join("\n");
}

type GameForm = {
  id?: string;
  slug: string;
  title: string;
  short_description: string;
  description: string;
  cover_url: string;
  banner_url: string;
  cover_position: string;
  banner_position: string;
  gallery: string;
  trailer_url: string;
  platform: string;
  genre: string;
  developer: string;
  publisher: string;
  release_date: string;
  game_size: string;
  rating: string;
  primary_available: boolean;
  secondary_available: boolean;
  primary_description: string;
  secondary_description: string;
  price_30: string;
  price_60: string;
  price_permanent: string;
  price_30_secondary: string;
  price_60_secondary: string;
  price_permanent_secondary: string;
  old_price: string;
  availability: string;
  featured: boolean;
  trending: boolean;
  hot_deal: boolean;
  new_release: boolean;
  visible: boolean;
  display_order: string;
};

const EMPTY_FORM: GameForm = {
  slug: "",
  title: "",
  short_description: "",
  description: "",
  cover_url: "",
  banner_url: "",
  cover_position: "50% 50%",
  banner_position: "50% 50%",
  gallery: "",
  trailer_url: "",
  platform: "PS5",
  genre: "",
  developer: "",
  publisher: "",
  release_date: "",
  game_size: "",
  rating: "",
  primary_available: true,
  secondary_available: false,
  primary_description: "",
  secondary_description: "",
  price_30: "",
  price_60: "",
  price_permanent: "",
  price_30_secondary: "",
  price_60_secondary: "",
  price_permanent_secondary: "",
  old_price: "",
  availability: "In Stock",
  featured: false,
  trending: false,
  hot_deal: false,
  new_release: false,
  visible: true,
  display_order: "",
};

function gameToForm(g: Game): GameForm {
  return {
    id: g.id,
    slug: g.slug,
    title: g.title,
    short_description: g.short_description ?? "",
    description: g.description ?? "",
    cover_url: g.cover_url ?? "",
    banner_url: g.banner_url ?? "",
    cover_position: g.cover_position ?? "50% 50%",
    banner_position: g.banner_position ?? "50% 50%",
    gallery: (g.gallery ?? []).join("\n"),
    trailer_url: g.trailer_url ?? "",
    platform: g.platform,
    genre: g.genre ?? "",
    developer: g.developer ?? "",
    publisher: g.publisher ?? "",
    release_date: g.release_date ?? "",
    game_size: g.game_size ?? "",
    rating: g.rating?.toString() ?? "",
    primary_available: g.primary_available,
    secondary_available: g.secondary_available,
    primary_description: g.primary_description ?? "",
    secondary_description: g.secondary_description ?? "",
    price_30: g.price_30?.toString() ?? "",
    price_60: g.price_60?.toString() ?? "",
    price_permanent: g.price_permanent?.toString() ?? "",
    price_30_secondary: g.price_30_secondary?.toString() ?? "",
    price_60_secondary: g.price_60_secondary?.toString() ?? "",
    price_permanent_secondary: g.price_permanent_secondary?.toString() ?? "",
    old_price: g.old_price?.toString() ?? "",
    availability: g.availability,
    featured: g.featured,
    trending: g.trending,
    hot_deal: g.hot_deal,
    new_release: g.new_release,
    visible: g.visible,
    display_order: typeof g.display_order === "number" ? g.display_order.toString() : "",
  };
}

function formToPayload(f: GameForm) {
  const num = (v: string) => (v.trim() === "" ? null : Number(v));
  if (!f.title.trim()) throw new Error("Title is required.");
  if (!f.slug.trim()) throw new Error("Slug is required.");
  return {
    slug: slugify(f.slug),
    title: f.title.trim(),
    short_description: f.short_description || null,
    description: f.description || null,
    cover_url: f.cover_url || null,
    banner_url: f.banner_url || null,
    cover_position: f.cover_position || "50% 50%",
    banner_position: f.banner_position || "50% 50%",
    gallery: f.gallery
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    trailer_url: f.trailer_url || null,
    platform: f.platform,
    genre: f.genre || null,
    developer: f.developer || null,
    publisher: f.publisher || null,
    release_date: f.release_date || null,
    game_size: f.game_size || null,
    rating: num(f.rating),
    primary_available: f.primary_available,
    secondary_available: f.secondary_available,
    primary_description: f.primary_description || null,
    secondary_description: f.secondary_description || null,
    price_30: num(f.price_30),
    price_60: num(f.price_60),
    price_permanent: num(f.price_permanent),
    price_30_secondary: num(f.price_30_secondary),
    price_60_secondary: num(f.price_60_secondary),
    price_permanent_secondary: num(f.price_permanent_secondary),
    old_price: num(f.old_price),
    availability: f.availability || "In Stock",
    featured: f.featured,
    trending: f.trending,
    hot_deal: f.hot_deal,
    new_release: f.new_release,
    visible: f.visible,
    display_order: num(f.display_order),
  };
}

function AdminGamesPage() {
  const { data: allGames = [], isLoading } = useQuery(gamesQuery({ admin: true }));
  const { query, setQuery, results: games } = useAdminSearch(allGames, (g) => [
    g.title, g.slug, g.genre, g.platform, g.publisher, g.developer, g.availability,
  ]);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<GameForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editionsGame, setEditionsGame] = useState<Game | null>(null);
  const runAutofill = useServerFn(autofillGames);
  const [autofillingId, setAutofillingId] = useState<string | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["games"] });
  }

  /** Fill only this game's empty metadata fields; existing values stay untouched. */
  async function autofillOne(id: string, title: string) {
    setAutofillingId(id);
    try {
      const results = await runAutofill({ data: { ids: [id], retry: true } });
      const result = results[0];
      if (!result) {
        toast.error("That game could not be found.");
        return;
      }
      invalidate();
      if (editingId === id) {
        const { data } = await supabase.from("games").select("*").eq("id", id).maybeSingle();
        if (data) setForm(gameToForm(data as Game));
      }
      const description = <span className="whitespace-pre-line">{autofillSummary(result)}</span>;
      if (result.filled.length) {
        toast.success(`${title} — metadata updated successfully.`, { description });
      } else if (result.status === "skipped") {
        toast.info(`${title} — nothing was missing.`, { description });
      } else {
        toast.warning(`${title} — needs manual entry.`, { description });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Auto-fill failed.");
    } finally {
      setAutofillingId(null);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(g: Game) {
    setEditingId(g.id);
    setForm(gameToForm(g));
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = formToPayload(form);
      if (editingId) {
        const { error } = await supabase.from("games").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Product updated successfully.");
      } else {
        const { error } = await supabase.from("games").insert(payload);
        if (error) throw error;
        toast.success("Game added successfully.");
      }
      invalidate();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDuplicate(g: Game) {
    const { id, created_at, ...rest } = g;
    const { error } = await supabase.from("games").insert({ ...rest, slug: `${g.slug}-copy`, title: `${g.title} (Copy)` });
    if (error) toast.error(error.message);
    else {
      toast.success("Game duplicated.");
      invalidate();
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("games").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Game deleted.");
      invalidate();
    }
  }

  type GameFlag =
    | "visible"
    | "trending"
    | "hot_deal"
    | "new_release"
    | "featured"
    | "primary_available"
    | "secondary_available";

  async function toggleField(g: Game, field: GameFlag) {
    const payload = { [field]: !g[field] } as Record<GameFlag, boolean>;
    const { error } = await supabase
      .from("games")
      .update(payload)
      .eq("id", g.id);
    if (error) toast.error(error.message);
    else invalidate();
  }

  const discount = discountPercent(Number(form.old_price) || null, Number(form.price_permanent || form.price_60 || form.price_30) || null);

  return (
    <AdminGate>
      <AdminShell>
        <SectionHeading
          eyebrow="Catalog"
          title="Manage Games"
          subtitle="Add, edit and organize PlayStation game listings."
          action={
            <Button variant="hero" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add Game
            </Button>
          }
        />

        <AdminSearch value={query} onChange={setQuery} placeholder="Search games by title, genre, platform…" count={games.length} label="games" />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading games…</p>

        ) : games.length === 0 ? (
          <EmptyState icon={Gamepad2} title="No games yet" body="Add your first game to get started." />
        ) : (
          <div className="grid gap-3">
            {games.map((g) => (
              <div key={g.id} className="glass flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center">
                <img
                  src={g.cover_url ?? undefined}
                  alt={g.title}
                  className="h-20 w-20 shrink-0 rounded-xl object-cover bg-surface-2"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-bold">{g.title}</h3>
                    <Badge tone="blue">{g.platform}</Badge>
                    {hasManualOrder(g.display_order) ? (
                      <Badge tone="red">#{g.display_order}</Badge>
                    ) : (
                      <Badge>A–Z Auto</Badge>
                    )}
                    {g.old_price && discountPercent(g.old_price, g.price_permanent ?? g.price_60 ?? g.price_30) && (
                      <Badge tone="red">
                        -{discountPercent(g.old_price, g.price_permanent ?? g.price_60 ?? g.price_30)}%
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    30d {money(g.price_30)} · 60d {money(g.price_60)} · Permanent {money(g.price_permanent)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    <label className="flex items-center gap-1.5">
                      <Switch checked={g.visible} onCheckedChange={() => toggleField(g, "visible")} /> Visible
                    </label>
                    <label className="flex items-center gap-1.5">
                      <Switch checked={g.trending} onCheckedChange={() => toggleField(g, "trending")} /> Trending
                    </label>
                    <label className="flex items-center gap-1.5">
                      <Switch checked={g.hot_deal} onCheckedChange={() => toggleField(g, "hot_deal")} /> Hot Deal
                    </label>
                    <label className="flex items-center gap-1.5">
                      <Switch checked={g.new_release} onCheckedChange={() => toggleField(g, "new_release")} /> New
                    </label>
                    <label className="flex items-center gap-1.5">
                      <Switch checked={g.featured} onCheckedChange={() => toggleField(g, "featured")} /> Featured
                    </label>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button variant="glass" size="sm" onClick={() => openEdit(g)} aria-label={`Edit ${g.title}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={() => setEditionsGame(g)}
                    aria-label={`Manage editions for ${g.title}`}
                  >
                    <Layers className="h-4 w-4" />
                    <span className="hidden sm:inline">Editions</span>
                  </Button>
                  <Button variant="glass" size="sm" onClick={() => handleDuplicate(g)} aria-label={`Duplicate ${g.title}`}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="glass" size="sm" aria-label={`Delete ${g.title}`}>
                        <Trash2 className="h-4 w-4 text-lag-red" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{g.title}"?</AlertDialogTitle>
                        <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(g.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Game" : "Add Game"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="g-title">Title</Label>
                  <Input
                    id="g-title"
                    value={form.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      setForm((f) => ({
                        ...f,
                        title,
                        slug: editingId ? f.slug : slugify(title),
                      }));
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="g-slug">Slug</Label>
                  <Input id="g-slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="g-short">Short Description</Label>
                <Input id="g-short" value={form.short_description} onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="g-desc">Description</Label>
                <Textarea id="g-desc" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Cover image</Label>
                  <ImageUploadField
                    value={form.cover_url}
                    onChange={(v) => setForm((f) => ({ ...f, cover_url: v ?? "" }))}
                    purpose="game-cover"
                    label="Upload from device"
                    mediaFolder="games"
                  />
                  <ImagePositionField
                    value={form.cover_position}
                    onChange={(v) => setForm((f) => ({ ...f, cover_position: v }))}
                    label="Cover focal position"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Banner image</Label>
                  <ImageUploadField
                    value={form.banner_url}
                    onChange={(v) => setForm((f) => ({ ...f, banner_url: v ?? "" }))}
                    purpose="game-banner"
                    label="Upload from device"
                    mediaFolder="games"
                  />
                  <ImagePositionField
                    value={form.banner_position}
                    onChange={(v) => setForm((f) => ({ ...f, banner_position: v }))}
                    label="Banner focal position"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Gallery images</Label>
                <div className="flex flex-wrap gap-2">
                  {form.gallery
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((src, i) => (
                      <div key={`${i}-${src.slice(-16)}`} className="relative">
                        <img src={src} alt={`Gallery ${i + 1}`} loading="lazy" className="h-16 w-24 rounded-xl border border-border object-cover" />
                        <Button
                          type="button"
                          variant="nav"
                          size="sm"
                          className="absolute -right-1 -top-1 h-6 w-6 rounded-full p-0"
                          aria-label={`Remove gallery image ${i + 1}`}
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              gallery: f.gallery
                                .split("\n")
                                .map((s) => s.trim())
                                .filter(Boolean)
                                .filter((_, j) => j !== i)
                                .join("\n"),
                            }))
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                </div>
                <ImageUploadField
                  value={null}
                  onChange={(v) => {
                    if (!v) return;
                    setForm((f) => ({ ...f, gallery: [f.gallery.trim(), v].filter(Boolean).join("\n") }));
                  }}
                  purpose="game-banner"
                  label="Add gallery image"
                  mediaFolder="games"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="g-trailer">Trailer URL</Label>
                <Input id="g-trailer" value={form.trailer_url} onChange={(e) => setForm((f) => ({ ...f, trailer_url: e.target.value }))} />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="g-platform">Platform</Label>
                  <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v }))}>
                    <SelectTrigger id="g-platform"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="g-genre">Genre</Label>
                  <Input id="g-genre" value={form.genre} onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="g-size">Game Size</Label>
                  <Input id="g-size" value={form.game_size} onChange={(e) => setForm((f) => ({ ...f, game_size: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="g-dev">Developer</Label>
                  <Input id="g-dev" value={form.developer} onChange={(e) => setForm((f) => ({ ...f, developer: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="g-pub">Publisher</Label>
                  <Input id="g-pub" value={form.publisher} onChange={(e) => setForm((f) => ({ ...f, publisher: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="g-rating">Rating</Label>
                  <Input id="g-rating" type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="g-release">Release Date</Label>
                  <Input id="g-release" type="date" value={form.release_date} onChange={(e) => setForm((f) => ({ ...f, release_date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="g-avail">Availability</Label>
                  <Input id="g-avail" value={form.availability} onChange={(e) => setForm((f) => ({ ...f, availability: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-3 rounded-xl bg-surface-2 p-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <Switch checked={form.primary_available} onCheckedChange={(v) => setForm((f) => ({ ...f, primary_available: v }))} />
                    Primary Available
                  </label>
                  <Input placeholder="Primary description" value={form.primary_description} onChange={(e) => setForm((f) => ({ ...f, primary_description: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <Switch checked={form.secondary_available} onCheckedChange={(v) => setForm((f) => ({ ...f, secondary_available: v }))} />
                    Secondary Available
                  </label>
                  <Input placeholder="Secondary description" value={form.secondary_description} onChange={(e) => setForm((f) => ({ ...f, secondary_description: e.target.value }))} />
                </div>
              </div>

              <p className="text-sm font-semibold">Primary account prices</p>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="g-p30">Price 30d</Label>
                  <Input id="g-p30" type="number" value={form.price_30} onChange={(e) => setForm((f) => ({ ...f, price_30: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="g-p60">Price 60d</Label>
                  <Input id="g-p60" type="number" value={form.price_60} onChange={(e) => setForm((f) => ({ ...f, price_60: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="g-pperm">Price Permanent</Label>
                  <Input id="g-pperm" type="number" value={form.price_permanent} onChange={(e) => setForm((f) => ({ ...f, price_permanent: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="g-old">Old Price</Label>
                  <Input id="g-old" type="number" value={form.old_price} onChange={(e) => setForm((f) => ({ ...f, old_price: e.target.value }))} />
                </div>
              </div>

              <p className="text-sm font-semibold">Secondary account prices (leave blank to use primary)</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="g-s30">Secondary 30d</Label>
                  <Input id="g-s30" type="number" value={form.price_30_secondary} onChange={(e) => setForm((f) => ({ ...f, price_30_secondary: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="g-s60">Secondary 60d</Label>
                  <Input id="g-s60" type="number" value={form.price_60_secondary} onChange={(e) => setForm((f) => ({ ...f, price_60_secondary: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="g-sperm">Secondary Permanent</Label>
                  <Input id="g-sperm" type="number" value={form.price_permanent_secondary} onChange={(e) => setForm((f) => ({ ...f, price_permanent_secondary: e.target.value }))} />
                </div>
              </div>
              {discount && <Badge tone="red">Auto discount: {discount}%</Badge>}

              <div className="grid gap-3 rounded-xl bg-surface-2 p-3 sm:grid-cols-5">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <Switch checked={form.visible} onCheckedChange={(v) => setForm((f) => ({ ...f, visible: v }))} /> Visible
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <Switch checked={form.featured} onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))} /> Featured
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <Switch checked={form.trending} onCheckedChange={(v) => setForm((f) => ({ ...f, trending: v }))} /> Trending
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <Switch checked={form.hot_deal} onCheckedChange={(v) => setForm((f) => ({ ...f, hot_deal: v }))} /> Hot Deal
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <Switch checked={form.new_release} onCheckedChange={(v) => setForm((f) => ({ ...f, new_release: v }))} /> New Release
                </label>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="g-order">Display Order</Label>
                <Input
                  id="g-order"
                  type="number"
                  placeholder="Blank = automatic A–Z"
                  value={form.display_order}
                  onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Set a number to manually prioritize this game. Leave blank to automatically sort
                  alphabetically.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="glass" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="hero" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save Changes" : "Add Game"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <EditionsManager
          game={editionsGame}
          open={editionsGame !== null}
          onOpenChange={(v) => !v && setEditionsGame(null)}
        />
      </AdminShell>
    </AdminGate>
  );
}
