import { Check, Crop as CropIcon, RotateCcw, RotateCw, X, ZoomIn } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
  PURPOSE_PRESET,
  RATIO_OPTIONS,
  ratioValue,
  renderRotatedCrop,
  type ImagePurpose,
} from "@/lib/media";

/**
 * Crop / zoom / reposition dialog.
 *
 * The crop frame is measured from the DOM (never a fixed pixel width), so the
 * maths behind dragging, pinching and the exported crop always match what the
 * admin sees — on a 360px phone as well as a desktop. The image is always
 * scaled to cover the frame, so a crop can never contain empty/black areas.
 */
export function ImageCropper({
  open,
  src,
  purpose = "generic",
  onCancel,
  onSave,
}: {
  open: boolean;
  src: string | null;
  purpose?: ImagePurpose;
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
}) {
  const preset = PURPOSE_PRESET[purpose];
  const [ratioKey, setRatioKey] = useState(preset.ratio);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const ratio = ratioValue(ratioKey) ?? undefined;

  useEffect(() => {
    if (!open) return;
    setRatioKey(preset.ratio);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setRotation(0);
    setCroppedAreaPixels(null);
  }, [open, src, preset.ratio]);

  /* ---------------------------------------------------------------- save */

  async function handleSave() {
    if (!src || !croppedAreaPixels) return;
    setBusy(true);
    try {
      const out = await renderRotatedCrop(src, croppedAreaPixels, rotation, { maxSize: preset.maxSize });
      onSave(out);
    } finally {
      setBusy(false);
    }
  }

  const reset = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="flex h-[min(92dvh,760px)] w-[calc(100vw-1rem)] max-w-2xl grid-rows-none flex-col gap-3 overflow-hidden border-border bg-background p-0 sm:rounded-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between px-4 pt-4 pr-12">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" aria-hidden /> Cancel
            </Button>
            <DialogTitle className="font-display">Adjust image</DialogTitle>
            <Button type="button" variant="ghost" size="sm" disabled={busy || !croppedAreaPixels} onClick={() => void handleSave()}>
              <Check className="h-4 w-4" aria-hidden /> {busy ? "Saving…" : "Done"}
            </Button>
          </div>
        </DialogHeader>

        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1">
          {RATIO_OPTIONS.map((r) => (
            <Button
              key={r.key}
              type="button"
              variant={ratioKey === r.key ? "hero" : "nav"}
              size="sm"
              onClick={() => setRatioKey(r.key)}
              className="shrink-0"
            >
              {r.label}
            </Button>
          ))}
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden bg-surface-2">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={ratio}
              objectFit="cover"
              showGrid
              restrictPosition
              zoomWithScroll
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              classes={{ containerClassName: "lag-crop-container", cropAreaClassName: "lag-crop-area" }}
            />
          )}
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background/75 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
            Drag to move · Pinch to zoom
          </div>
        </div>

        <div className="space-y-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3">
            <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <Slider value={[zoom]} min={1} max={5} step={0.01} onValueChange={(v) => setZoom(v[0] ?? 1)} aria-label="Zoom" />
            <span className="w-10 text-right text-xs text-muted-foreground">{zoom.toFixed(1)}×</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button type="button" variant="nav" size="sm" onClick={() => setRotation((value) => value - 90)} aria-label="Rotate left">
              <RotateCcw className="h-4 w-4" aria-hidden />
            </Button>
            <Button type="button" variant="nav" size="sm" onClick={() => setRotation((value) => value + 90)} aria-label="Rotate right">
              <RotateCw className="h-4 w-4" aria-hidden />
            </Button>
            <Button type="button" variant="glass" size="sm" onClick={reset}>
              <CropIcon className="h-4 w-4" aria-hidden /> Reset
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
