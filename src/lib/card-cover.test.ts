import { describe, expect, it } from "bun:test";
import { cardCoverSize } from "./card-cover";

describe("cardCoverSize", () => {
  it("shrinks a 1024x1536 cover to 360x540 keeping the ratio", () => {
    expect(cardCoverSize(1024, 1536)).toEqual({ width: 360, height: 540 });
  });
  it("never enlarges a small cover", () => {
    expect(cardCoverSize(300, 450)).toEqual({ width: 300, height: 450 });
  });
});
