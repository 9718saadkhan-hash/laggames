import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_CONTACT,
  type CollabVideo,
  type ContactSettings,
  type Game,
  type HeroBanner,
  type OrderRow,
  type OttPlan,
  type PsPlusPlan,
  type Review,
} from "@/lib/lag";

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

export const gamesQuery = (opts?: { admin?: boolean }) =>
  queryOptions({
    queryKey: ["games", opts?.admin ? "admin" : "public"],
    queryFn: async () =>
      unwrap<Game[]>(
        (await supabase
          .from("games")
          .select("*")
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: false })) as never,
      ),
  });

export const gameQuery = (slug: string) =>
  queryOptions({
    queryKey: ["game", slug],
    queryFn: async () => {
      const res = await supabase.from("games").select("*").eq("slug", slug).maybeSingle();
      if (res.error) throw new Error(res.error.message);
      return res.data as Game | null;
    },
  });

export const psPlusQuery = queryOptions({
  queryKey: ["ps_plus_plans"],
  queryFn: async () =>
    unwrap<PsPlusPlan[]>(
      (await supabase
        .from("ps_plus_plans")
        .select("*")
        .order("display_order", { ascending: true })) as never,
    ),
});

export const ottQuery = queryOptions({
  queryKey: ["ott_plans"],
  queryFn: async () =>
    unwrap<OttPlan[]>(
      (await supabase.from("ott_plans").select("*").order("display_order", { ascending: true })) as never,
    ),
});

export const heroQuery = queryOptions({
  queryKey: ["hero_banners"],
  queryFn: async () =>
    unwrap<HeroBanner[]>(
      (await supabase
        .from("hero_banners")
        .select("*")
        .order("display_order", { ascending: true })) as never,
    ),
});

export const collabsQuery = queryOptions({
  queryKey: ["collab_videos"],
  queryFn: async () =>
    unwrap<CollabVideo[]>(
      (await supabase
        .from("collab_videos")
        .select("*")
        .order("display_order", { ascending: true })) as never,
    ),
});

export const reviewsQuery = (opts?: { approvedOnly?: boolean }) =>
  queryOptions({
    queryKey: ["reviews", opts?.approvedOnly ? "approved" : "all"],
    queryFn: async () => {
      let q = supabase.from("reviews").select("*").order("created_at", { ascending: false });
      if (opts?.approvedOnly) q = q.eq("status", "approved");
      return unwrap<Review[]>((await q) as never);
    },
  });

export const ordersQuery = (opts?: { userId?: string }) =>
  queryOptions({
    queryKey: ["orders", opts?.userId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (opts?.userId) q = q.eq("user_id", opts.userId);
      return unwrap<OrderRow[]>((await q) as never);
    },
  });

export const wishlistQuery = (userId?: string) =>
  queryOptions({
    queryKey: ["wishlist", userId ?? "none"],
    enabled: Boolean(userId),
    queryFn: async () => {
      const res = await supabase.from("wishlist").select("id, game_id, games(*)").eq("user_id", userId!);
      if (res.error) throw new Error(res.error.message);
      return (res.data ?? []) as unknown as { id: string; game_id: string; games: Game | null }[];
    },
  });

export const settingsQuery = queryOptions({
  queryKey: ["site_settings"],
  queryFn: async () => {
    const res = await supabase.from("site_settings").select("key, value");
    if (res.error) throw new Error(res.error.message);
    const map: Record<string, Record<string, unknown>> = {};
    for (const row of res.data ?? []) map[row.key as string] = (row.value ?? {}) as Record<string, unknown>;
    return map;
  },
});

export function contactFrom(settings?: Record<string, Record<string, unknown>>): ContactSettings {
  return { ...DEFAULT_CONTACT, ...((settings?.["contact"] ?? {}) as Partial<ContactSettings>) };
}

export const customersQuery = queryOptions({
  queryKey: ["customers"],
  queryFn: async () => {
    const res = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (res.error) throw new Error(res.error.message);
    return res.data as {
      id: string;
      full_name: string | null;
      email: string | null;
      phone: string | null;
      created_at: string;
    }[];
  },
});

export const contactMessagesQuery = queryOptions({
  queryKey: ["contact_messages"],
  queryFn: async () => {
    const res = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    if (res.error) throw new Error(res.error.message);
    return res.data as {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      message: string;
      created_at: string;
    }[];
  },
});
