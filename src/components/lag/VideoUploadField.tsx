import { Film, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  ACCEPTED_VIDEO_TYPES,
  deleteVideo,
  grabVideoThumbnail,
  isAllowedVideo,
  saveToMediaLibrary,
  uploadVideo,
} from "@/lib/media";
import { cn } from "@/lib/utils";

export interface VideoValue {
  url: string | null;
  storagePath: string | null;
  thumbnail: string | null;
}

/**
 * Direct video upload from device gallery/files into the private media
 * bucket, with an auto-generated poster frame. Videos are never autoloaded
 * on the public site — the thumbnail is shown until a visitor plays.
 */
export function VideoUploadField({
  value,
  onChange,
  className,
}: {
  value: VideoValue;
  onChange: (next: VideoValue) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progressNote, setProgressNote] = useState("");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!isAllowedVideo(file)) {
      toast.error("Please choose an MP4, WEBM or MOV video.");
      return;
    }
    setBusy(true);
    setProgressNote("Generating thumbnail…");
    try {
      const thumb = await grabVideoThumbnail(file);
      setProgressNote("Uploading video…");
      const up = await uploadVideo(file);
      onChange({ url: up.url, storagePath: up.path, thumbnail: thumb ?? value.thumbnail });
      void saveToMediaLibrary({
        name: file.name,
        url: up.url,
        kind: "video",
        folder: "collabs",
        usage: "Collab video",
        storagePath: up.path,
        mimeType: up.mime,
        size: up.size,
      });
      toast.success("Video uploaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      setProgressNote("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (value.storagePath) await deleteVideo(value.storagePath);
    onChange({ url: null, storagePath: null, thumbnail: value.thumbnail });
  }

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-center gap-3">
        {value.thumbnail ? (
          <img
            src={value.thumbnail}
            alt="Video thumbnail"
            loading="lazy"
            className="h-16 w-28 shrink-0 rounded-xl border border-border object-cover"
          />
        ) : (
          <div aria-hidden className="glass grid h-16 w-28 shrink-0 place-items-center rounded-xl text-muted-foreground">
            <Film className="h-5 w-5" />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="glass" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" aria-hidden />
            {busy ? (progressNote || "Uploading…") : value.storagePath ? "Replace video" : "Upload video"}
          </Button>
          {value.storagePath && (
            <Button type="button" variant="nav" size="sm" disabled={busy} onClick={() => void handleRemove()}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Remove
            </Button>
          )}
        </div>
      </div>

      {value.storagePath && value.url && (
        <video
          src={value.url}
          poster={value.thumbnail ?? undefined}
          controls
          preload="none"
          playsInline
          className="mt-3 w-full max-w-md rounded-xl border border-border"
        />
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_VIDEO_TYPES}
        className="sr-only"
        aria-label="Upload video"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        MP4, WEBM or MOV up to 200MB. A thumbnail is generated automatically and videos load only when played.
      </p>
    </div>
  );
}
