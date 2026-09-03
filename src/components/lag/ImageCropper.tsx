import { Check, Move, RotateCcw, X, ZoomIn } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
  PURPOSE_PRESET,
  RATIO_OPTIONS,
  ratioValue,
  renderCrop,
  type ImagePurpose,
} from "@/lib/media";
import { cn } from "@/lib/utils";

const VIEW_W = 520;

/**
 * Crop / zoom / reposition dialog. GPU-friendly: the preview is a single
 * transformed <img>, so dragging and zooming stay smooth on 120Hz screens.
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
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [busy, setBusy] = useState(false);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setRatioKey(preset.ratio);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [open, src, preset.ratio]);

  const freeRatio = natural.w && natural.h ? natural.w / natural.h : 16 / 9;
  const ratio = ratioValue(ratioKey) ?? freeRatio;

  const view = useMemo(() => {
    const w = VIEW_W;
    const h = Math.round(w / ratio);
    const maxH = 420;
    if (h > maxH) return { w: Math.round(maxH * ratio), h: maxH };
    return { w, h };
  }, [ratio]);

  const baseScale = useMemo(() => {
    if (!natural.w || !natural.h) return 1;
    return Math.max(view.w / natural.w, view.h / natural.h);
  }, [natural, view]);

  const scale = baseScale * zoom;
  const dw = natural.w * scale;
  const dh = natural.h * scale;

  const clamp = useCallback(
    (o: { x: number; y: number }) => ({
      x: Math.min(0, Math.max(view.w - dw, o.x)),
      y: Math.min(0, Math.max(view.h - dh, o.y)),
    }),
    [view, dw, dh],
  );

  useEffect(() => {
    if (!natural.w) return;
    setOffset((o) => {
      const centered = { x: (view.w - dw) / 2, y: (view.h - dh) / 2 };
      const target = o.x === 0 && o.y === 0 ? centered : o;
      return {
        x: Math.min(0, Math.max(view.w - dw, target.x)),
        y: Math.min(0, Math.max(view.h - dh, target.y)),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natural.w, natural.h, view.w, view.h, dw, dh]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    setOffset(clamp({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }));
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  async function handleSave() {
    if (!src) return;
    setBusy(true);
    try {
      const crop = {
        x: Math.max(0, -offset.x / scale),
        y: Math.max(0, -offset.y / scale),
        width: Math.min(natural.w, view.w / scale),
        height: Math.min(natural.h, view.h / scale),
      };
      const out = await renderCrop(src, crop, { maxSize: preset.maxSize });
      onSave(out);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crop &amp; position image</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Recommended for {preset.label}: <span className="font-semibold text-foreground">{preset.ratio}</span>.
          Drag the image to reposition, pinch or use the slider to zoom.
        </p>

        <div className="flex flex-wrap gap-2">
          {RATIO_OPTIONS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => {
                setRatioKey(r.key);
                setOffset({ x: 0, y: 0 });
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                ratioKey === r.key
                  ? "border-lag-red/50 bg-lag-red/15 text-lag-red"
                  : "border-border text-muted-foreground hover:bg-surface-2 hover:text-foreground",
              )}
            >
              {r.label}
              {r.key === preset.ratio ? " ★" : ""}
            </button>
          ))}
        </div>

        <div className="mx-auto w-full overflow-hidden">
          <div
            className="relative mx-auto max-w-full touch-none overflow-hidden rounded-2xl border border-border bg-surface-2"
            style={{ width: view.w, height: view.h, maxWidth: "100%" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {src && (
              <img
                src={src}
                alt="Crop preview"
                draggable={false}
                onLoad={(e) =>
                  setNatural({
                    w: e.currentTarget.naturalWidth,
                    h: e.currentTarget.naturalHeight,
                  })
                }
                className="absolute left-0 top-0 origin-top-left select-none will-change-transform"
                style={{
                  width: natural.w || undefined,
                  height: natural.h || undefined,
                  transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
                  transformOrigin: "0 0",
                }}
              />
            )}
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-40">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/20" />
              ))}
            </div>
            <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-md">
              <Move className="h-3 w-3" aria-hidden /> Drag to reposition
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <Slider
            value={[zoom]}
            min={1}
            max={4}
            step={0.01}
            onValueChange={(v) => setZoom(v[0] ?? 1)}
            aria-label="Zoom"
          />
          <Button
            type="button"
            variant="nav"
            size="sm"
            onClick={() => {
              setZoom(1);
              setOffset({ x: 0, y: 0 });
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reset
          </Button>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="nav" onClick={onCancel}>
            <X className="h-4 w-4" aria-hidden />
            Cancel
          </Button>
          <Button type="button" variant="hero" disabled={busy || !src} onClick={() => void handleSave()}>
            <Check className="h-4 w-4" aria-hidden />
            {busy ? "Saving…" : "Save image"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
