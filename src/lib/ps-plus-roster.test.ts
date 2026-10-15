import { strict as assert } from "node:assert";
import { test } from "node:test";
import { currentRosterMonth, parseEssentialPost, parseRosterPost, rosterGames } from "./ps-plus-roster";

const now = new Date("2026-10-12T19:13:00Z");
const post = {
  title: "PlayStation Plus Game Catalog for September: RuneScape: Dragonwilds and more",
  link: "https://blog.playstation.com/2026/09/09/playstation-plus-game-catalog-for-september/",
  pubDate: "Wed, 09 Sep 2026 15:30:17 +0000",
  content: '<p>The full lineup will be available to play on September 15, unless otherwise noted.</p><h2><strong>PlayStation Plus Extra and Premium | Game Catalog</strong></h2><p><strong>RuneScape: Dragonwilds | PS5</strong></p><p><strong>Ball x Pit | PS5</strong></p><p>Ball x Pit will be available September 22 in the US, the UK and Japan.</p><h2><strong>PlayStation Plus Premium</strong></h2><p><strong>Mega Man X Command Mission | PS5, PS4</strong></p><p><strong>Streaming-only game | PS3</strong></p>',
};
test("Extra / Deluxe roster excludes Essential Monthly Games", () => {
  assert.equal(parseRosterPost({ ...post, title: "PlayStation Plus Monthly Games for October: F1 25" }, now), null);
});
test("Extra games also appear for Deluxe, classics do not appear for Extra", () => {
  const roster = parseRosterPost(post, now);
  assert.ok(roster);
  assert.deepEqual(rosterGames(roster, "extra").map((g) => g.title), ["RuneScape: Dragonwilds", "Ball x Pit"]);
  assert.deepEqual(rosterGames(roster, "deluxe").map((g) => g.title), ["RuneScape: Dragonwilds", "Ball x Pit", "Mega Man X Command Mission"]);
});
test("PS3 streaming-only additions are not advertised as Deluxe downloads", () => {
  const roster = parseRosterPost(post, now);
  assert.ok(roster);
  assert.equal(roster.games.some((g) => g.title === "Streaming-only game"), false);
});
test("retains specific release exceptions and labels September as September, not this month", () => {
  const roster = parseRosterPost(post, now);
  assert.ok(roster);
  assert.equal(roster.month, "2026-09");
  assert.equal(currentRosterMonth(now), "2026-10");
  assert.equal(roster.games[1]?.note, "Ball x Pit will be available September 22 in the US, the UK and Japan.");
});
test("only official HTTPS Sony posts, published by now, can populate roster", () => {
  assert.equal(parseRosterPost({ ...post, link: "https://example.com/" }, now), null);
  assert.equal(parseRosterPost({ ...post, pubDate: "Wed, 14 Oct 2026 15:30:00 +0000" }, now), null);
});test("Essential games are read from Sony's Monthly Games headline and show in every tier", () => {
  const e = parseEssentialPost({ title: "PlayStation Plus Monthly Games for October: F1 25, Hunt: Showdown 1896, Earth Defense Force: World Brothers 2", pubDate: "Tue, 29 Sep 2026 15:00:00 +0000" }, now);
  assert.deepEqual(e, { month: "2026-10", titles: ["F1 25", "Hunt: Showdown 1896", "Earth Defense Force: World Brothers 2"] });
});
