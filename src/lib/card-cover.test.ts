import { strict as assert } from "node:assert";
import { test } from "node:test";
import { cardCoverSize } from "./card-cover";

test("shrinks a 1024x1536 cover to 360x540 keeping the ratio", () => {
  assert.deepEqual(cardCoverSize(1024, 1536), { width: 360, height: 540 });
});

test("never enlarges a small cover", () => {
  assert.deepEqual(cardCoverSize(300, 450), { width: 300, height: 450 });
});
