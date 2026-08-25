import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Badge, EmptyState, GlassIcon } from "@/components/lag/ui-bits";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatDate, money, type Review } from "@/lib/lag";
import { ordersQuery, wishlistQuery } from "@/lib/queries";
import { Heart, LogIn, LogOut, Package, Star, UserRound } from "lucide-react";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My Account — LAG LIVE AS GAMERS" },
      { name: "description", content: "Manage your LAG profile, orders, wishlist and reviews." },
      { property: "og:title", content: "My Account — LAG LIVE AS GAMERS" },
      { property: "og:description", content: "Manage your LAG profile, orders, wishlist and reviews." },
    ],
  }),
  component: AccountPage,
});

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name."),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  avatarUrl: z.string().trim().url("Enter a valid URL.").optional().or(z.literal("")),
});

function initialsOf(name?: string | null, email?: string | null) {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function AccountPage() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();

  if (!loading && !user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <EmptyState
          icon={LogIn}
          title="Sign in required"
          body="Sign in to view your profile, orders, wishlist and reviews."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild variant="hero" size="lg">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild variant="glass" size="lg">
                <Link to="/register">Create account</Link>
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="glass h-64 animate-pulse rounded-3xl" />
      </div>
    );
  }

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out.");
    void navigate({ to: "/" });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-bold tracking-[0.24em] text-lag-red">MY ACCOUNT</p>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            {profile?.full_name || user.email}
          </h1>
        </div>
        <Button variant="glass" size="sm" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </Button>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="glass mb-6 h-auto flex-wrap gap-1 rounded-2xl bg-transparent p-1.5">
          <TabsTrigger value="profile" className="rounded-xl px-4 py-2">
            <UserRound className="mr-1.5 h-4 w-4" aria-hidden /> Profile
          </TabsTrigger>
          <TabsTrigger value="orders" className="rounded-xl px-4 py-2">
            <Package className="mr-1.5 h-4 w-4" aria-hidden /> Orders
          </TabsTrigger>
          <TabsTrigger value="wishlist" className="rounded-xl px-4 py-2">
            <Heart className="mr-1.5 h-4 w-4" aria-hidden /> Wishlist
          </TabsTrigger>
          <TabsTrigger value="reviews" className="rounded-xl px-4 py-2">
            <Star className="mr-1.5 h-4 w-4" aria-hidden /> My Reviews
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab userId={user.id} email={user.email ?? ""} refreshProfile={refreshProfile} />
        </TabsContent>
        <TabsContent value="orders">
          <OrdersTab userId={user.id} />
        </TabsContent>
        <TabsContent value="wishlist">
          <WishlistTab userId={user.id} />
        </TabsContent>
        <TabsContent value="reviews">
          <ReviewsTab userId={user.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileTab({
  userId,
  email,
  refreshProfile,
}: {
  userId: string;
  email: string;
  refreshProfile: () => Promise<void>;
}) {
  const { profile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string; avatarUrl?: string }>({});

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
    setAvatarUrl(profile?.avatar_url ?? "");
  }, [profile?.full_name, profile?.phone, profile?.avatar_url]);

  const save = useMutation({
    mutationFn: async () => {
      const parsed = profileSchema.safeParse({ fullName, phone, avatarUrl });
      if (!parsed.success) {
        const fieldErrors: typeof errors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0] as keyof typeof errors;
          fieldErrors[key] = issue.message;
        }
        setErrors(fieldErrors);
        throw new Error("validation");
      }
      setErrors({});
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        full_name: parsed.data.fullName,
        email,
        phone: parsed.data.phone || null,
        avatar_url: parsed.data.avatarUrl || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success("Profile updated.");
      await refreshProfile();
    },
    onError: (e) => {
      if (e.message !== "validation") toast.error(e.message);
    },
  });

  return (
    <div className="glass rounded-3xl p-6 sm:p-8">
      <div className="flex flex-col items-center gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
        <Avatar className="h-20 w-20 ring-2 ring-border">
          <AvatarImage src={avatarUrl || undefined} alt="" />
          <AvatarFallback className="font-display text-xl font-bold text-lag-blue">
            {initialsOf(fullName, email)}
          </AvatarFallback>
        </Avatar>
        <div className="text-center sm:text-left">
          <p className="font-display text-lg font-bold">{fullName || "Add your name"}</p>
          <p className="text-sm text-muted-foreground">{email}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Member since {formatDate(profile?.created_at)}
          </p>
        </div>
      </div>

      <form
        className="mt-6 grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} aria-invalid={Boolean(errors.fullName)} />
          {errors.fullName && <p className="text-xs font-medium text-lag-red">{errors.fullName}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} readOnly disabled className="opacity-70" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={Boolean(errors.phone)} />
          {errors.phone && <p className="text-xs font-medium text-lag-red">{errors.phone}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="avatarUrl">Avatar URL (optional)</Label>
          <Input id="avatarUrl" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} aria-invalid={Boolean(errors.avatarUrl)} placeholder="https://…" />
          {errors.avatarUrl && <p className="text-xs font-medium text-lag-red">{errors.avatarUrl}</p>}
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" variant="hero" size="lg" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function OrdersTab({ userId }: { userId: string }) {
  const { data, isLoading, isError } = useQuery(ordersQuery({ userId }));

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass h-20 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }
  if (isError) return <EmptyState icon={Package} title="Couldn't load orders" body="Please refresh and try again." />;
  if (!data || data.length === 0)
    return <EmptyState icon={Package} title="No orders yet" body="Your order history will show up here once you place one." />;

  return (
    <div className="space-y-3">
      {data.map((order) => (
        <div key={order.id} className="glass rounded-2xl p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-sm font-bold tracking-wide text-lag-blue">
                {order.order_code}
              </p>
              <p className="mt-1 truncate font-semibold">{order.product_name}</p>
              <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                {order.platform && <span>{order.platform}</span>}
                {order.option_type && <span>· {order.option_type}</span>}
                {order.duration && <span>· {order.duration}</span>}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge tone={order.status === "Completed" ? "blue" : order.status === "Cancelled" ? "neutral" : "red"}>
                {order.status}
              </Badge>
              <span className="font-display font-bold">{money(order.price)}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
        </div>
      ))}
    </div>
  );
}

