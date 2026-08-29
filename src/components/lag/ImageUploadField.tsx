import { ImagePlus, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ACCEPTED_IMAGE_TYPES, compressAvatar, compressBanner } from "@/lib/image-upload";
import { cn } from "@/lib/utils";

/**
 * Device-gallery image picker with preview. No URL typing required.
 * `variant="avatar"` renders a round preview, `"banner"` a wide preview.
 */
export function ImageUploadField({
  value,
  onChange,
  label = "Upload image",
  variant = "banner",
  className,
}: {
  value: string | null | undefined;
  onChange: (dataUrl: string | null) => void;
  label?: string;
  variant?: "avatar" | "banner";
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = variant === "avatar" ? await compressAvatar(file) : await compressBanner(file);
      onChange(dataUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that image.");
    } finally {
      setBusy(false);
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
            className={cn(
              "shrink-0 border border-border object-cover",
              variant === "avatar" ? "h-16 w-16 rounded-full" : "h-16 w-28 rounded-xl",
            )}
          />
        ) : (
          <div
            aria-hidden
            className={cn(
              "glass grid shrink-0 place-items-center text-muted-foreground",
              variant === "avatar" ? "h-16 w-16 rounded-full" : "h-16 w-28 rounded-xl",
            )}
          >
            <ImagePlus className="h-5 w-5" />
          </div>
        )}

        <div className="flex min-w-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="glass"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" aria-hidden />
            {busy ? "Processing…" : value ? "Replace" : label}
          </Button>
          {value && (
            <Button type="button" variant="nav" size="sm" onClick={() => onChange(null)}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Remove
            </Button>
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
        JPG, PNG or WEBP from your device. Images are resized automatically.
      </p>
    </div>
  );
}
