export type RosterGame = {
  title: string;
  platforms: string;
  category: "catalogue" | "classics";
  note: string | null;
};
export type MonthlyRoster = {
  month: string;
  sourceUrl: string;
  publishedAt: string;
  availability: string | null;
  games: RosterGame[];
};
export type RosterResponse = { roster: MonthlyRoster | null; checkedAt: string; stale: boolean };
export const SONY_PLUS_FEED = "https://blog.playstation.com/category/ps-plus/feed/";
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function plainText(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/&#(x[\da-f]+|\d+);/gi, (_, code: string) => {
    const number = code.startsWith("x") ? parseInt(code.slice(1), 16) : Number(code);
    return number <= 0x10ffff ? String.fromCodePoint(number) : "";
  }).replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&rsquo;/g, "’").replace(/&ndash;/g, "–").replace(/&mdash;/g, "—").replace(/\s+/g, " ").trim();
}

export function currentRosterMonth(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).format(now).slice(0, 7);
}

/** Only Sony's Game Catalog announcements count; Essential Monthly Games are separate. */
export function parseRosterPost(post: { title: string; link: string; pubDate: string; content: string }, now: Date): MonthlyRoster | null {
  const title = plainText(post.title);
  const match = title.match(/PlayStation Plus Game Catalo(?:g|gue)\s+(?:lineup\s+)?for\s+(\w+)/i);
  const index = months.findIndex((m) => m.toLowerCase() === match?.[1]?.toLowerCase());
  const published = new Date(post.pubDate);
  if (!match || index < 0 || !Number.isFinite(published.getTime()) || published > now) return null;
  let url: URL;
  try { url = new URL(post.link); } catch { return null; }
  if (url.protocol !== "https:" || url.hostname !== "blog.playstation.com") return null;
  const year = published.getUTCFullYear() + (index === 0 && published.getUTCMonth() === 11 ? 1 : 0);
  const month = `${year}-${String(index + 1).padStart(2, "0")}`;
  const games: RosterGame[] = [];
  const tokens = [...post.content.matchAll(/<(h[2-4]|strong)\b[^>]*>([\s\S]*?)<\/\1>/gi)];
  let category: RosterGame["category"] | null = null;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) continue;
    const text = plainText(token[2] ?? "");
    if (/^PlayStation Plus/i.test(text)) {
      category = /Extra/i.test(text) ? "catalogue" : /Premium|Deluxe/i.test(text) ? "classics" : null;
      continue;
    }
    if (!category) continue;
    const gameMatch = text.match(/^(.+?)\s*\|\s*(PS[345](?:\s*,\s*PS[345])*)\s*$/);
    // PS3-only games are streaming titles, not a Deluxe downloadable benefit.
    if (!gameMatch || !/PS[45]/.test(gameMatch[2] ?? "")) continue;
    const gameTitle = gameMatch[1]?.trim();
    if (!gameTitle || games.some((g) => g.title === gameTitle)) continue;
    const start = (token.index ?? 0) + token[0].length;
    const remaining = post.content.slice(start);
    const nextGame = remaining.search(/<(?:h[2-4])\b|<strong\b[^>]*>[^<]*\|\s*PS/i);
    const segment = plainText(nextGame < 0 ? remaining : remaining.slice(0, nextGame));
    const note = segment.match(/[^.!?]*\bwill be available\b[^.!?]*[.!?]?/i)?.[0]?.trim() ?? null;
    games.push({ title: gameTitle, platforms: gameMatch[2] ?? "", category, note });
  }
  if (!games.length) return null;
  const availability = plainText(post.content).match(/The full lineup will be available[^.]*\./i)?.[0] ?? null;
  return { month, sourceUrl: url.href, publishedAt: published.toISOString(), availability, games };
}

export function rosterGames(roster: MonthlyRoster, filter: "all" | "extra" | "deluxe"): RosterGame[] {
  return roster.games.filter((game) => filter === "all" || filter === "deluxe" || game.category === "catalogue");
}