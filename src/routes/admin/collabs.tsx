import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Video } from "lucide-react";
import { toast } from "sonner";

import { AdminGate, AdminShell } from "@/components/lag/AdminShell";
import { SectionHeading, EmptyState, Badge } from "@/components/lag/ui-bits";
import { supabase } from "@/integrations/supabase/client";
import { collabsQuery } from "@/lib/queries";
import { type CollabVideo } from "@/lib/lag";
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

export const Route = createFileRoute("/admin/collabs")({
  head: () => ({
    meta: [
      { title: "Manage Collabs — LAG Admin" },
      { name: "description", content: "Add, edit and manage collaboration and creator videos." },
      { property: "og:title", content: "Manage Collabs — LAG Admin" },
      { property: "og:description", content: "Add, edit and manage collaboration and creator videos." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminCollabsPage,
});

type F = {
  id?: string; title: string; description: string; url: string; thumbnail_url: string;
  storage_path: string | null; source: string;
  platform: string; visible: boolean; display_order: string;
};
const EMPTY: F = { title: "", description: "", url: "", thumbnail_url: "", storage_path: null, source: "upload", platform: "LAG", visible: true, display_order: "0" };

function toForm(c: CollabVideo): F {
  return {
    id: c.id, title: c.title, description: c.description ?? "", url: c.url ?? "",
    thumbnail_url: c.thumbnail_url ?? "", storage_path: c.storage_path ?? null,
    source: c.source ?? (c.storage_path ? "upload" : "link"),
    platform: c.platform, visible: c.visible,
    display_order: c.display_order?.toString() ?? "0",
  };
}
function toPayload(f: F) {
  if (!f.title.trim()) throw new Error("Title is required.");
  if (!f.storage_path && !f.url.trim()) throw new Error("Upload a video or paste a video link.");
  const num = (v: string) => (v.trim() === "" ? 0 : Number(v));
  return {
    title: f.title.trim(), description: f.description || null, url: f.url.trim() || null,
    thumbnail_url: f.thumbnail_url || null, storage_path: f.storage_path,
    source: f.storage_path ? "upload" : "link",
    platform: f.platform || "LAG", visible: f.visible,
    display_order: num(f.display_order),
  };
}

function AdminCollabsPage() {
  const { data: videos = [], isLoading, isError } = useQuery(collabsQuery);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<F>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["collab_videos"] });

  async function handleSave() {
    setSaving(true);
    try {
      const payload = toPayload(form);
      if (editingId) {
        const { error } = await supabase.from("collab_videos").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Video updated successfully.");
      } else {
        const { error } = await supabase.from("collab_videos").insert(payload);
        if (error) throw error;
        toast.success("Video added successfully.");
      }
      invalidate();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisible(c: CollabVideo) {
    const { error } = await supabase.from("collab_videos").update({ visible: !c.visible }).eq("id", c.id);
    if (error) toast.error(error.message); else invalidate();
  }
  async function handleDelete(id: string) {
    const { error } = await supabase.from("collab_videos").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Video deleted."); invalidate(); }
  }

  return (
    <AdminGate>
      <AdminShell>
        <SectionHeading eyebrow="Community" title="Manage Collabs" subtitle="Curate creator collaboration videos shown on the site."
          action={<Button variant="hero" onClick={() => { setEditingId(null); setForm(EMPTY); setOpen(true); }}><Plus className="h-4 w-4" /> Add Video</Button>} />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading videos…</p>
        ) : isError ? (
          <p className="text-sm text-lag-red">Failed to load videos.</p>
        ) : videos.length === 0 ? (
          <EmptyState icon={Video} title="No collab videos" body="Add your first collaboration video." />
        ) : (
          <div className="grid gap-3">
            {videos.map((c) => (
              <div key={c.id} className="glass flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
                {c.thumbnail_url ? (
                  <img src={c.thumbnail_url} alt={c.title} className="h-16 w-28 shrink-0 rounded-xl bg-surface-2 object-cover" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-bold">{c.title}</h3>
                    <Badge tone="blue">{c.platform}</Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{c.url}</p>
                  <label className="mt-2 flex items-center gap-1.5 text-xs">
                    <Switch checked={c.visible} onCheckedChange={() => toggleVisible(c)} /> Visible
                  </label>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="glass" size="sm" onClick={() => { setEditingId(c.id); setForm(toForm(c)); setOpen(true); }} aria-label={`Edit ${c.title}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="glass" size="sm" aria-label={`Delete ${c.title}`}><Trash2 className="h-4 w-4 text-lag-red" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><ADTitle>Delete "{c.title}"?</ADTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(c.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? "Edit Video" : "Add Video"}</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-1.5"><Label htmlFor="c-title">Title</Label><Input id="c-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label htmlFor="c-desc">Description</Label><Textarea id="c-desc" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
              <div className="space-y-1.5">
                <Label>Video file</Label>
                <VideoUploadField
                  value={{ url: form.storage_path ? form.url : null, storagePath: form.storage_path, thumbnail: form.thumbnail_url || null }}
                  onChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      url: v.url ?? (v.storagePath ? "" : f.storage_path ? "" : f.url),
                      storage_path: v.storagePath,
                      thumbnail_url: v.thumbnail ?? "",
                      source: v.storagePath ? "upload" : "link",
                    }))
                  }
                />
              </div>
              {!form.storage_path && (
                <div className="space-y-1.5">
                  <Label htmlFor="c-url">Or paste a video link (YouTube / Instagram)</Label>
                  <Input id="c-url" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Custom thumbnail (optional)</Label>
                <ImageUploadField
                  value={form.thumbnail_url || null}
                  onChange={(v) => setForm((f) => ({ ...f, thumbnail_url: v ?? "" }))}
                  purpose="game-banner"
                  label="Upload thumbnail"
                  mediaFolder="collabs"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="c-platform">Platform</Label><Input id="c-platform" value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label htmlFor="c-order">Display Order</Label><Input id="c-order" type="number" value={form.display_order} onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))} /></div>
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
