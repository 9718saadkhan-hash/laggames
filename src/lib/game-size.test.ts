import { strict as assert } from "node:assert";
import { test } from "node:test";
import { formatGameSize } from "./lag";

test("bare numbers always get the GB unit appended", () => {
  for (const [input, expected] of [
    ["160", "160 GB"],
    ["80.5", "80.5 GB"],
    [" 100 ", "100 GB"],
    [null, "Ask on WhatsApp"],
    ["", "Ask on WhatsApp"],
  ] as const) {
    assert.equal(formatGameSize(input), expected);
  }
});

test("values that already carry GB stay untouched", () => {
  assert.equal(formatGameSize("160 GB"), "160 GB");
  assert.equal(formatGameSize("160gb"), "160gb");
  assert.equal(formatGameSize("160 GB (disc version)"), "160 GB (disc version)");
});

test("free-text sizes are shown as entered", () => {
  assert.equal(formatGameSize("Ask on WhatsApp"), "Ask on WhatsApp");
});
