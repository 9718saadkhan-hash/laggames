import { Crop, ImagePlus, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { ImageCropper } from "@/components/lag/ImageCropper";
import { Button } from "@/components/ui/button";
import {
  ACCEPTED_IMAGE_TYPES,
  PURPOSE_PRESET,
  isAllowedImage,
  readAsDataUrl,
  type ImagePurpose,
} from "@/lib/media";
import { cn } from "@/lib/utils";

/**
 * Device-gallery image picker with crop / zoom / reposition editor.
 * No image URL typing anywhere: pick from gallery → crop → save.
 */
export function ImageUploadField({
  value,
  onChange,
  label = "Upload image",
  purpose = "generic",
  variant,
  mediaFolder,
  className,
}: {
  value: string | null | undefined;
  onChange: (dataUrl: string | null) => void;
  label?: string;
  purpose?: ImagePurpose;
  /** legacy prop — "avatar" renders a round preview */
  variant?: "avatar" | "banner";
  mediaFolder?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const resolvedPurpose: ImagePurpose = variant === "avatar" && purpose === "generic" ? "avatar" : purpose;
  const preset = PURPOSE_PRESET[resolvedPurpose];
  const round = resolvedPurpose === "avatar" || variant === "avatar";

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!isAllowedImage(file)) {
      toast.error("Please choose a JPG, PNG or WEBP image.");
      return;
    }
    try {
      const raw = await readAsDataUrl(file);
      setPending(raw);
      setEditing(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that image.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-center gap-3">
        {value ? (
          <img
            src={value}
            alt="Selected image preview"
            loading="lazy"
            className={cn(
              "shrink-0 border border-border object-cover",
              round ? "h-16 w-16 rounded-full" : "h-16 w-28 rounded-xl",
            )}
          />
        ) : (
          <div
            aria-hidden
            className={cn(
              "glass grid shrink-0 place-items-center text-muted-foreground",
              round ? "h-16 w-16 rounded-full" : "h-16 w-28 rounded-xl",
            )}
          >
            <ImagePlus className="h-5 w-5" />
          </div>
        )}

        <div className="flex min-w-0 flex-wrap gap-2">
          <Button type="button" variant="glass" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" aria-hidden />
            {value ? "Replace" : label}
          </Button>
          {value && (
            <>
              <Button
                type="button"
                variant="glass"
                size="sm"
                onClick={() => {
                  setPending(value);
                  setEditing(true);
                }}
              >
                <Crop className="h-4 w-4" aria-hidden />
                Re-crop
              </Button>
              <Button type="button" variant="nav" size="sm" onClick={() => onChange(null)}>
                <Trash2 className="h-4 w-4" aria-hidden />
                Remove
              </Button>
            </>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="sr-only"
        aria-label={label}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        JPG, PNG or WEBP. Saved as an optimized 1.5K image without stretching or upscaling.
        Recommended ratio for {preset.label}: {preset.ratio}.
      </p>

      <ImageCropper
        open={editing}
        src={pending}
        purpose={resolvedPurpose}
        onCancel={() => {
          setEditing(false);
          setPending(null);
        }}
        onSave={(out) => {
          // Only the image actually saved on the item is kept — no extra copies.
          onChange(out);
          setEditing(false);
          setPending(null);
        }}
      />
    </div>
  );
}
