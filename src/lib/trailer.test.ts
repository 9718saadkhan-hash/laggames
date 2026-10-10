import { strict as assert } from "node:assert";
import { test } from "node:test";
import { trailerSource } from "./trailer";

test("YouTube watch, short and embed links open the same autoplay player", () => {
  for (const url of ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ", "https://youtube.com/shorts/dQw4w9WgXcQ", "https://youtube.com/embed/dQw4w9WgXcQ"]) {
    assert.deepEqual(trailerSource(url), { kind: "embed", url: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0" });
  }
});

test("direct videos preserve signed query strings", () => {
  assert.deepEqual(trailerSource("https://media.example.com/trailer.mp4?token=example"), { kind: "video", url: "https://media.example.com/trailer.mp4?token=example" });
});

test("Vimeo embeds use its player", () => {
  assert.deepEqual(trailerSource("https://vimeo.com/123456"), { kind: "embed", url: "https://player.vimeo.com/video/123456?autoplay=1" });
});

test("missing, unsafe, unsupported and spoofed URLs cannot create players", () => {
  for (const url of [null, "", "javascript:alert(1)", "https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ", "https://youtube.com/watch?v=bad", "http://example.com/trailer.mp4", "https://example.com/page"]) {
    assert.equal(trailerSource(url), null);
  }
});