import { Check, Move, RotateCcw, X, ZoomIn } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [frameW, setFrameW] = useState(0);
  const [busy, setBusy] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const wrapRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; zoom: number } | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const centeredFor = useRef("");

  /* ---------------------------------------------------------------- sizes */

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setFrameW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  const freeRatio = natural.w && natural.h ? natural.w / natural.h : 16 / 9;
  const ratio = ratioValue(ratioKey) ?? freeRatio;

  const view = useMemo(() => {
    const maxH = 380;
    const w = Math.max(1, frameW);
    let h = w / ratio;
    if (h > maxH) h = maxH;
    return { w: Math.round(ratio * h) <= w ? Math.round(ratio * h) : w, h: Math.round(h) };
  }, [frameW, ratio]);

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
    [view.w, view.h, dw, dh],
  );

  /** Re-centre whenever the source, ratio or frame size changes. */
  const key = `${src ?? ""}|${ratioKey}|${view.w}x${view.h}|${natural.w}x${natural.h}`;
  useEffect(() => {
    if (!natural.w || !view.w) return;
    if (centeredFor.current === key) {
      setOffset((o) => clamp(o));
      return;
    }
    centeredFor.current = key;
    setOffset(clamp({ x: (view.w - dw) / 2, y: (view.h - dh) / 2 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, natural.w, view.w, dw, dh]);

  useEffect(() => {
    if (!open) return;
    setRatioKey(preset.ratio);
    setZoom(1);
    setNatural({ w: 0, h: 0 });
    centeredFor.current = "";
  }, [open, src, preset.ratio]);

  /* ------------------------------------------------------------- pointers */

  function syncPointers(e: React.PointerEvent) {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    syncPointers(e);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { dist: Math.hypot(a!.x - b!.x, a!.y - b!.y) || 1, zoom };
      drag.current = null;
    } else {
      drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    syncPointers(e);

    if (pointers.current.size >= 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y) || 1;
      const next = Math.min(5, Math.max(1, gesture.current.zoom * (dist / gesture.current.dist)));
      setZoom(next);
      return;
    }
    const d = drag.current;
    if (!d) return;
    setOffset(clamp({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }));
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
    if (pointers.current.size === 0) drag.current = null;
  }

  /* ---------------------------------------------------------------- save */

  async function handleSave() {
    if (!src || !natural.w) return;
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

  const previewStyle = {
    backgroundImage: src ? `url(${src})` : undefined,
    backgroundSize: `${dw}px ${dh}px`,
    backgroundPosition: `${offset.x}px ${offset.y}px`,
    backgroundRepeat: "no-repeat",
  } as const;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-x-hidden overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crop &amp; position image</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Recommended for {preset.label}: <span className="font-semibold text-foreground">{preset.ratio}</span>.
          Drag to reposition, pinch or use the slider to zoom.
        </p>

        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {RATIO_OPTIONS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRatioKey(r.key)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
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

        <div ref={wrapRef} className="w-full min-w-0">
          <div
            className="relative mx-auto touch-none overflow-hidden rounded-2xl border border-border bg-surface-2"
            style={{ width: view.w, height: view.h }}
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
                  setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
                }
                className="pointer-events-none absolute top-0 left-0 max-w-none origin-top-left select-none"
                style={{
                  width: dw || undefined,
                  height: dh || undefined,
                  transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
                }}
              />
            )}
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/25" />
              ))}
            </div>
            <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white">
              <Move className="h-3 w-3" aria-hidden /> Drag to reposition
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <Slider
            value={[zoom]}
            min={1}
            max={5}
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
              centeredFor.current = "";
              setOffset(clamp({ x: (view.w - natural.w * baseScale) / 2, y: (view.h - natural.h * baseScale) / 2 }));
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reset
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-muted-foreground">Live preview</span>
          <div
            aria-hidden
            className="h-16 w-16 shrink-0 rounded-xl border border-border"
            style={{ ...previewStyle, backgroundSize: `${(dw / view.w) * 64}px ${(dh / view.h) * 64}px`, backgroundPosition: `${(offset.x / view.w) * 64}px ${(offset.y / view.h) * 64}px` }}
          />
          <div
            aria-hidden
            className="h-16 flex-1 rounded-xl border border-border"
            style={{ ...previewStyle, backgroundSize: `${(dw / view.w) * 100}% ${(dh / view.h) * 100}%`, backgroundPosition: `${(offset.x / view.w) * 100}% ${(offset.y / view.h) * 100}%` }}
          />
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="nav" onClick={onCancel}>
            <X className="h-4 w-4" aria-hidden />
            Cancel
          </Button>
          <Button type="button" variant="hero" disabled={busy || !src || !natural.w} onClick={() => void handleSave()}>
            <Check className="h-4 w-4" aria-hidden />
            {busy ? "Saving…" : "Save image"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
