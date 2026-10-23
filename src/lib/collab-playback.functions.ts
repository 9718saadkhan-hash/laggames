import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

/** Sign only the file belonging to a publicly visible Collab; never accept file paths from callers. */
export const getCollabPlaybackUrl = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const key = process.env['SUPABASE_PUBLISHABLE_KEY'] ?? import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'];
    const url = process.env['SUPABASE_URL'] ?? import.meta.env['VITE_SUPABASE_URL'];
    const publicClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      } },
    });
    const { data: collab, error } = await publicClient.from("collab_videos")
      .select("storage_path").eq("id", data.id).eq("visible", true).maybeSingle();
    if (error || !collab?.storage_path || !/^collabs\/[\w-]+\.(mp4|webm|mov)$/i.test(collab.storage_path)) {
      throw new Error("This video is unavailable.");
    }
    // Visibility was verified through the public read policy before privileged storage signing.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const signed = await supabaseAdmin.storage.from("media").createSignedUrl(collab.storage_path, 60 * 60);
    if (signed.error || !signed.data?.signedUrl) throw new Error("Could not load this video. Please try again.");
    const playback = new URL(signed.data.signedUrl);
    const browserOrigin = new URL(import.meta.env['VITE_SUPABASE_URL']);
    playback.protocol = browserOrigin.protocol;
    playback.host = browserOrigin.host;
    return playback.href;
  });