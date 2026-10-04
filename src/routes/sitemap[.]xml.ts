import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://thelaggames.com";
const STATIC_PATHS = [
  "/",
  "/about",
  "/contact",
  "/deals",
  "/games",
  "/how-it-works",
  "/ott",
  "/policies",
  "/ps-plus",
  "/reviews",
  "/upcoming-games",
];

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const escapes: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&apos;",
    };
    return escapes[character] ?? character;
  });
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const backendUrl = process.env["SUPABASE_URL"];
        const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!backendUrl || !publishableKey) {
          return new Response("Sitemap data is temporarily unavailable", { status: 503 });
        }

        const client = createClient(backendUrl, publishableKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const headers = new Headers(init?.headers);
              if (publishableKey.startsWith("sb_") && headers.get("Authorization") === `Bearer ${publishableKey}`) {
                headers.delete("Authorization");
              }
              headers.set("apikey", publishableKey);
              return fetch(input, { ...init, headers });
            },
          },
        });

        const paths = new Set(STATIC_PATHS);
        const sources = [
          { table: "games", prefix: "/games/" },
          { table: "deals", prefix: "/deals/" },
          { table: "upcoming_games", prefix: "/upcoming-games/" },
        ] as const;

        for (const source of sources) {
          const pageSize = 500;
          for (let offset = 0; ; ) {
            const { data, error } = await client
              .from(source.table)
              .select("slug")
              .eq("visible", true)
              .not("slug", "is", null)
              .order("slug", { ascending: true })
              .range(offset, offset + pageSize - 1);
            if (error) throw error;
            if (!data?.length) break;
            for (const row of data) {
              if (row.slug) paths.add(`${source.prefix}${encodeURIComponent(row.slug)}`);
            }
            offset += data.length;
            if (data.length < pageSize) break;
          }
        }

        const urls = [...paths]
          .sort()
          .map((path) => `<url><loc>${escapeXml(new URL(path, BASE_URL).href)}</loc></url>`)
          .join("");
        const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          },
        });
      },
    },
  },
});