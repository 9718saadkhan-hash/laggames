import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_CONTACT,
  type ActivityEntry,
  type CollabVideo,
  type Deal,
  type UpcomingGame,
  type ContactSettings,
  type Game,
  type GameEdition,
  type HeroBanner,
  type OrderRow,
  type OttPlan,
  type PsPlusPlan,
  type Review,
  type CustomerActivity,
  type CustomerSession,
} from "@/lib/lag";
import { describeDevice, sortGamesByOrder } from "@/lib/lag";
import type { MediaItem } from "@/lib/media";

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

export const gamesQuery = (opts?: { admin?: boolean }) =>
  queryOptions({
    queryKey: ["games", opts?.admin ? "admin" : "public"],
    queryFn: async () =>
      sortGamesByOrder(
        unwrap<Game[]>(
          (await supabase
            .from("games")
            .select("*")
            .order("display_order", { ascending: true, nullsFirst: false })
            .order("title", { ascending: true })) as never,
        ),
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

export const dealsQuery = (opts?: { admin?: boolean }) =>
  queryOptions({
    queryKey: ["deals", opts?.admin ? "admin" : "public"],
    queryFn: async () =>
      unwrap<Deal[]>(
        (await supabase
          .from("deals")
          .select("*")
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: false })) as never,
      ),
  });

/** Game ids attached to each deal (join rows only — games come from the catalogue). */
export const dealGamesQuery = queryOptions({
  queryKey: ["deal_games"],
  queryFn: async () => {
    const res = await supabase
      .from("deal_games")
      .select("deal_id, game_id, display_order")
      .order("display_order", { ascending: true });
    if (res.error) throw new Error(res.error.message);
    return (res.data ?? []) as { deal_id: string; game_id: string; display_order: number }[];
  },
});

export const upcomingGamesQuery = (opts?: { admin?: boolean }) =>
  queryOptions({
    queryKey: ["upcoming_games", opts?.admin ? "admin" : "public"],
    queryFn: async () =>
      unwrap<UpcomingGame[]>(
        (await supabase
          .from("upcoming_games")
          .select("*")
          .order("display_order", { ascending: true })
          .order("release_date", { ascending: true })) as never,
      ),
  });

export const activityLogQuery = queryOptions({
  queryKey: ["activity_log"],
  queryFn: async () =>
    unwrap<ActivityEntry[]>(
      (await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300)) as never,
    ),
});

/** Fire-and-forget audit trail entry. Never blocks the caller's UI. */
export async function logActivity(entry: {
  action: string;
  entityType?: string;
  entityId?: string | null;
  entityLabel?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  meta?: Record<string, unknown>;
}) {
  try {
    await supabase.from("activity_log").insert({
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      entity_label: entry.entityLabel ?? null,
      actor_id: entry.actorId ?? null,
      actor_name: entry.actorName ?? null,
      meta: (entry.meta ?? {}) as never,
    });
  } catch {
    /* logging must never break a user action */
  }
}

/* --------------------------------------------------------- detail pages */

export const dealBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["deal", slug],
    queryFn: async () => {
      const res = await supabase.from("deals").select("*").eq("slug", slug).maybeSingle();
      if (res.error) throw new Error(res.error.message);
      return res.data as Deal | null;
    },
  });

export const upcomingGameQuery = (slug: string) =>
  queryOptions({
    queryKey: ["upcoming_game", slug],
    queryFn: async () => {
      const res = await supabase.from("upcoming_games").select("*").eq("slug", slug).maybeSingle();
      if (res.error) throw new Error(res.error.message);
      return res.data as UpcomingGame | null;
    },
  });

/* ------------------------------------------------------- media library */

export const mediaLibraryQuery = queryOptions({
  queryKey: ["media_library"],
  queryFn: async () =>
    unwrap<MediaItem[]>(
      (await supabase
        .from("media_library")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(400)) as never,
    ),
});

/* ------------------------------------------------- customer intelligence */

export const customerSessionsQuery = (userId?: string) =>
  queryOptions({
    queryKey: ["customer_sessions", userId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("customer_sessions")
        .select("*")
        .order("last_active_at", { ascending: false })
        .limit(200);
      if (userId) q = q.eq("user_id", userId);
      return unwrap<CustomerSession[]>((await q) as never);
    },
  });

export const customerActivityQuery = (userId?: string) =>
  queryOptions({
    queryKey: ["customer_activity", userId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("customer_activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (userId) q = q.eq("user_id", userId);
      return unwrap<CustomerActivity[]>((await q) as never);
    },
  });

/** All wishlist rows (admin analytics). */
export const wishlistAllQuery = queryOptions({
  queryKey: ["wishlist", "all"],
  queryFn: async () => {
    const res = await supabase
      .from("wishlist")
      .select("id, user_id, game_id, created_at, games(title, slug, cover_url)")
      .order("created_at", { ascending: false });
    if (res.error) throw new Error(res.error.message);
    return (res.data ?? []) as unknown as {
      id: string;
      user_id: string;
      game_id: string;
      created_at: string;
      games: { title: string; slug: string; cover_url: string | null } | null;
    }[];
  },
});

/** Fire-and-forget customer activity entry. */
export async function logCustomerActivity(entry: {
  userId: string;
  action: string;
  detail?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}) {
  try {
    await supabase.from("customer_activity").insert({
      user_id: entry.userId,
      action: entry.action,
      detail: entry.detail ?? null,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
    } as never);
  } catch {
    /* never block the UI */
  }
}

/** Record (or refresh) the current browser session for account security views. */
export async function touchSession(userId: string) {
  if (typeof navigator === "undefined") return;
  const ua = navigator.userAgent;
  const info = describeDevice(ua);
  const key = `lag-session-${userId}`;
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) {
      await supabase
        .from("customer_sessions")
        .update({ last_active_at: new Date().toISOString() } as never)
        .eq("id", existing);
      return;
    }
    const res = await supabase
      .from("customer_sessions")
      .insert({ user_id: userId, user_agent: ua.slice(0, 300), ...info } as never)
      .select("id")
      .maybeSingle();
    const id = (res.data as { id?: string } | null)?.id;
    if (id) window.localStorage.setItem(key, id);
  } catch {
    /* session bookkeeping is best effort */
  }
}

/** Editions for one game (empty when the game has no alternate editions). */
export const gameEditionsQuery = (gameId?: string, opts?: { admin?: boolean }) =>
  queryOptions({
    queryKey: ["game_editions", gameId ?? "none", opts?.admin ? "admin" : "public"],
    enabled: Boolean(gameId),
    queryFn: async () => {
      let q = supabase
        .from("game_editions")
        .select("*")
        .eq("game_id", gameId!)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (!opts?.admin) q = q.eq("visible", true);
      return unwrap<GameEdition[]>((await q) as never);
    },
  });
