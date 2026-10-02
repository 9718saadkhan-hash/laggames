/**
 * LAG media helpers: device-gallery image cropping/compression and
 * video uploads to the private `media` storage bucket.
 *
 * Images are stored as compact, already-cropped JPEG data URLs so no
 * public bucket / URL typing is ever required.
 */

import { supabase } from "@/integrations/supabase/client";

export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/jpg,image/png,image/webp";
export const ACCEPTED_VIDEO_TYPES = "video/mp4,video/webm,video/quicktime";

/** Optimized website-photo ceiling: no uploaded image is enlarged or exported at 4K. */
export const IMAGE_UPLOAD_MAX_EDGE = 1536;
export const IMAGE_UPLOAD_QUALITY = 0.76;

const ALLOWED_IMAGE = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ALLOWED_VIDEO = ["video/mp4", "video/webm", "video/quicktime", "video/mov"];

export function isAllowedImage(file: File) {
  return ALLOWED_IMAGE.includes(file.type.toLowerCase());
}
export function isAllowedVideo(file: File) {
  return ALLOWED_VIDEO.includes(file.type.toLowerCase());
}

/* ---------------------------------------------------------------- ratios */

export interface RatioOption {
  key: string;
  label: string;
  /** width / height, or null for free crop */
  value: number | null;
}

export const RATIO_OPTIONS: RatioOption[] = [
  { key: "1:1", label: "Square 1:1", value: 1 },
  { key: "2:3", label: "Game cover 2:3", value: 2 / 3 },
  { key: "4:5", label: "Portrait 4:5", value: 4 / 5 },
  { key: "4:3", label: "Standard 4:3", value: 4 / 3 },
  { key: "16:9", label: "Landscape 16:9", value: 16 / 9 },
  { key: "21:9", label: "Wide banner 21:9", value: 21 / 9 },
  { key: "free", label: "Custom / free", value: null },
];

/** Where an image is used — drives the recommended aspect ratio. */
export type ImagePurpose =
  | "avatar"
  | "logo"
  | "favicon"
  | "game-cover"
  | "game-banner"
  | "game-screenshot"
  | "deal-banner"
  | "hero-banner"
  | "ps-plus"
  | "ott"
  | "collab-thumb"
  | "review"
  | "generic";

export const PURPOSE_PRESET: Record<
  ImagePurpose,
  { ratio: string; label: string; maxSize: number; quality?: number }
> = {
  avatar: { ratio: "1:1", label: "Avatar", maxSize: 480 },
  logo: { ratio: "1:1", label: "Logo", maxSize: 512 },
  favicon: { ratio: "1:1", label: "Favicon", maxSize: 256 },
  "game-cover": { ratio: "2:3", label: "Game cover", maxSize: 900 },
  "game-banner": { ratio: "16:9", label: "Game hero banner", maxSize: IMAGE_UPLOAD_MAX_EDGE },
  "game-screenshot": { ratio: "16:9", label: "Screenshot", maxSize: IMAGE_UPLOAD_MAX_EDGE },
  "deal-banner": { ratio: "21:9", label: "Deal banner", maxSize: IMAGE_UPLOAD_MAX_EDGE },
  "hero-banner": { ratio: "16:9", label: "Homepage banner", maxSize: IMAGE_UPLOAD_MAX_EDGE },
  "ps-plus": { ratio: "4:3", label: "PS Plus card image", maxSize: 1100 },
  ott: { ratio: "1:1", label: "OTT logo / image", maxSize: 800 },
  "collab-thumb": { ratio: "16:9", label: "Collab thumbnail", maxSize: 1280 },
  review: { ratio: "4:3", label: "Review photo", maxSize: 1200 },
  generic: { ratio: "free", label: "Image", maxSize: IMAGE_UPLOAD_MAX_EDGE },
};

export function ratioValue(key: string): number | null {
  return RATIO_OPTIONS.find((r) => r.key === key)?.value ?? null;
}

/* ------------------------------------------------------- focal positions */

export const FOCAL_OPTIONS = [
  { key: "50% 50%", label: "Center" },
  { key: "50% 0%", label: "Top" },
  { key: "50% 100%", label: "Bottom" },
  { key: "0% 50%", label: "Left" },
  { key: "100% 50%", label: "Right" },
  { key: "50% 25%", label: "Upper third" },
  { key: "50% 75%", label: "Lower third" },
] as const;

export function safePosition(value?: string | null): string {
  return value && /%/.test(value) ? value : "50% 50%";
}

/* ----------------------------------------------------------- image utils */

export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That file is not a readable image."));
    img.src = src;
  });
}

