/**
 * Removes images that are no longer used anywhere on the website:
 * - media library records whose image isn't referenced by any content row
 * - files in the media storage bucket that no content row points to
 * Admin only.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CONTENT_TABLES = [
  "games",
  "upcoming_games",
  "deals",
  "hero_banners",
  "ps_plus_plans",
  "ott_plans",
  "reviews",
  "collab_videos",
  "profiles",
  "site_settings",
  "game_editions",
] as const;

export const cleanupUnusedMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Admin access required.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Everything that is currently in use, as one searchable blob + exact-value set.
    const parts: string[] = [];
    const values = new Set<string>();
    const collect = (v: unknown) => {
      if (typeof v === "string") values.add(v);
      else if (Array.isArray(v)) v.forEach(collect);
      else if (v && typeof v === "object") Object.values(v).forEach(collect);
    };
    for (const table of CONTENT_TABLES) {
      const { data, error } = await supabaseAdmin.from(table).select("*");
      if (error) throw new Error(`Could not read ${table}: ${error.message}`);
      for (const row of data ?? []) {
        collect(row);
        parts.push(JSON.stringify(row));
      }
    }
    const blob = parts.join("\n");

    // 1. Media library records no longer used.
    const { data: lib, error: libErr } = await supabaseAdmin
      .from("media_library")
      .select("id, url, storage_path");
    if (libErr) throw new Error(libErr.message);
    const unusedIds = (lib ?? [])
      .filter((m) => !values.has(m.url) && !(m.storage_path && blob.includes(m.storage_path)))
      .map((m) => m.id);
    for (let i = 0; i < unusedIds.length; i += 100) {
      const { error } = await supabaseAdmin.from("media_library").delete().in("id", unusedIds.slice(i, i + 100));
      if (error) throw new Error(error.message);
    }

    // 2. Storage files no longer referenced.
    const files: string[] = [];
    const walk = async (prefix: string) => {
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabaseAdmin.storage.from("media").list(prefix, { limit: 1000, offset });
        if (error) throw new Error(error.message);
        for (const item of data ?? []) {
          const path = prefix ? `${prefix}/${item.name}` : item.name;
          if (item.id) files.push(path);
          else await walk(path);
        }
        if (!data || data.length < 1000) break;
      }
    };
    await walk("");
    const unusedFiles = files.filter((p) => !blob.includes(p));
    for (let i = 0; i < unusedFiles.length; i += 100) {
      const { error } = await supabaseAdmin.storage.from("media").remove(unusedFiles.slice(i, i + 100));
      if (error) throw new Error(error.message);
    }

    return { libraryRemoved: unusedIds.length, filesRemoved: unusedFiles.length };
  });
