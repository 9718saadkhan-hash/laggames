import { describe, expect, test } from "bun:test";
import { releaseCountdown } from "./release-countdown";

describe("pre-order release countdown", () => {
  test("counts down live to the saved release date at midnight in India", () => {
    expect(releaseCountdown("2026-10-10", Date.parse("2026-10-08T18:29:59Z"))).toEqual({ reached: false, days: 1, hours: 0, minutes: 0, seconds: 1 });
    expect(releaseCountdown("2026-10-10", Date.parse("2026-10-08T18:30:00Z"))).toEqual({ reached: false, days: 1, hours: 0, minutes: 0, seconds: 0 });
  });
  test("stops at zero without implying stock availability or altering pre-order", () => {
    expect(releaseCountdown("2026-10-10", Date.parse("2026-10-09T18:30:00Z"))).toEqual({ reached: true, days: 0, hours: 0, minutes: 0, seconds: 0 });
    expect(releaseCountdown("2026-10-10", Date.parse("2026-10-11T18:30:00Z"))?.reached).toBe(true);
  });
  test("never invents a release date", () => {
    for (const date of [null, undefined, "", "TBA", "2026-02-30"]) expect(releaseCountdown(date, 0)).toBeNull();
  });
});