/**
 * Auto-Fill Game Information.
 *
 * Retrieves missing game metadata from verified sources and fills ONLY
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

/** Game Size is never published by any database — it can stay empty without failing a game. */
export const NON_SIZE_FIELDS = AUTOFILL_FIELDS.filter((f) => f !== "game_size");

export interface AutofillResult {
  id: string;
  title: string;
  status: "updated" | "needs_review" | "no_data" | "skipped";
  filled: AutofillField[];
  unresolved: AutofillField[];
  /** Fields that already had a value and were left untouched. */
  alreadyFilled: AutofillField[];
  /** True when the only thing left blank is Game Size. */
  sizePending: boolean;
  note: string | null;
  match: string | null;
  confidence: number;
  sources: string[];
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
  cover?: { url?: string; width?: number; height?: number };
  artworks?: { url?: string; width?: number; height?: number }[];
  screenshots?: { url?: string; width?: number; height?: number }[];
  videos?: { name?: string; video_id?: string }[];
}

const FIELDS =
  "fields name,genres.name,platforms,total_rating,total_rating_count,aggregated_rating," +
  "aggregated_rating_count,first_release_date,involved_companies.developer," +
  "involved_companies.publisher,involved_companies.company.name,release_dates.platform," +
  "release_dates.date,alternative_names.name,version_parent,summary,storyline," +
  "cover.url,cover.width,cover.height,artworks.url,artworks.width,artworks.height," +
  "screenshots.url,screenshots.width,screenshots.height,videos.name,videos.video_id";

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
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ROMAN: Record<string, number> = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10,
  xi: 11, xii: 12, xiii: 13, xiv: 14, xv: 15, xvi: 16, xvii: 17, xviii: 18,
  xix: 19, xx: 20,
};

const PLATFORM_WORDS = /\b(ps4|ps5|playstation\s*[45]?|xbox|series\s*[sx]|pc|switch)\b/g;
const EDITION_WORDS =
  /\b(standard|deluxe|ultimate|gold|complete|definitive|goty|game of the year|anniversary|legacy|digital|bundle|edition|version|pack)\b/g;

/** "Resident Evil 4 Remake + Separate Ways DLC" → "Resident Evil 4 Remake". */
function stripAddons(title: string): string {
  return title
    .replace(/\s*\+\s*.*$/, "")
    .replace(/\s*(?:with|incl\.?|including)\s+.*\b(dlc|expansion|season pass)\b.*$/i, "")
    .trim();
}

/**
 * Identity of a title: the series name, its entry number and whether it is a
 * remaster/remake. Two releases only describe the same game when all three agree,
 * so sequels, prequels, roman-numeral entries and remasters never cross-match.
 */
interface Identity {
  core: string;
  number: number;
  remaster: "remastered" | "remake" | null;
}

