/** Card covers: a light copy of the full cover, same shape, nothing cropped. */
export const CARD_COVER_WIDTH = 360;

/** The light-card option only applies to covers up to 1080p; larger covers are skipped. */
export const CARD_COVER_MAX_SOURCE = 1080;

/** True when a cover qualifies for a light card copy (cover width up to 1080px, i.e. 1080p). */
export function cardCoverEligible(width: number, _height: number, max = CARD_COVER_MAX_SOURCE) {
  return width <= max;
}

/** Width/height for the light copy — never enlarges, keeps the exact ratio. */
export function cardCoverSize(width: number, height: number, max = CARD_COVER_WIDTH) {
  if (width <= max) return { width, height };
  return { width: max, height: Math.round((height * max) / width) };
}

/** Browser-only: builds the light card copy of a cover image as a WebP data URL. */
export async function makeCardCover(src: string): Promise<string | null> {
  if (!src) return null;
  const blob = await (await fetch(src)).blob();
  const bitmap = await createImageBitmap(blob);
  if (!cardCoverEligible(bitmap.width, bitmap.height)) {
    bitmap.close();
    return null;
  }
  const { width, height } = cardCoverSize(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL("image/webp", 0.78);
}
