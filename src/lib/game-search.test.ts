import { describe, expect, test } from "bun:test";
import { buildGameSearchIndex, matchesGamePlatform, searchGames } from "./game-search";

const games = [
  { title: "Marvel’s Spider-Man 2", platform: "PS4 & PS5", publisher: "Sony" },
  { title: "God of War Ragnarök", platform: "PS5", publisher: "Sony" },
  { title: "Grand Theft Auto V", platform: "PS4" },
];
const index = buildGameSearchIndex(games);
describe("shared game search", () => {
  test("finds hyphenated titles with spaces and repeated whitespace", () => {
    expect(searchGames(index, "  spider   man 2 ").map((g) => g.title)).toEqual(["Marvel’s Spider-Man 2"]);
  });
  test("matches accents and apostrophes consistently", () => {
    expect(searchGames(index, "ragnarok")[0]?.title).toBe("God of War Ragnarök");
    expect(searchGames(index, "marvels")[0]?.title).toBe("Marvel’s Spider-Man 2");
  });
  test("matches title words regardless of input order", () => {
    expect(searchGames(index, "2 spider")[0]?.title).toBe("Marvel’s Spider-Man 2");
  });
  test("matches common game initials", () => {
    expect(searchGames(index, "gta")[0]?.title).toBe("Grand Theft Auto V");
  });
  test("ranks title matches before metadata matches", () => {
    const ranked = buildGameSearchIndex([{ title: "Other", publisher: "Spider" }, { title: "Spider" }]);
    expect(searchGames(ranked, "spider").map((g) => g.title)).toEqual(["Spider", "Other"]);
  });
  test("does not return unrelated games", () => {
    expect(searchGames(index, "football")).toEqual([]);
  });
  test("includes dual-platform games when filtering PS4 or PS5", () => {
    expect(matchesGamePlatform("PS4 & PS5", "PS4")).toBe(true);
    expect(matchesGamePlatform("PS4 & PS5", "PS5")).toBe(true);
    expect(matchesGamePlatform("PS4", "PS5")).toBe(false);
  });
});