function parseIdentity(title: string): Identity {
  // Add-on bundles ("Game + DLC") and edition abbreviations ("UE") describe the same base game.
  let t = norm(stripAddons(title))
    .replace(PLATFORM_WORDS, " ")
    .replace(/\b(ue|de|ce|se)$/, " ");
  let remaster: Identity["remaster"] = null;
  if (/\bremaster(ed)?\b/.test(t)) remaster = "remastered";
  else if (/\bremake\b/.test(t)) remaster = "remake";
  t = t
    .replace(/\bremaster(ed)?\b|\bremake\b/g, " ")
    .replace(EDITION_WORDS, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Entry number: "part ii", or a trailing digit / roman numeral. Absent means entry 1.
  let number = 1;
  const part = t.match(/\bpart\s+([0-9]{1,2}|[ivx]{1,7})\b/);
  const trailing = t.match(/\s([0-9]{1,2}|[ivx]{1,7})$/);
  const token = part?.[1] ?? trailing?.[1];
  if (token) {
    const parsed = /^[0-9]+$/.test(token) ? Number(token) : ROMAN[token];
    if (parsed && parsed <= 20) {
      number = parsed;
      t = part
        ? t.replace(/\bpart\s+([0-9]{1,2}|[ivx]{1,7})\b/, " ")
        : t.replace(/\s([0-9]{1,2}|[ivx]{1,7})$/, " ");
    }
  }
  return { core: t.replace(/\s+/g, " ").trim(), number, remaster };
}

function identityMatches(a: Identity, b: Identity): boolean {
  return Boolean(a.core) && a.core === b.core && a.number === b.number && a.remaster === b.remaster;
}

function sameSeriesEntry(a: Identity, b: Identity): boolean {
  return Boolean(a.core) && a.core === b.core && a.number === b.number;
}

function sourceText(candidate: IgdbGame): string {
  return norm([candidate.name, candidate.summary, candidate.storyline].filter(Boolean).join(" "));
}

function variantCompatible(candidate: IgdbGame, target: Identity): boolean {
  if (!target.remaster) return true;
  const text = sourceText(candidate);
  if (target.remaster === "remastered") return /\bremaster(ed)?\b/.test(text);
  return /\bremake\b/.test(text);
}

/**
 * A candidate is only considered at all when its identity matches. Anything else
 * scores 0 and is rejected outright instead of being used as a weak guess.
 */
function scoreCandidate(
  candidate: IgdbGame,
  title: string,
  platformIds: number[],
): { score: number; exact: boolean } {
  const target = parseIdentity(title);
  const names = [candidate.name, ...(candidate.alternative_names ?? []).map((a) => a.name ?? "")]
    .filter((n): n is string => Boolean(n));
  const identityMatch = names.some((n) => identityMatches(parseIdentity(n), target));
  const sameEntry = names.some((n) => sameSeriesEntry(parseIdentity(n), target));
  if (!sameEntry) {
    return { score: 0, exact: false };
  }
  if (!identityMatch && !variantCompatible(candidate, target)) {
    return { score: 0, exact: false };
  }

  // Identity is enough to use identity-level fields. Platform is separately
  // required by pickReleaseDate before a platform-specific date is accepted.
  let score = identityMatch ? 72 : 62;
  const platforms = candidate.platforms ?? [];
  if (platformIds.some((p) => platforms.includes(p))) score += 30;
  else if (platforms.length) score -= 40; // a release for other platforms only
  if (candidate.involved_companies?.length) score += 6;
  if (candidate.genres?.length) score += 3;
  if (candidate.first_release_date) score += 3;
  if (candidate.version_parent) score -= 12;
  const exact = names.some((n) => norm(n) === norm(title));
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

/** Only accept a date for the platform stored for this game. */
function pickReleaseDate(g: IgdbGame, platformIds: number[]): string | null {
  const dates = (g.release_dates ?? []).filter((d) => typeof d.date === "number");
  for (const pid of platformIds) {
    const hits = dates.filter((d) => d.platform === pid).map((d) => d.date as number);
    if (hits.length) return toIsoDate(Math.min(...hits));
  }
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

/* ------------------------------------------------- fallback source: RAWG.io */

interface RawgGame {
  id: number;
  name: string;
  slug?: string;
  released?: string | null;
  rating?: number;
  ratings_count?: number;
  platforms?: { platform?: { slug?: string } }[];
  genres?: { name?: string }[];
  developers?: { name?: string }[];
  publishers?: { name?: string }[];
  description_raw?: string;
}

const RAWG_PLATFORM_SLUGS: Record<string, string[]> = {
  PS4: ["playstation4"],
  PS5: ["playstation5"],
  "PS4 & PS5": ["playstation5", "playstation4"],
};

async function rawgFetch<T>(path: string): Promise<T | null> {
  const key = process.env["RAWG_API_KEY"];
  if (!key) return null;
  const url = `https://api.rawg.io/api${path}${path.includes("?") ? "&" : "?"}key=${encodeURIComponent(key)}`;
  let delay = 600;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.ok) return (await res.json()) as T;
    if (res.status === 429 || res.status >= 500) {
      await sleep(delay);
      delay *= 2;
      continue;
    }
    return null;
  }
  return null;
}

/** Verify a RAWG candidate by title and platform before trusting any of its data. */
function rawgScore(candidate: RawgGame, title: string, platformSlugs: string[]): number {
  const source = parseIdentity(candidate.name ?? "");
  const target = parseIdentity(title);
  if (!sameSeriesEntry(source, target)) return 0;
  if (!identityMatches(source, target) && target.remaster && !/\bremaster(ed)?\b|\bremake\b/.test(norm(candidate.name ?? ""))) {
    return 0;
  }
  let score = identityMatches(source, target) ? 72 : 62;
  const slugs = (candidate.platforms ?? []).map((p) => p.platform?.slug ?? "");
  if (platformSlugs.some((s) => slugs.includes(s))) score += 30;
  else if (slugs.length) score -= 40;
  if (candidate.developers?.length || candidate.publishers?.length) score += 6;
  if (candidate.released) score += 4;
  return Math.max(0, Math.min(100, score));
}

async function rawgLookup(
  title: string,
  platform: string,
  retry: boolean,
): Promise<RawgGame | null> {
  const platformSlugs = RAWG_PLATFORM_SLUGS[platform] ?? ["playstation5", "playstation4"];
  const variants = retry ? titleVariants(title) : titleVariants(title).slice(0, 2);
  for (const variant of variants) {
    const list = await rawgFetch<{ results?: RawgGame[] }>(
      `/games?search=${encodeURIComponent(variant)}&search_precise=true&page_size=8`,
    );
    const rows = list?.results ?? [];
    if (!rows.length) continue;
    const best = rows
      .map((r) => ({ row: r, score: rawgScore(r, title, platformSlugs) }))
      .sort((a, b) => b.score - a.score)[0];
    if (best && best.score >= 70) {
      // Detail call carries developers/publishers/description that the list omits.
      const detail = await rawgFetch<RawgGame>(`/games/${best.row.slug ?? best.row.id}`);
      return { ...best.row, ...(detail ?? {}) };
    }
    await sleep(250);
  }
  return null;
}

/* ----------------------------------------- fallback source: Wikipedia/Wikidata */

interface WikiSearchRow { title: string }
interface WikiPage {
  title?: string;
  extract?: string;
  pageprops?: { wikibase_item?: string };
}
interface WikidataClaim {
  mainsnak?: { datavalue?: { value?: unknown } };
}
interface WikidataEntity {
  claims?: Record<string, WikidataClaim[]>;
}
interface WikiMetadata {
  title: string;
  extract: string;
  genre: string | null;
  developer: string | null;
  publisher: string | null;
  releaseDate: string | null;
}

const WIKI_HEADERS = {
  Accept: "application/json",
  "User-Agent": "LAGGamesMetadata/1.0 (https://thelaggames.com)",
};

async function wikiJson<T>(url: string): Promise<T | null> {
  let delay = 500;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: WIKI_HEADERS });
    if (res.ok) return (await res.json()) as T;
    if (res.status === 429 || res.status >= 500) {
      await sleep(delay);
      delay *= 2;
      continue;
    }
    return null;
  }
  return null;
}

