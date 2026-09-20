/**
 * Auto-Fill Game Information.
 *
 * Retrieves missing game metadata from IGDB (Twitch-authenticated) and fills ONLY
 * the empty fields of existing games. Never overwrites data that already exists,
 * never touches existing values, prices, images, ordering, flags or visibility.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const AUTOFILL_FIELDS = [
  "genre",
  "game_size",
  "developer",
  "publisher",
  "rating",
  "release_date",
  "short_description",
  "description",
] as const;
export type AutofillField = (typeof AUTOFILL_FIELDS)[number];

export interface AutofillResult {
  id: string;
  title: string;
  status: "updated" | "needs_review" | "no_data" | "skipped";
  filled: AutofillField[];
  unresolved: AutofillField[];
  /** Fields that already had a value and were left untouched. */
  alreadyFilled: AutofillField[];
  note: string | null;
  match: string | null;
  confidence: number;
}

const IGDB_PLATFORMS: Record<string, number[]> = {
  PS4: [48],
  PS5: [167],
  "PS4 & PS5": [167, 48],
};

/* ---------------------------------------------------------------- IGDB auth */

let tokenCache: { token: string; expires: number } | null = null;

async function igdbToken(): Promise<{ id: string; token: string }> {
  const id = process.env["TWITCH_CLIENT_ID"];
  const secret = process.env["TWITCH_CLIENT_SECRET"];
  if (!id || !secret) {
    throw new Error(
      "IGDB is not configured yet. Add the Twitch Client ID and Client Secret, then try again.",
    );
  }
  if (tokenCache && tokenCache.expires > Date.now() + 60_000) {
    return { id, token: tokenCache.token };
  }
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(id)}&client_secret=${encodeURIComponent(secret)}&grant_type=client_credentials`,
    { method: "POST" },
  );
  const body = (await res.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; message?: string }
    | null;
  if (!res.ok || !body?.access_token) {
    throw new Error(
      `Could not sign in to IGDB [${res.status}]: ${body?.message ?? "check the Twitch Client ID and Secret"}`,
    );
  }
  tokenCache = {
    token: body.access_token,
    expires: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
  return { id, token: body.access_token };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface IgdbCompany {
  developer?: boolean;
  publisher?: boolean;
  company?: { name?: string };
}
interface IgdbGame {
  id: number;
  name: string;
  genres?: { name: string }[];
  platforms?: number[];
  total_rating?: number;
  total_rating_count?: number;
  aggregated_rating?: number;
  aggregated_rating_count?: number;
  first_release_date?: number;
  involved_companies?: IgdbCompany[];
  release_dates?: { platform?: number; date?: number }[];
  alternative_names?: { name?: string }[];
  version_parent?: number;
  summary?: string;
  storyline?: string;
}

const FIELDS =
  "fields name,genres.name,platforms,total_rating,total_rating_count,aggregated_rating," +
  "aggregated_rating_count,first_release_date,involved_companies.developer," +
  "involved_companies.publisher,involved_companies.company.name,release_dates.platform," +
  "release_dates.date,alternative_names.name,version_parent,summary,storyline";

/** IGDB query with exponential backoff on rate limits / transient failures. */
async function igdbQuery(body: string): Promise<IgdbGame[]> {
  const { id, token } = await igdbToken();
  let delay = 600;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": id,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "text/plain",
      },
      body,
    });
    if (res.ok) return (await res.json()) as IgdbGame[];
    const text = await res.text().catch(() => "");
    if (res.status === 429 || res.status >= 500) {
      await sleep(delay);
      delay *= 2;
      continue;
    }
    throw new Error(`IGDB request failed [${res.status}]: ${text.slice(0, 200)}`);
  }
  throw new Error("IGDB is rate limiting right now. Try again in a moment.");
}

/* ------------------------------------------------------------ match scoring */

function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/\b(ps4|ps5|playstation\s*[45]?|edition|standard)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreCandidate(
  candidate: IgdbGame,
  title: string,
  platformIds: number[],
): { score: number; exact: boolean } {
  const target = norm(title);
  const names = [candidate.name, ...(candidate.alternative_names ?? []).map((a) => a.name ?? "")]
    .filter(Boolean)
    .map(norm);
  const exact = names.includes(target);
  let score = 0;
  if (exact) score += 55;
  else if (names.some((n) => n.startsWith(target) || target.startsWith(n))) score += 28;
  else if (names.some((n) => n.includes(target) || target.includes(n))) score += 14;

  const platforms = candidate.platforms ?? [];
  if (platformIds.some((p) => platforms.includes(p))) score += 30;
  else if (platforms.length) score -= 15;

  if (candidate.involved_companies?.length) score += 8;
  if (candidate.genres?.length) score += 4;
  if (candidate.first_release_date) score += 3;
  if (candidate.version_parent) score -= 10;
  return { score: Math.max(0, Math.min(100, score)), exact };
}

/* ------------------------------------------------------------ field mapping */

function pickGenre(g: IgdbGame): string | null {
  const names = (g.genres ?? []).map((x) => x.name).filter(Boolean);
  return names.length ? names.join(", ") : null;
}

function pickCompany(g: IgdbGame, kind: "developer" | "publisher"): string | null {
  const names = (g.involved_companies ?? [])
    .filter((c) => c[kind])
    .map((c) => c.company?.name)
    .filter((n): n is string => Boolean(n));
  return names.length ? Array.from(new Set(names)).join(", ") : null;
}

/** IGDB scores are 0–100; the site stores a 0–5 score. Only use well-rated entries. */
function pickRating(g: IgdbGame): number | null {
  if (typeof g.total_rating === "number" && (g.total_rating_count ?? 0) >= 5) {
    return Math.round((g.total_rating / 20) * 10) / 10;
  }
  if (typeof g.aggregated_rating === "number" && (g.aggregated_rating_count ?? 0) >= 3) {
    return Math.round((g.aggregated_rating / 20) * 10) / 10;
  }
  return null;
}

function toIsoDate(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

/** Prefer the release date of the platform stored for this game. */
function pickReleaseDate(g: IgdbGame, platformIds: number[]): string | null {
  const dates = (g.release_dates ?? []).filter((d) => typeof d.date === "number");
  for (const pid of platformIds) {
    const hits = dates.filter((d) => d.platform === pid).map((d) => d.date as number);
    if (hits.length) return toIsoDate(Math.min(...hits));
  }
  if (typeof g.first_release_date === "number") return toIsoDate(g.first_release_date);
  return null;
}

function cleanDescription(value?: string): string | null {
  if (!value?.trim()) return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length >= 40 ? cleaned : null;
}

/** Keep only complete source sentences so shortened text never invents or alters facts. */
function pickShortDescription(g: IgdbGame): string | null {
  const source = cleanDescription(g.summary);
  if (!source) return null;
  const sentences = source.match(/[^.!?]+[.!?]+(?:["']|$)?/g)?.map((part) => part.trim()) ?? [];
  const concise = sentences.slice(0, 2).join(" ");
  if (concise.length >= 40 && concise.length <= 360) return concise;
  if (sentences[0] && sentences[0].length >= 40) return sentences[0];
  return source.length <= 360 ? source : null;
}

/** IGDB summary is preferred because it is factual, public-facing, and less spoiler-prone than storyline. */
function pickDescription(g: IgdbGame): string | null {
  return cleanDescription(g.summary);
}

const isEmpty = (v: unknown) => v === null || v === undefined || (typeof v === "string" && !v.trim());

/* ----------------------------------------------------------- server function */

const Input = z.object({
  ids: z.array(z.string().uuid()).min(1).max(8),
  /** Retry mode searches extra title variants instead of repeating the same failed lookup. */
  retry: z.boolean().optional(),
});

const LABEL: Record<AutofillField, string> = {
  genre: "Genre",
  game_size: "Game Size (enter manually — not published anywhere)",
  developer: "Developer",
  publisher: "Publisher",
  rating: "Rating (not enough reviews to be reliable)",
  release_date: "Release Date",
  short_description: "Short Description (no reliable IGDB summary found)",
  description: "Description (no reliable IGDB summary found)",
};

/** Alternative spellings of a stored title, used only when the plain search fails. */
function titleVariants(title: string): string[] {
  const base = title.replace(/"/g, " ").trim();
  const out = [base];
  const noPlatform = base.replace(/\b(ps4|ps5|playstation\s*[45]?)\b/gi, " ").replace(/\s+/g, " ").trim();
  const noEdition = noPlatform
    .replace(/\b(standard|deluxe|ultimate|gold|complete|definitive|remastered|goty)\b/gi, " ")
    .replace(/\b(edition|bundle|version)\b/gi, " ")
    .replace(/[-–—]\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  const noSubtitle = noEdition.split(/[:\-–—]/)[0]?.trim() ?? "";
  const roman = noEdition.replace(/\b1\b/g, "").replace(/\s+/g, " ").trim();
  for (const v of [noPlatform, noEdition, roman, noSubtitle]) {
    if (v.length >= 3 && !out.includes(v)) out.push(v);
  }
  return out;
}

async function searchCandidates(title: string, retry: boolean): Promise<IgdbGame[]> {
  const variants = retry ? titleVariants(title) : [title.replace(/"/g, " ").trim()];
  const seen = new Map<number, IgdbGame>();
  for (const variant of variants) {
    const rows = await igdbQuery(`search "${variant}"; ${FIELDS}; limit 12;`);
    for (const row of rows) if (!seen.has(row.id)) seen.set(row.id, row);
    if (seen.size && !retry) break;
    if (seen.size >= 20) break;
    if (retry) await sleep(280);
  }
  return Array.from(seen.values());
}

export const autofillGames = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data, context }): Promise<AutofillResult[]> => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Admin access required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: games, error } = await supabaseAdmin
      .from("games")
      .select(
        "id,title,platform,genre,game_size,developer,publisher,rating,release_date,short_description,description,metadata_fields",
      )
      .in("id", data.ids);
    if (error) throw new Error(error.message);

    const results: AutofillResult[] = [];

    for (const game of games ?? []) {
      const missing = AUTOFILL_FIELDS.filter(
        (f) => isEmpty((game as unknown as Record<string, unknown>)[f]),
      );
      const alreadyFilled = AUTOFILL_FIELDS.filter((f) => !missing.includes(f));

      if (missing.length === 0) {
        results.push({
          id: game.id,
          title: game.title,
          status: "skipped",
          filled: [],
          unresolved: [],
          alreadyFilled,
          note: "All fields already filled",
          match: null,
          confidence: 100,
        });
        continue;
      }

      // Install size is not published by any game database — never spend a lookup on it alone.
      if (missing.length === 1 && missing[0] === "game_size") {
        const sizeNote = "Install size must be entered manually — no database publishes it.";
        await supabaseAdmin
          .from("games")
          .update({ metadata_status: "needs_review", metadata_note: sizeNote })
          .eq("id", game.id);
        results.push({
          id: game.id,
          title: game.title,
          status: "needs_review",
          filled: [],
          unresolved: missing,
          alreadyFilled,
          note: sizeNote,
          match: null,
          confidence: 100,
        });
        continue;
      }

      const platformIds = IGDB_PLATFORMS[game.platform] ?? [167, 48];
      let candidates: IgdbGame[] = [];
      try {
        candidates = await searchCandidates(game.title, data.retry === true);
      } catch (err) {
        results.push({
          id: game.id,
          title: game.title,
          status: "needs_review",
          filled: [],
          unresolved: missing,
          alreadyFilled,
          note: err instanceof Error ? err.message : "Lookup failed",
          match: null,
          confidence: 0,
        });
        continue;
      }

      const scored = candidates
        .map((c) => ({ game: c, ...scoreCandidate(c, game.title, platformIds) }))
        .sort((a, b) => b.score - a.score);
      const best = scored[0];
      const runnerUp = scored[1];

      // Ambiguous: two different entries both look like exact platform matches.
      const ambiguous =
        !!best && !!runnerUp && best.exact && runnerUp.exact && best.score - runnerUp.score < 10;

      if (!best || best.score < 70 || ambiguous) {
        const note = !best
          ? "No match found on IGDB"
          : ambiguous
            ? `Multiple possible matches: ${scored
                .slice(0, 3)
                .map((s) => s.game.name)
                .join(" / ")}`
            : `Low confidence match: ${best.game.name}`;
        await supabaseAdmin
          .from("games")
          .update({
            metadata_status: "needs_review",
            metadata_note: note,
            metadata_source: "IGDB",
            metadata_updated_at: new Date().toISOString(),
          })
          .eq("id", game.id);
        results.push({
          id: game.id,
          title: game.title,
          status: best ? "needs_review" : "no_data",
          filled: [],
          unresolved: missing,
          alreadyFilled,
          note,
          match: best?.game.name ?? null,
          confidence: best?.score ?? 0,
        });
        continue;
      }

      const found = best.game;
      const patch: Record<string, string | number | null> = {};
      const filled: AutofillField[] = [];
      const unresolved: AutofillField[] = [];

      for (const field of missing) {
        let value: string | number | null = null;
        if (field === "genre") value = pickGenre(found);
        else if (field === "developer") value = pickCompany(found, "developer");
        else if (field === "publisher") value = pickCompany(found, "publisher");
        else if (field === "rating") value = pickRating(found);
        else if (field === "release_date") value = pickReleaseDate(found, platformIds);
        else if (field === "short_description") value = pickShortDescription(found);
        else if (field === "description") value = pickDescription(found);
        else value = null; // game_size: no database publishes reliable install sizes

        if (value === null || value === "") unresolved.push(field);
        else {
          patch[field] = value;
          filled.push(field);
        }
      }

      const sources = {
        ...((game.metadata_fields as Record<string, string> | null) ?? {}),
        ...Object.fromEntries(filled.map((f) => [f, "IGDB"])),
      };
      const note = unresolved.length
        ? `Still needs you: ${unresolved.map((f) => LABEL[f]).join(", ")}`
        : null;

      const { error: updateError } = await supabaseAdmin
        .from("games")
        .update({
          ...patch,
          igdb_id: found.id,
          metadata_source: "IGDB",
          metadata_updated_at: new Date().toISOString(),
          metadata_status: unresolved.length ? "needs_review" : "complete",
          metadata_note: note,
          metadata_fields: sources,
        })
        .eq("id", game.id);
      if (updateError) {
        results.push({
          id: game.id,
          title: game.title,
          status: "needs_review",
          filled: [],
          unresolved: missing,
          alreadyFilled,
          note: updateError.message,
          match: found.name,
          confidence: best.score,
        });
        continue;
      }

      results.push({
        id: game.id,
        title: game.title,
        status: unresolved.length && !filled.length ? "needs_review" : "updated",
        filled,
        unresolved,
        alreadyFilled,
        note,
        match: found.name,
        confidence: best.score,
      });

      await sleep(280); // stay well inside IGDB's 4 requests/second limit
    }

    return results;
  });
