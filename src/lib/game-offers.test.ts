import { describe, test } from "node:test";
import { deepStrictEqual, strictEqual } from "node:assert";
import { gameSearchOffers, priceFor } from "./game-offers";
import type { Game } from "./lag";

const game = { visible: true, primary_available: true, secondary_available: true, price_30: 500, price_60: 800, price_permanent: 1500, price_30_secondary: 300, price_60_secondary: null, price_permanent_secondary: 1000 } as Game;
describe("search offers match real account options", () => {
  test("keeps separate duration and account prices, including secondary fallback", () => {
    deepStrictEqual(gameSearchOffers(game, "/games/test").map((o) => o.price), [500, 800, 1500, 300, 800, 1000]);
    strictEqual(priceFor(game, "60", "secondary"), 800);
  });
  test("does not advertise disabled account offers", () => {
    deepStrictEqual(gameSearchOffers({ ...game, primary_available: false }, "/games/test").map((o) => o.price), [300, 800, 1000]);
    deepStrictEqual(gameSearchOffers({ ...game, primary_available: false, secondary_available: false }, "/games/test"), []);
  });
  test("omits unknown, invalid or missing prices instead of incomplete offers", () => {
    deepStrictEqual(gameSearchOffers({ ...game, secondary_available: false, price_30: null, price_60: NaN, price_permanent: -1 }, "/games/test"), []);
  });
  test("does not invent stock from a free-text label", () => {
    strictEqual(gameSearchOffers({ ...game, availability: "Out of Stock" }, "/games/test")[0]?.availability, undefined);
    strictEqual(gameSearchOffers({ ...game, pre_order: true }, "/games/test")[0]?.availability, "https://schema.org/PreOrder");
  });
  test("hidden games have no public offers", () => {
    deepStrictEqual(gameSearchOffers({ ...game, visible: false }, "/games/test"), []);
  });
});