function claimIds(entity: WikidataEntity, property: string): string[] {
  return (entity.claims?.[property] ?? [])
    .map((claim) => claim.mainsnak?.datavalue?.value)
    .filter((value): value is { id: string } =>
      typeof value === "object" && value !== null && "id" in value && typeof value.id === "string",
    )
    .map((value) => value.id);
}

async function wikidataLabels(ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {};
  const url = new URL("https://www.wikidata.org/w/api.php");
  url.search = new URLSearchParams({
    action: "wbgetentities", ids: Array.from(new Set(ids)).join("|"), props: "labels",
    languages: "en", format: "json", origin: "*",
  }).toString();
  const body = await wikiJson<{ entities?: Record<string, { labels?: { en?: { value?: string } } }> }>(url.toString());
  return Object.fromEntries(
    Object.entries(body?.entities ?? {}).flatMap(([id, entity]) =>
      entity.labels?.en?.value ? [[id, entity.labels.en.value]] : [],
    ),
  );
}

function wikidataDate(entity: WikidataEntity): string | null {
  const dates = (entity.claims?.["P577"] ?? [])
    .map((claim) => claim.mainsnak?.datavalue?.value)
    .filter((value): value is { time: string; precision?: number } =>
      typeof value === "object" && value !== null && "time" in value && typeof value.time === "string",
    )
    .filter((value) => (value.precision ?? 0) >= 11)
    .map((value) => value.time.match(/\+(\d{4}-\d{2}-\d{2})/)?.[1])
    .filter((value): value is string => Boolean(value))
    .sort();
  return dates[0] ?? null;
}

