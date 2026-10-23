import { describe, test } from "node:test";
import { deepStrictEqual, strictEqual } from "node:assert";
import { buildGameSearchIndex, matchesGamePlatform, searchGames } from "./game-search";

const games = [
  { title: "Marvel’s Spider-Man 2", platform: "PS4 & PS5", publisher: "Sony" },
  { title: "God of War Ragnarök", platform: "PS5", publisher: "Sony" },
  { title: "Grand Theft Auto V", platform: "PS4" },
];
const index = buildGameSearchIndex(games);
describe("shared game search", () => {
  test("finds hyphenated titles with spaces and repeated whitespace", () => {
    deepStrictEqual(searchGames(index, "  spider   man 2 ").map((g) => g.title), ["Marvel’s Spider-Man 2"]);
  });
  test("matches accents and apostrophes consistently", () => {
    strictEqual(searchGames(index, "ragnarok")[0]?.title, "God of War Ragnarök");
    strictEqual(searchGames(index, "marvels")[0]?.title, "Marvel’s Spider-Man 2");
  });
  test("matches title words regardless of input order", () => {
    strictEqual(searchGames(index, "2 spider")[0]?.title, "Marvel’s Spider-Man 2");
  });
  test("matches common game initials", () => {
    strictEqual(searchGames(index, "gta")[0]?.title, "Grand Theft Auto V");
  });
  test("ranks title matches before metadata matches", () => {
    const ranked = buildGameSearchIndex([{ title: "Other", publisher: "Spider" }, { title: "Spider" }]);
    deepStrictEqual(searchGames(ranked, "spider").map((g) => g.title), ["Spider", "Other"]);
  });
  test("does not return unrelated games", () => {
    deepStrictEqual(searchGames(index, "football"), []);
  });
  test("includes dual-platform games when filtering PS4 or PS5", () => {
    strictEqual(matchesGamePlatform("PS4 & PS5", "PS4"), true);
    strictEqual(matchesGamePlatform("PS4 & PS5", "PS5"), true);
    strictEqual(matchesGamePlatform("PS4", "PS5"), false);
  });
});