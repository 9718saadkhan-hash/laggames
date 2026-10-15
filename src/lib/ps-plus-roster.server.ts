import { XMLParser } from "fast-xml-parser";
import { parseEssentialPost, parseRosterPost, SONY_PLUS_FEED, type RosterResponse } from "./ps-plus-roster";

let cache: { result: RosterResponse; expiresAt: number } | null = null;
let pending: Promise<RosterResponse> | null = null;

async function refresh(): Promise<RosterResponse> {
  const now = new Date();
  try {
    const response = await fetch(SONY_PLUS_FEED, { signal: AbortSignal.timeout(10000), headers: { "User-Agent": "Mozilla/5.0 (compatible; LAGGamesBot/1.0; +https://thelaggames.com)", Accept: "application/rss+xml, application/xml, text/xml" }, redirect: "follow" });
    if (!response.ok) throw new Error("Feed unavailable");
    const xml = await response.text();
    if (xml.length > 2_000_000) throw new Error("Feed too large");
    const feed = new XMLParser({ ignoreAttributes: true, processEntities: true, isArray: (name) => name === "item" }).parse(xml);
    const items: unknown = feed?.rss?.channel?.item;
    if (!Array.isArray(items)) throw new Error("Invalid feed");
    const rosters = items.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      if (![row['title'], row['link'], row['pubDate'], row['content:encoded']].every((v) => typeof v === "string")) return [];
      const roster = parseRosterPost({ title: String(row['title']), link: String(row['link']), pubDate: String(row['pubDate']), content: String(row['content:encoded']) }, now);
      return roster ? [roster] : [];
    }).sort((a, b) => b.month.localeCompare(a.month) || b.publishedAt.localeCompare(a.publishedAt));
    const essentials = items.flatMap((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      if (typeof row['title'] !== "string" || typeof row['pubDate'] !== "string") return [];
      const e = parseEssentialPost({ title: row['title'], pubDate: row['pubDate'] }, now);
      return e ? [{ ...e, link: typeof row['link'] === "string" ? row['link'] : "" }] : [];
    }).sort((a, b) => b.month.localeCompare(a.month));
    let roster = rosters[0] ?? null;
    const essential = essentials.find((e) => !roster || e.month === roster.month) ?? null;
    if (!roster && essential) roster = { month: essential.month, sourceUrl: essential.link || "https://blog.playstation.com/category/ps-plus/", publishedAt: now.toISOString(), availability: null, games: [] };
    if (!roster) throw new Error("No verified roster");
    if (essential && essential.month === roster.month) {
      roster = { ...roster, games: [...essential.titles.map((title) => ({ title, platforms: "", category: "essential" as const, note: null })), ...roster.games] };
    }
    const result: RosterResponse = { roster, checkedAt: now.toISOString(), stale: false };
    cache = { result, expiresAt: now.getTime() + 60 * 60_000 };
    return result;
  } catch {
    const result: RosterResponse = cache ? { ...cache.result, stale: true } : { roster: null, checkedAt: now.toISOString(), stale: true };
    cache = { result, expiresAt: now.getTime() + 5 * 60_000 };
    return result;
  }
}

export async function readMonthlyRoster(): Promise<RosterResponse> {
  if (cache && Date.now() < cache.expiresAt) return cache.result;
  if (pending) return pending;
  pending = refresh();
  try { return await pending; } finally { pending = null; }
}