function pageSupportsPlatform(extract: string, platform: string): boolean {
  const text = norm(extract);
  if (platform === "PS4") return /\bplaystation 4\b/.test(text);
  if (platform === "PS5") return /\bplaystation 5\b/.test(text);
  return /\bplaystation 4\b/.test(text) && /\bplaystation 5\b/.test(text);
}

function canonicalVariantCompatible(title: string, pageTitle: string, extract: string): boolean {
  const target = parseIdentity(title);
  const source = parseIdentity(pageTitle);
  if (identityMatches(source, target)) return true;
  if (!sameSeriesEntry(source, target)) return false;
  const text = norm(`${pageTitle} ${extract}`);
  if (target.remaster === "remastered") return /\bremaster(ed)?\b/.test(text);
  if (target.remaster === "remake") return /\bremake\b/.test(text);
  return true;
}

async function wikipediaLookup(title: string, platform: string): Promise<WikiMetadata | null> {
  const variants = titleVariants(title);
  for (const variant of variants) {
    const searchUrl = new URL("https://en.wikipedia.org/w/api.php");
    searchUrl.search = new URLSearchParams({
      action: "query", list: "search", srsearch: `intitle:\"${variant}\" video game`,
      srlimit: "8", format: "json", origin: "*",
    }).toString();
    const search = await wikiJson<{ query?: { search?: WikiSearchRow[] } }>(searchUrl.toString());
    for (const row of search?.query?.search ?? []) {
      const pageTitle = row.title.replace(/\s*\([^)]*video game[^)]*\)\s*/i, "").trim();
      if (!sameSeriesEntry(parseIdentity(pageTitle), parseIdentity(title))) continue;
      const pageUrl = new URL("https://en.wikipedia.org/w/api.php");
      pageUrl.search = new URLSearchParams({
        action: "query", prop: "extracts|pageprops", explaintext: "1", redirects: "1",
        titles: row.title, format: "json", origin: "*",
      }).toString();
      const pageBody = await wikiJson<{ query?: { pages?: Record<string, WikiPage> } }>(pageUrl.toString());
      const page = Object.values(pageBody?.query?.pages ?? {})[0];
      const extract = page?.extract?.trim() ?? "";
      if (!extract || !pageSupportsPlatform(extract, platform)) continue;
      if (!canonicalVariantCompatible(title, page?.title ?? pageTitle, extract)) continue;

      const item = page?.pageprops?.wikibase_item;
      let entity: WikidataEntity = {};
      if (item) {
        const entityBody = await wikiJson<{ entities?: Record<string, WikidataEntity> }>(
          `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(item)}.json`,
        );
        entity = entityBody?.entities?.[item] ?? {};
      }
      const genres = claimIds(entity, "P136");
      const developers = claimIds(entity, "P178");
      const publishers = claimIds(entity, "P123");
      const labels = await wikidataLabels([...genres, ...developers, ...publishers]);
      const join = (ids: string[]) => {
        const values = ids.map((id) => labels[id]).filter((value): value is string => Boolean(value));
        return values.length ? Array.from(new Set(values)).join(", ") : null;
      };
      return {
        title: page?.title ?? row.title,
        extract,
        // Match the site's genre style: "fighting game" → "Fighting", "action-adventure game" → "Action-Adventure".
        genre: (() => {
          const raw = join(genres);
          if (!raw) return null;
          const cleaned = raw
            .split(", ")
            .map((g) => g.replace(/\s*(video\s+)?games?$/i, "").trim())
            .filter(Boolean)
            .map((g) => g.replace(/(^|[\s-])([a-z])/g, (_m, p: string, c: string) => p + c.toUpperCase()));
          return cleaned.length ? Array.from(new Set(cleaned)).join(", ") : null;
        })(),
        developer: join(developers),
        publisher: join(publishers),
        releaseDate: wikidataDate(entity),
      };
    }
  }
  return null;
}

