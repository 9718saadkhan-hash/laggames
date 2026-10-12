import { strict as assert } from "node:assert";
import { test } from "node:test";
import { comparisonBenefits, PS_PLUS_BENEFITS } from "./ps-plus-comparison";

test("game catalogue is included in Extra and Deluxe, not Essential", () => {
  assert.deepEqual(PS_PLUS_BENEFITS.find((row) => row.id === "catalogue")?.included, [false, true, true]);
});
test("game trials and classics are Deluxe benefits", () => {
  for (const id of ["trials", "classics"]) assert.deepEqual(PS_PLUS_BENEFITS.find((row) => row.id === id)?.included, [false, false, true]);
});
test("Deluxe does not include cloud streaming; cloud saves are included in all tiers", () => {
  assert.deepEqual(PS_PLUS_BENEFITS.find((row) => row.id === "streaming")?.included, [false, false, false]);
  assert.deepEqual(PS_PLUS_BENEFITS.find((row) => row.id === "saves")?.included, [true, true, true]);
});
test("differences filter retains only catalogue, classics and trials", () => {
  assert.deepEqual(comparisonBenefits(true).map((row) => row.id), ["catalogue", "classics", "trials"]);
  assert.equal(comparisonBenefits(false).length, 8);
});