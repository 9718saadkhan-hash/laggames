import { describe, test } from "node:test";
import { deepStrictEqual, strictEqual } from "node:assert";
import { releaseCountdown } from "./release-countdown";

describe("pre-order release countdown", () => {
  test("counts down live to the saved release date at midnight in India", () => {
    deepStrictEqual(releaseCountdown("2026-10-10", Date.parse("2026-10-08T18:29:59Z")), { reached: false, days: 1, hours: 0, minutes: 0, seconds: 1 });
    deepStrictEqual(releaseCountdown("2026-10-10", Date.parse("2026-10-08T18:30:00Z")), { reached: false, days: 1, hours: 0, minutes: 0, seconds: 0 });
  });
  test("stops at zero without implying stock availability or altering pre-order", () => {
    deepStrictEqual(releaseCountdown("2026-10-10", Date.parse("2026-10-09T18:30:00Z")), { reached: true, days: 0, hours: 0, minutes: 0, seconds: 0 });
    strictEqual(releaseCountdown("2026-10-10", Date.parse("2026-10-11T18:30:00Z"))?.reached, true);
  });
  test("never invents a release date", () => {
    for (const date of [null, undefined, "", "TBA", "2026-02-30"]) strictEqual(releaseCountdown(date, 0), null);
  });
});