function wikiValue(g: WikiMetadata, field: AutofillField): string | null {
  if (field === "genre") return g.genre;
  if (field === "developer") return g.developer;
  if (field === "publisher") return g.publisher;
  if (field === "release_date") return g.releaseDate;
  const intro = cleanDescription(g.extract.split(/\n\s*\n/)[0]);
  if (!intro) return null;
  if (field === "description") return intro.length <= 1400 ? intro : null;
  if (field === "short_description") {
    const sentences = intro.match(/[^.!?]+[.!?]+/g)?.map((part) => part.trim()) ?? [];
    const concise = sentences.slice(0, 2).join(" ");
    return concise.length >= 40 && concise.length <= 360 ? concise : null;
  }
  return null;
}

function rawgValue(g: RawgGame, field: AutofillField): string | number | null {
  if (field === "genre") {
    const names = (g.genres ?? []).map((x) => x.name).filter(Boolean) as string[];
    return names.length ? names.join(", ") : null;
  }
  if (field === "developer") {
    const names = (g.developers ?? []).map((x) => x.name).filter(Boolean) as string[];
    return names.length ? Array.from(new Set(names)).join(", ") : null;
  }
  if (field === "publisher") {
    const names = (g.publishers ?? []).map((x) => x.name).filter(Boolean) as string[];
    return names.length ? Array.from(new Set(names)).join(", ") : null;
  }
  if (field === "rating") {
    if (typeof g.rating === "number" && g.rating > 0 && (g.ratings_count ?? 0) >= 5) {
      return Math.round(g.rating * 10) / 10; // RAWG is already 0–5
    }
    return null;
  }
  if (field === "release_date") return g.released ? g.released.slice(0, 10) : null;
  if (field === "short_description" || field === "description") {
    const cleaned = cleanDescription(g.description_raw);
    if (!cleaned) return null;
    if (field === "description") return cleaned;
    const sentences = cleaned.match(/[^.!?]+[.!?]+/g)?.map((p) => p.trim()) ?? [];
    const concise = sentences.slice(0, 2).join(" ");
    if (concise.length >= 40 && concise.length <= 360) return concise;
    return cleaned.length <= 360 ? cleaned : null;
  }
  return null; // game_size is never published
}

/* ----------------------------------------------------------- server function */

const Input = z.object({
  ids: z.array(z.string().uuid()).min(1).max(8),
  /** Retry mode searches extra title variants instead of repeating the same failed lookup. */
  retry: z.boolean().optional(),
});

const LABEL: Record<AutofillField, string> = {
  genre: "Genre",
  game_size: "Game Size (manual entry required)",
  developer: "Developer",
  publisher: "Publisher",
  rating: "Rating (not enough reviews to be reliable)",
  release_date: "Release Date",
  short_description: "Short Description (no reliable summary found)",
  description: "Description (no reliable summary found)",
};

/**
 * Search spellings of a stored title. Meaningful parts (entry number, roman
 * numeral, subtitle, remaster/remake) are always preserved — only punctuation,
 * platform words and edition wording vary.
 */
function titleVariants(title: string): string[] {
  const out: string[] = [];
  const push = (value: string) => {
    const t = value.replace(/\s+/g, " ").trim();
    if (t.length >= 2 && !out.includes(t)) out.push(t);
  };
  const original = title.replace(/"/g, " ").trim();
  push(original);
  const base = stripAddons(original)
    .replace(/\s+\b(UE|DE|CE|SE)\b\s*$/i, " ")
    .trim();
  push(base);
  push(base.replace(/[:\-–—_]+/g, " "));
  push(base.replace(/\((ps4|ps5|playstation\s*[45]?)[^)]+\)/gi, " "));
  push(base.replace(/\b(ps4|ps5|playstation\s*[45]?)\b/gi, " "));
  push(
    base
      .replace(/\b(standard|deluxe|ultimate|gold|complete|definitive|goty)?\s*(edition|bundle|version)\b/gi, " ")
      .replace(/[-–—:]\s*$/, ""),
  );
  if (/\bremaster(ed)?\b/i.test(base)) push(base.replace(/\bremaster(ed)?\b/gi, " "));
  if (/\bremake\b/i.test(base)) push(base.replace(/\bremake\b/gi, " "));
  // Same entry number written the other way round (2 <-> II), so both spellings are searchable.
  const digit = base.match(/(?:^|\s)([0-9]{1,2})(?=\s|$)/);
  if (digit?.[1]) {
    const roman = Object.entries(ROMAN).find(([, v]) => v === Number(digit[1]))?.[0];
    if (roman) push(base.replace(new RegExp(`(^|\\s)${digit[1]}(?=\\s|$)`), `$1${roman.toUpperCase()}`));
  }
  const roman = base.match(/\s([ivx]{1,7})$/i);
  if (roman?.[1]) {
    const n = ROMAN[roman[1].toLowerCase()];
    if (n) push(base.replace(/\s[ivx]{1,7}$/i, ` ${n}`));
  }
  // "Game 1" is usually catalogued as "Game" — still entry 1, so identity stays intact.
  push(base.replace(/\s1$/, ""));
  return out;
}

