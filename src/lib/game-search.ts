/** Shared, browser-safe matching for both public search screens. */
export function normalizeSearch(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

type SearchableGame = {
  title: string;
  genre?: string | null;
  publisher?: string | null;
  developer?: string | null;
  platform?: string | null;
  release_date?: string | null;
};

export function buildGameSearchIndex<T extends SearchableGame>(games: T[]) {
  return games.map((game) => {
    const title = normalizeSearch(game.title);
    const words = title.split(" ");
    const acronym = words.filter((word) => !["the", "of", "and"].includes(word)).map((word) => word[0]).join("");
    const text = normalizeSearch([game.title, game.genre, game.publisher, game.developer, game.platform,
      game.release_date?.slice(0, 4)].filter(Boolean).join(" "));
    return { game, title, text, acronym };
  });
}

export function searchGames<T extends SearchableGame>(index: ReturnType<typeof buildGameSearchIndex<T>>, query: string): T[] {
  const term = normalizeSearch(query);
  if (!term) return index.map(({ game }) => game);
  const tokens = term.split(" ");
  return index.map((entry, order) => {
    const matches = tokens.every((token) => entry.text.includes(token) || (token.length >= 2 && entry.acronym.includes(token)));
    const rank = entry.title === term ? 0 : entry.title.startsWith(term) ? 1 : entry.title.includes(term) ? 2 : 3;
    return { ...entry, matches, rank, order };
  }).filter(({ matches }) => matches).sort((a, b) => a.rank - b.rank || a.order - b.order).map(({ game }) => game);
}

export function matchesGamePlatform(platform: string | null | undefined, selected: string): boolean {
  return selected.toLowerCase() === "all" || (selected === "PS4 & PS5"
    ? platform === selected : Boolean(platform?.includes(selected)));
}