export interface CropRect {
  /** source-pixel crop box */
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Render a crop box of an image to a compressed JPEG data URL. */
export async function renderCrop(
  src: string,
  crop: CropRect,
  opts: { maxSize?: number; quality?: number } = {},
): Promise<string> {
  const img = await loadImage(src);
  const maxSize = opts.maxSize ?? 1400;
  const quality = opts.quality ?? IMAGE_UPLOAD_QUALITY;
  const scale = Math.min(1, maxSize / Math.max(crop.width, crop.height));
  const w = Math.max(1, Math.round(crop.width * scale));
  const h = Math.max(1, Math.round(crop.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

/** Render a crop after rotating the source image around its center. */
export async function renderRotatedCrop(
  src: string,
  crop: CropRect,
  rotation: number,
  opts: { maxSize?: number; quality?: number } = {},
): Promise<string> {
  const img = await loadImage(src);
  const radians = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const boundW = Math.ceil(img.naturalWidth * cos + img.naturalHeight * sin);
  const boundH = Math.ceil(img.naturalWidth * sin + img.naturalHeight * cos);
  const rotated = document.createElement("canvas");
  rotated.width = boundW;
  rotated.height = boundH;
  const rotatedContext = rotated.getContext("2d");
  if (!rotatedContext) return src;
  rotatedContext.translate(boundW / 2, boundH / 2);
  rotatedContext.rotate(radians);
  rotatedContext.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

  const maxSize = opts.maxSize ?? 1400;
  const quality = opts.quality ?? IMAGE_UPLOAD_QUALITY;
  const outputScale = Math.min(1, maxSize / Math.max(crop.width, crop.height));
  const output = document.createElement("canvas");
  output.width = Math.max(1, Math.round(crop.width * outputScale));
  output.height = Math.max(1, Math.round(crop.height * outputScale));
  const outputContext = output.getContext("2d");
  if (!outputContext) return src;
  outputContext.imageSmoothingEnabled = true;
  outputContext.imageSmoothingQuality = "high";
  outputContext.drawImage(
    rotated,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    output.width,
    output.height,
  );
  return output.toDataURL("image/jpeg", quality);
}

/** Export the complete image (optionally rotated) with no cropping at all. */
export async function renderFullImage(
  src: string,
  rotation = 0,
  opts: { maxSize?: number; quality?: number } = {},
): Promise<string> {
  const img = await loadImage(src);
  const radians = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const boundW = Math.ceil(img.naturalWidth * cos + img.naturalHeight * sin);
  const boundH = Math.ceil(img.naturalWidth * sin + img.naturalHeight * cos);
  const maxSize = opts.maxSize ?? IMAGE_UPLOAD_MAX_EDGE;
  const quality = opts.quality ?? IMAGE_UPLOAD_QUALITY;
  const scale = Math.min(1, maxSize / Math.max(boundW, boundH));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(boundW * scale));
  canvas.height = Math.max(1, Math.round(boundH * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  ctx.imageSmoothingQuality = "high";
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(radians);
  ctx.scale(scale, scale);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  return canvas.toDataURL("image/jpeg", quality);
}

/** Legacy helpers kept for compatibility with existing callers. */

export async function compressImageFile(
  file: File,
  opts: { maxSize?: number; quality?: number } = {},
): Promise<string> {
  if (!isAllowedImage(file)) throw new Error("Please choose a JPG, PNG or WEBP image.");
  const original = await readAsDataUrl(file);
  try {
    const img = await loadImage(original);
    return await renderCrop(
      original,
      { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight },
      opts,
    );
  } catch {
    return original;
  }
}

/* ------------------------------------------------------------ video */

export interface UploadedVideo {
  path: string;
  url: string;
  size: number;
  mime: string;
}

const SIGNED_URL_TTL = 60 * 60 * 24 * 365; // 1 year

export async function signedMediaUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from("media").createSignedUrl(path, SIGNED_URL_TTL);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function uploadVideo(file: File): Promise<UploadedVideo> {
  if (!isAllowedVideo(file)) throw new Error("Please choose an MP4, WEBM or MOV video.");
  if (file.size > 200 * 1024 * 1024) throw new Error("Video is larger than 200MB.");
  const ext = (file.name.split(".").pop() ?? "mp4").toLowerCase();
  const path = `collabs/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("media")
    .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) throw new Error(error.message);
  const url = (await signedMediaUrl(path)) ?? "";
  return { path, url, size: file.size, mime: file.type };
}

export async function deleteVideo(path: string) {
  await supabase.storage.from("media").remove([path]);
}

/** Grab a poster frame from a local video file as a JPEG data URL. */
export function grabVideoThumbnail(file: File, atSeconds = 1): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    let settled = false;
    const done = (val: string | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(objectUrl);
      resolve(val);
    };
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = objectUrl;
    video.onloadeddata = () => {
      video.currentTime = Math.min(atSeconds, Math.max(0, (video.duration || 2) / 2));
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 1280 / (video.videoWidth || 1280));
        canvas.width = Math.round((video.videoWidth || 1280) * scale);
        canvas.height = Math.round((video.videoHeight || 720) * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return done(null);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        done(canvas.toDataURL("image/jpeg", 0.78));
      } catch {
        done(null);
      }
    };
    video.onerror = () => done(null);
    setTimeout(() => done(null), 8000);
  });
}

/* ----------------------------------------------------- media library */

export interface MediaItem {
  id: string;
  name: string;
  kind: string;
  url: string;
  storage_path: string | null;
  mime_type: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  folder: string;
  usage: string | null;
  created_at: string;
}

/** Record an uploaded asset in the central media library (best effort). */
export async function saveToMediaLibrary(item: {
  name: string;
  url: string;
  kind?: string;
  folder?: string;
  usage?: string | null;
  storagePath?: string | null;
  mimeType?: string | null;
  size?: number | null;
  width?: number | null;
  height?: number | null;
}) {
  try {
    await supabase.from("media_library").insert({
      name: item.name,
      url: item.url,
      kind: item.kind ?? "image",
      folder: item.folder ?? "general",
      usage: item.usage ?? null,
      storage_path: item.storagePath ?? null,
      mime_type: item.mimeType ?? null,
      size: item.size ?? null,
      width: item.width ?? null,
      height: item.height ?? null,
    } as never);
  } catch {
    /* media library bookkeeping must never block an upload */
  }
}