async function searchCandidates(title: string, retry: boolean): Promise<IgdbGame[]> {
  const variants = titleVariants(title);
  const seen = new Map<number, IgdbGame>();
  for (const variant of variants) {
    const rows = await igdbQuery(`search "${variant}"; ${FIELDS}; limit 12;`);
    for (const row of rows) if (!seen.has(row.id)) seen.set(row.id, row);
    if (seen.size >= (retry ? 24 : 12)) break;
    await sleep(280);
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
      const wanted = missing.filter((f) => f !== "game_size");
      const sizeMissing = missing.includes("game_size");

      // Nothing left to look up: either fully complete, or only Game Size is pending.
      if (wanted.length === 0) {
        const note = sizeMissing ? "Game Size: manual entry required" : null;
        await supabaseAdmin
          .from("games")
          .update({ metadata_status: "complete", metadata_note: note })
          .eq("id", game.id);
        results.push({
          id: game.id,
          title: game.title,
          status: "skipped",
          filled: [],
          unresolved: sizeMissing ? ["game_size"] : [],
          alreadyFilled,
          sizePending: sizeMissing,
          sources: [],
          note: sizeMissing ? "Metadata complete · Game Size: manual entry required" : "All fields already filled",
          match: null,
          confidence: 100,
        });
        continue;
      }

      const platformIds = IGDB_PLATFORMS[game.platform] ?? [167, 48];
      const patch: Record<string, string | number | null> = {};
      const filled: AutofillField[] = [];
      const fieldSource: Record<string, string> = {};
      const sourcesUsed: string[] = [];
      let matchName: string | null = null;
      let confidence = 0;
       const notes: string[] = [];
       const attemptedSources: string[] = [];

      /* ---- source 1: IGDB ---- */
      let igdbCandidates: IgdbGame[] = [];
      try {
         attemptedSources.push("IGDB");
        igdbCandidates = await searchCandidates(game.title, data.retry === true);
      } catch (err) {
        notes.push(err instanceof Error ? err.message : "IGDB lookup failed");
      }

      const scored = igdbCandidates
        .map((c) => ({ game: c, ...scoreCandidate(c, game.title, platformIds) }))
        .sort((a, b) => b.score - a.score);
      const best = scored[0];
      const runnerUp = scored[1];
      // Two equally strong, differently named candidates: never guess between them.
      const ambiguous =
        !!best &&
        !!runnerUp &&
        runnerUp.score >= 70 &&
        best.score - runnerUp.score < 8 &&
        norm(best.game.name) !== norm(runnerUp.game.name);

      if (best && best.score >= 70 && !ambiguous) {
        const found = best.game;
        matchName = found.name;
        confidence = best.score;
        for (const field of wanted) {
          let value: string | number | null = null;
          if (field === "genre") value = pickGenre(found);
          else if (field === "developer") value = pickCompany(found, "developer");
          else if (field === "publisher") value = pickCompany(found, "publisher");
          else if (field === "rating") value = pickRating(found);
          else if (field === "release_date") value = pickReleaseDate(found, platformIds);
          else if (field === "short_description") value = pickShortDescription(found);
          else if (field === "description") value = pickDescription(found);
          if (value !== null && value !== "") {
            patch[field] = value;
            filled.push(field);
            fieldSource[field] = "IGDB";
          }
        }
        if (filled.length) sourcesUsed.push("IGDB");
        if (Object.keys(patch).length) patch["igdb_id"] = found.id;
      } else if (best) {
        notes.push(ambiguous ? "IGDB returned multiple possible matches" : "IGDB had no verified match");
      } else if (!notes.length) {
        notes.push("No confident IGDB match");
      }

      /* ---- source 2: RAWG, only for the fields still missing ---- */
      let stillMissing = wanted.filter((f) => !filled.includes(f));
      if (stillMissing.length && process.env["RAWG_API_KEY"]) {
        try {
          attemptedSources.push("RAWG");
          const rawg = await rawgLookup(game.title, game.platform, data.retry === true);
          if (rawg) {
            matchName = matchName ?? rawg.name;
            confidence = Math.max(confidence, 70);
            for (const field of stillMissing) {
              const value = rawgValue(rawg, field);
              if (value !== null && value !== "") {
                patch[field] = value;
                filled.push(field);
                fieldSource[field] = "RAWG";
              }
            }
            if (Object.values(fieldSource).includes("RAWG")) sourcesUsed.push("RAWG");
          }
        } catch {
          notes.push("Fallback source lookup failed");
        }
        stillMissing = wanted.filter((f) => !filled.includes(f));
      }

      /* ---- source 3: Wikipedia + Wikidata, for fields still missing ---- */
      if (stillMissing.length) {
        try {
          attemptedSources.push("Wikipedia/Wikidata");
          const wiki = await wikipediaLookup(game.title, game.platform);
          if (wiki) {
            matchName = matchName ?? wiki.title;
            confidence = Math.max(confidence, 82);
            for (const field of stillMissing) {
              const value = wikiValue(wiki, field);
              if (value !== null && value !== "") {
                patch[field] = value;
                filled.push(field);
                fieldSource[field] = "Wikipedia/Wikidata";
              }
            }
            if (Object.values(fieldSource).includes("Wikipedia/Wikidata")) {
              sourcesUsed.push("Wikipedia/Wikidata");
            }
          }
        } catch {
          notes.push("Wikipedia/Wikidata lookup failed");
        }
        stillMissing = wanted.filter((f) => !filled.includes(f));
      }

      const sizePending = sizeMissing;
      const unresolved: AutofillField[] = [...stillMissing, ...(sizeMissing ? (["game_size"] as AutofillField[]) : [])];
      // Only non-size gaps can send a game to review.
      const status: AutofillResult["status"] = stillMissing.length
        ? filled.length
          ? "needs_review"
          : matchName
            ? "needs_review"
            : "no_data"
        : "updated";

      const noteParts: string[] = [];
      if (stillMissing.length) {
        noteParts.push(`Still needs you: ${stillMissing.map((f) => LABEL[f]).join(", ")}`);
        if (notes.length) noteParts.push(notes.join(" · "));
        if (!process.env["RAWG_API_KEY"]) noteParts.push("RAWG not checked: RAWG_API_KEY is not configured");
      } else {
        noteParts.push("Metadata complete");
      }
      if (sizePending) noteParts.push("Game Size: manual entry required");
      const note = noteParts.join(" · ");

      const sources = {
        ...((game.metadata_fields as Record<string, string> | null) ?? {}),
        ...fieldSource,
      };

      const { error: updateError } = await supabaseAdmin
        .from("games")
        .update({
          ...patch,
          metadata_source: sourcesUsed.length ? Array.from(new Set(sourcesUsed)).join(" + ") : null,
          metadata_updated_at: new Date().toISOString(),
          metadata_status: stillMissing.length ? "needs_review" : "complete",
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
          unresolved,
          alreadyFilled,
          sizePending,
          note: updateError.message,
          match: matchName,
          confidence,
          sources: sourcesUsed,
        });
        continue;
      }

      results.push({
        id: game.id,
        title: game.title,
        status,
        filled,
        unresolved,
        alreadyFilled,
        sizePending,
        note,
        match: matchName,
        confidence,
        sources: Array.from(new Set([...sourcesUsed, ...attemptedSources])),
      });

      await sleep(280); // stay well inside IGDB's 4 requests/second limit
    }

    return results;
  });
