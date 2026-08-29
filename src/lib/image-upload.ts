/**
 * Device-gallery image picking helpers.
 * Files chosen from the phone gallery / desktop file picker are resized and
 * compressed in the browser, then stored as a compact data URL so customers
 * never have to know an image URL.
 */

export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/jpg,image/png,image/webp";

const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export interface CompressOptions {
  /** Longest edge of the output image in px. */
  maxSize?: number;
  /** JPEG/WEBP quality between 0 and 1. */
  quality?: number;
}

export function isAllowedImage(file: File): boolean {
  return ALLOWED.includes(file.type.toLowerCase());
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That file is not a readable image."));
    img.src = src;
  });
}

/** Resize + compress an image file into a data URL (JPEG/WEBP). */
export async function compressImageFile(file: File, opts: CompressOptions = {}): Promise<string> {
  if (!isAllowedImage(file)) {
    throw new Error("Please choose a JPG, PNG or WEBP image.");
  }
  const maxSize = opts.maxSize ?? 512;
  const quality = opts.quality ?? 0.82;
  const original = await readAsDataUrl(file);

  try {
    const img = await loadImage(original);
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.drawImage(img, 0, 0, width, height);

    const out = canvas.toDataURL("image/jpeg", quality);
    return out.length < original.length ? out : original;
  } catch {
    return original;
  }
}

/** Avatar preset: small square-ish image, tiny payload. */
export function compressAvatar(file: File) {
  return compressImageFile(file, { maxSize: 320, quality: 0.8 });
}

/** Banner/cover preset for admin uploads. */
export function compressBanner(file: File) {
  return compressImageFile(file, { maxSize: 1440, quality: 0.78 });
}