function WishlistTab({ userId }: { userId: string }) {
  const { data } = useQuery(wishlistQuery(userId));
  const count = (data ?? []).filter((w) => w.games !== null).length;
  return (
    <div className="glass flex flex-col items-center gap-4 rounded-3xl p-8 text-center sm:flex-row sm:justify-between sm:text-left">
      <div className="flex items-center gap-4">
        <GlassIcon icon={Heart} tone="red" />
        <div>
          <p className="font-display text-lg font-bold">
            {count} game{count === 1 ? "" : "s"} saved
          </p>
          <p className="text-sm text-muted-foreground">Head to your wishlist to review or order them.</p>
        </div>
      </div>
      <Button asChild variant="hero" size="lg">
        <Link to="/wishlist">View wishlist</Link>
      </Button>
    </div>
  );
}

function ReviewsTab({ userId }: { userId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-reviews", userId],
    queryFn: async () => {
      const res = await supabase
        .from("reviews")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (res.error) throw new Error(res.error.message);
      return (res.data ?? []) as Review[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="glass h-20 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }
  if (isError) return <EmptyState icon={Star} title="Couldn't load reviews" body="Please refresh and try again." />;
  if (!data || data.length === 0)
    return <EmptyState icon={Star} title="No reviews yet" body="Share your experience after your next order." />;

  return (
    <div className="space-y-3">
      {data.map((review) => (
        <div key={review.id} className="glass rounded-2xl p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < review.rating ? "fill-lag-red text-lag-red" : "text-muted-foreground/40"}`}
                  aria-hidden
                />
              ))}
            </div>
            <Badge tone={review.status === "approved" ? "blue" : review.status === "rejected" ? "neutral" : "red"}>
              {review.status}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{review.review}</p>
          <p className="mt-2 text-xs text-muted-foreground">{formatDate(review.created_at)}</p>
        </div>
      ))}
    </div>
  );
}
