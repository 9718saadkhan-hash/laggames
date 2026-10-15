import { strict as assert } from "node:assert";
import { test } from "node:test";
import { cardCoverEligible, cardCoverSize } from "./card-cover";

test("shrinks a 1024x1536 cover to 360x540 keeping the ratio", () => {
  assert.deepEqual(cardCoverSize(1024, 1536), { width: 360, height: 540 });
});

test("never enlarges a small cover", () => {
  assert.deepEqual(cardCoverSize(300, 450), { width: 300, height: 450 });
});

test("covers up to 720p are eligible for a light card copy", () => {
  assert.equal(cardCoverEligible(720, 1280), false);
  assert.equal(cardCoverEligible(720, 720), true);
  assert.equal(cardCoverEligible(360, 540), true);
});

test("covers larger than 720p are skipped", () => {
  assert.equal(cardCoverEligible(1024, 1536), false);
  assert.equal(cardCoverEligible(721, 100), false);
});
