/**
 * Website Cleaner — finds and removes images that are no longer used,
 * duplicate copies, and heavy embedded images. Admin only.
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

type Ctx = { supabase: { rpc: (...a: never[]) => unknown }; userId: string };

async function assertAdmin(context: unknown) {
  const c = context as {
    supabase: { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };
    userId: string;
  };
  const { data, error } = await c.supabase.rpc("has_role", { _user_id: c.userId, _role: "admin" });
  if (error || !data) throw new Error("Admin access required.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
export type { Ctx };

type Admin = Awaited<ReturnType<typeof assertAdmin>>;

interface Usage {
  table: string;
  label: string;
  field: string;
}

async function collectContent(admin: Admin) {
  const parts: string[] = [];
  const values = new Map<string, Usage[]>();
  const embedded: { table: string; label: string; field: string; bytes: number }[] = [];

  const visit = (v: unknown, table: string, label: string, field: string) => {
    if (typeof v === "string") {
      if (v.startsWith("data:image") || v.includes("/storage/v1/") || v.startsWith("/") || v.startsWith("http")) {
        const list = values.get(v) ?? [];
        list.push({ table, label, field });
        values.set(v, list);
      }
      if (v.startsWith("data:image")) embedded.push({ table, label, field, bytes: Math.round((v.length * 3) / 4) });
    } else if (Array.isArray(v)) v.forEach((x, i) => visit(x, table, label, `${field}[${i + 1}]`));
    else if (v && typeof v === "object")
      Object.entries(v).forEach(([k, x]) => visit(x, table, label, field ? `${field}.${k}` : k));
  };

  for (const table of CONTENT_TABLES) {
    const { data, error } = await admin.from(table).select("*");
    if (error) throw new Error(`Could not read ${table}: ${error.message}`);
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      parts.push(JSON.stringify(row));
      const label = String(row["title"] ?? row["name"] ?? row["key"] ?? row["full_name"] ?? row["id"] ?? "");
      for (const [k, v] of Object.entries(row)) {
        if (["id", "slug", "description", "short_description", "review"].includes(k)) continue;
        visit(v, table, label, k);
      }
    }
  }
  return { blob: parts.join("\n"), values, embedded };
}

async function listFiles(admin: Admin) {
  const files: { path: string; bytes: number }[] = [];
  const walk = async (prefix: string) => {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await admin.storage.from("media").list(prefix, { limit: 1000, offset });
      if (error) throw new Error(error.message);
      for (const item of data ?? []) {
        const path = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.id) files.push({ path, bytes: Number((item.metadata as { size?: number } | null)?.size ?? 0) });
        else await walk(path);
      }
      if (!data || data.length < 1000) break;
    }
  };
  await walk("");
  return files;
}

async function analyse(admin: Admin) {
  const { blob, values, embedded } = await collectContent(admin);
  const { data: lib, error } = await admin.from("media_library").select("id, url, storage_path, size, created_at");
  if (error) throw new Error(error.message);

  const seen = new Set<string>();
  const unusedLibrary: { id: string; bytes: number }[] = [];
  const duplicateLibrary: { id: string; bytes: number }[] = [];
  for (const m of [...(lib ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const bytes = m.size ?? Math.round((m.url.length * 3) / 4);
    const used = values.has(m.url) || (!!m.storage_path && blob.includes(m.storage_path));
    if (!used) unusedLibrary.push({ id: m.id, bytes });
    else if (seen.has(m.url)) duplicateLibrary.push({ id: m.id, bytes });
    seen.add(m.url);
  }

  const files = await listFiles(admin);
  const unusedFiles = files.filter((f) => !blob.includes(f.path));

  const duplicates = [...values.entries()]
    .filter(([, uses]) => uses.length > 1)
    .map(([url, uses]) => ({
      preview: url.startsWith("data:") ? url.slice(0, 120_000) : url,
      embedded: url.startsWith("data:"),
      bytes: url.startsWith("data:") ? Math.round((url.length * 3) / 4) : 0,
      uses,
    }))
    .sort((a, b) => b.uses.length - a.uses.length)
    .slice(0, 40);

  return { lib: lib ?? [], unusedLibrary, duplicateLibrary, files, unusedFiles, duplicates, embedded, values };
}

const sum = (a: { bytes: number }[]) => a.reduce((s, x) => s + x.bytes, 0);

export const scanWebsiteMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context);
    const r = await analyse(admin);
    return {
      totals: {
        imagesInUse: r.values.size,
        storageFiles: r.files.length,
        storageBytes: sum(r.files),
        libraryEntries: r.lib.length,
        embeddedCount: r.embedded.length,
        embeddedBytes: sum(r.embedded),
      },
      unusedLibrary: { count: r.unusedLibrary.length, bytes: sum(r.unusedLibrary) },
      duplicateLibrary: { count: r.duplicateLibrary.length, bytes: sum(r.duplicateLibrary) },
      unusedFiles: { count: r.unusedFiles.length, bytes: sum(r.unusedFiles), paths: r.unusedFiles.slice(0, 50).map((f) => f.path) },
      duplicates: r.duplicates,
      heaviestEmbedded: [...r.embedded].sort((a, b) => b.bytes - a.bytes).slice(0, 30),
      scannedAt: new Date().toISOString(),
    };
  });

export const cleanupUnusedMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context);
    const r = await analyse(admin);

    const ids = [...r.unusedLibrary, ...r.duplicateLibrary].map((m) => m.id);
    for (let i = 0; i < ids.length; i += 100) {
      const { error } = await admin.from("media_library").delete().in("id", ids.slice(i, i + 100));
      if (error) throw new Error(error.message);
    }
    const paths = r.unusedFiles.map((f) => f.path);
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await admin.storage.from("media").remove(paths.slice(i, i + 100));
      if (error) throw new Error(error.message);
    }
    return {
      libraryRemoved: ids.length,
      filesRemoved: paths.length,
      bytesFreed: sum(r.unusedLibrary) + sum(r.duplicateLibrary) + sum(r.unusedFiles),
    };
  });
