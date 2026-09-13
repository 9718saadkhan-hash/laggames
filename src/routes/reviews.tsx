import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, MessageSquareQuote, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { ImageUploadField } from "@/components/lag/ImageUploadField";
import { Badge, EmptyState, SectionHeading, StarRating } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/lag";
import { logCustomerActivity, reviewsQuery } from "@/lib/queries";
import { safePosition } from "@/lib/media";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Customer Reviews — LAG LIVE AS GAMERS" },
      {
        name: "description",
        content:
          "Read verified reviews from LAG customers and share your own experience with our game rentals and subscriptions.",
      },
      { property: "og:title", content: "Customer Reviews — LAG LIVE AS GAMERS" },
      {
        property: "og:description",
        content: "Real feedback from gamers who buy games, PS Plus and OTT subscriptions from LAG.",
      },
    ],
  }),
  component: ReviewsPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(60, "Name is too long"),
  rating: z.number().int().min(1, "Pick a rating").max(5),
  review: z.string().trim().min(10, "Tell us a little more (10+ characters)").max(700, "Keep it under 700 characters"),
});

function ReviewsPage() {
  const { profile, user } = useAuth();
  const { data: reviews = [], isLoading } = useQuery(reviewsQuery({ approvedOnly: true }));

  const [name, setName] = useState(profile?.full_name ?? "");
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ name, rating, review });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) map[String(issue.path[0])] = issue.message;
      setErrors(map);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        user_id: user?.id ?? null,
        name: parsed.data.name,
        rating: parsed.data.rating,
        review: parsed.data.review,
        image_url: imageUrl,
        status: "pending",
      } as never);
      if (error) throw error;
      if (user) {
        void logCustomerActivity({
          userId: user.id,
          action: "submitted a review",
          detail: parsed.data.review.slice(0, 80),
        });
      }
      toast.success("Thank you! Your review has been submitted and is waiting for approval.");
      setSubmitted(true);
      setReview("");
      setRating(5);
      setImageUrl(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit your review.");
    } finally {
      setSubmitting(false);
    }
  }

  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const sorted = [...reviews].sort((a, b) => Number(b.featured) - Number(a.featured));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <SectionHeading
        eyebrow="Community"
        title="Customer reviews"
        subtitle="Every review is read by a human before it goes live."
      />

      {reviews.length > 0 && (
        <div className="glass-strong mb-8 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-3xl p-5">
          <span className="font-display text-4xl font-bold text-gradient-lag">{average.toFixed(1)}</span>
          <div>
            <StarRating value={average} size={20} />
            <p className="mt-1 text-sm text-muted-foreground">
              Based on {reviews.length} approved review{reviews.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass h-28 animate-pulse rounded-3xl" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <EmptyState
              icon={MessageSquareQuote}
              title="No reviews yet"
              body="Be the first gamer to review LAG."
            />
          ) : (
            <ul className="space-y-4">
              {sorted.map((r) => (
                <li
                  key={r.id}
                  className={r.featured ? "glass-strong rounded-3xl p-5 ring-1 ring-lag-red/40" : "glass rounded-3xl p-5"}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-display font-bold">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                    </div>
                    <StarRating value={r.rating} />
                  </div>
                  {r.image_url && (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-border aspect-video">
                      <img
                        src={r.image_url}
                        alt={`Photo shared by ${r.name}`}
                        loading="lazy"
                        className="h-full w-full object-cover"
                        style={{ objectPosition: safePosition(r.image_position) }}
                      />
                    </div>
                  )}
                  <p className="mt-3 text-sm text-muted-foreground">{r.review}</p>
                  {r.featured && (
                    <div className="mt-3">
                      <Badge tone="red">Featured</Badge>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          {submitted ? (
            <div className="glass-strong rounded-3xl p-6 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-lag-blue" aria-hidden />
              <h2 className="mt-3 font-display text-lg font-bold">Thanks for the review!</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your review has been submitted and is waiting for approval.
              </p>
              <div className="mt-4">
                <Badge tone="neutral">Pending approval</Badge>
              </div>
              <Button variant="glass" className="mt-5 w-full" onClick={() => setSubmitted(false)}>
                Write another review
              </Button>
            </div>
          ) : (
            <form className="glass-strong rounded-3xl p-5" onSubmit={handleSubmit}>
              <h2 className="font-display text-lg font-bold">Write a review</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Share your experience. Our team checks it before it goes live on the site.
              </p>

              <div className="mt-4">
                <Label htmlFor="r-name">Your name</Label>
                <Input
                  id="r-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  aria-invalid={Boolean(errors["name"])}
                  className="mt-1.5"
                />
                {errors["name"] && <p className="mt-1 text-xs text-destructive">{errors["name"]}</p>}
              </div>

              <div className="mt-4">
                <span className="mb-1.5 block text-sm font-medium">Rating</span>
                <StarRating value={rating} onChange={setRating} size={26} />
                {errors["rating"] && <p className="mt-1 text-xs text-destructive">{errors["rating"]}</p>}
              </div>

              <div className="mt-4">
                <Label htmlFor="r-review">Your review</Label>
                <Textarea
                  id="r-review"
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  rows={5}
                  maxLength={700}
                  placeholder="How was your experience with LAG?"
                  aria-invalid={Boolean(errors["review"])}
                  className="mt-1.5"
                />
                {errors["review"] && <p className="mt-1 text-xs text-destructive">{errors["review"]}</p>}
              </div>

              <div className="mt-4">
                <ImageUploadField
                  value={imageUrl}
                  onChange={setImageUrl}
                  label="Add a photo (optional)"
                  purpose="review"
                  mediaFolder="reviews"
                />
              </div>

              <Button type="submit" variant="hero" className="mt-5 w-full" disabled={submitting}>
                <Send className="h-4 w-4" aria-hidden />
                {submitting ? "Submitting…" : "Submit review"}
              </Button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
