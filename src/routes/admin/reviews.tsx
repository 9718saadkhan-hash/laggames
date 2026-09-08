import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Star, Trash2, Pencil, Check, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AdminGate, AdminShell } from "@/components/lag/AdminShell";
import { SectionHeading, EmptyState, Badge, StarRating } from "@/components/lag/ui-bits";
import { supabase } from "@/integrations/supabase/client";
import { reviewsQuery } from "@/lib/queries";
import { formatDate, type Review } from "@/lib/lag";
import { AdminSearch, useAdminSearch } from "@/components/lag/AdminSearch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle as ADTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/reviews")({
  head: () => ({
    meta: [
      { title: "Manage Reviews — LAG Admin" },
      { name: "description", content: "Approve, feature and moderate customer reviews." },
      { property: "og:title", content: "Manage Reviews — LAG Admin" },
      { property: "og:description", content: "Approve, feature and moderate customer reviews." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminReviewsPage,
});

function statusTone(status: string): "red" | "blue" | "neutral" {
  if (status === "approved") return "blue";
  if (status === "rejected") return "red";
  return "neutral";
}

function AdminReviewsPage() {
  const { data: reviews = [], isLoading, isError } = useQuery(reviewsQuery());
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Review | null>(null);
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [saving, setSaving] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["reviews"] });

  const byStatus = filter === "all" ? reviews : reviews.filter((r) => r.status === filter);
  const { query, setQuery, results: filtered } = useAdminSearch(byStatus, (r) => [
    r.name, r.review, r.status, r.admin_note,
  ]);

  async function setStatus(r: Review, status: string) {
    const { error } = await supabase.from("reviews").update({ status }).eq("id", r.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Review ${status}.`);
      invalidate();
    }
  }
  async function toggleFeatured(r: Review) {
    const { error } = await supabase.from("reviews").update({ featured: !r.featured }).eq("id", r.id);
    if (error) toast.error(error.message);
    else invalidate();
  }
  async function handleDelete(id: string) {
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Review deleted.");
      invalidate();
    }
  }

  function openEdit(r: Review) {
    setEditing(r);
    setText(r.review);
    setRating(r.rating);
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("reviews").update({ review: text, rating }).eq("id", editing.id);
      if (error) throw error;
      toast.success("Review updated successfully.");
      invalidate();
      setEditing(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminGate>
      <AdminShell>
        <SectionHeading
          eyebrow="Community"
          title="Manage Reviews"
          subtitle="Only reviews with status 'approved' are shown publicly on the site."
          action={
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40" aria-label="Filter by status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        <AdminSearch value={query} onChange={setQuery} placeholder="Search reviews by customer name or text…" count={filtered.length} label="reviews" />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading reviews…</p>
        ) : isError ? (
          <p className="text-sm text-lag-red">Failed to load reviews.</p>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Star} title="No reviews found" body="Customer reviews will appear here." />
        ) : (
          <div className="grid gap-3">
            {filtered.map((r) => (
              <div key={r.id} className="glass flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-bold">{r.name}</h3>
                    <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                    {r.featured && <Badge tone="blue">Featured</Badge>}
                  </div>
                  <StarRating value={r.rating} size={14} />
                  <p className="mt-2 text-sm text-muted-foreground">{r.review}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button variant="glass" size="sm" onClick={() => setStatus(r, "approved")} aria-label="Approve review">
                    <Check className="h-4 w-4 text-lag-blue" />
                  </Button>
                  <Button variant="glass" size="sm" onClick={() => setStatus(r, "rejected")} aria-label="Reject review">
                    <X className="h-4 w-4 text-lag-red" />
                  </Button>
                  <Button variant="glass" size="sm" onClick={() => toggleFeatured(r)} aria-label="Toggle featured">
                    <Sparkles className={r.featured ? "h-4 w-4 text-lag-red" : "h-4 w-4"} />
                  </Button>
                  <Button variant="glass" size="sm" onClick={() => openEdit(r)} aria-label="Edit review">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="glass" size="sm" aria-label="Delete review"><Trash2 className="h-4 w-4 text-lag-red" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><ADTitle>Delete this review?</ADTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(r.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={Boolean(editing)} onOpenChange={(v) => !v && setEditing(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Edit Review</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <StarRating value={rating} onChange={setRating} />
              <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} aria-label="Review text" />
            </div>
            <DialogFooter>
              <Button variant="glass" onClick={() => setEditing(null)}>Cancel</Button>
              <Button variant="hero" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AdminShell>
    </AdminGate>
  );
}
