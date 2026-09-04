/** Compatibility shim — the image system now lives in `@/lib/media`. */
export {
  ACCEPTED_IMAGE_TYPES,
  compressImageFile,
  isAllowedImage,
} from "@/lib/media";
import { compressImageFile } from "@/lib/media";

export function compressAvatar(file: File) {
  return compressImageFile(file, { maxSize: 480, quality: 0.8 });
}
export function compressBanner(file: File) {
  return compressImageFile(file, { maxSize: 1440, quality: 0.78 });
}
