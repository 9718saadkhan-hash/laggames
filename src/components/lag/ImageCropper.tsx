import { Check, Redo2, RotateCcw, RotateCw, Undo2, X, ZoomIn } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  IMAGE_UPLOAD_MAX_EDGE,
  IMAGE_UPLOAD_QUALITY,
  PURPOSE_PRESET,
  loadImage,
  renderFullImage,
  renderRotatedCrop,
  type ImagePurpose,
} from "@/lib/media";
import { cn } from "@/lib/utils";

type ModeKey = "full" | "16:9" | "4:3" | "1:1" | "4:5" | "21:9" | "custom";

const MODES: { key: ModeKey; label: string; ratio: number | null }[] = [
  { key: "full", label: "Show full image", ratio: null },
  { key: "16:9", label: "16:9", ratio: 16 / 9 },
  { key: "4:3", label: "4:3", ratio: 4 / 3 },
  { key: "1:1", label: "1:1", ratio: 1 },
  { key: "4:5", label: "Portrait 4:5", ratio: 4 / 5 },
  { key: "21:9", label: "Landscape 21:9", ratio: 21 / 9 },
  { key: "custom", label: "Custom", ratio: null },
];

/** Map the legacy purpose preset ratio onto a mode. Banners default to full. */
function defaultMode(presetRatio: string): ModeKey {
  const found = MODES.find((m) => m.key === presetRatio);
  return found ? found.key : "full";
}

interface Snapshot {
  mode: ModeKey;
  zoom: number;
  rotation: number;
  crop: { x: number; y: number };
  box: { w: number; h: number } | null;
}

/**
 * Phone-gallery style image editor: full-image mode (no cropping at all),
 * preset ratios, and a true custom crop box with draggable edges/corners,
 * live pixel dimensions, manual size entry, drag/pinch/zoom, rotation and
 * undo / redo / reset.
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
  const stageRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<ModeKey>(defaultMode(preset.ratio));
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const [history, setHistory] = useState<Snapshot[]>([]);
  const [cursor, setCursor] = useState(0);
  const skipHistory = useRef(false);

  const ratio = MODES.find((m) => m.key === mode)?.ratio ?? undefined;

  /* --------------------------------------------------------- measurements */

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el || !open) return;
    const measure = () => setStage({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, mode]);

  useEffect(() => {
    if (!open || !src) return;
    let alive = true;
    void loadImage(src)
      .then((img) => {
        if (alive) setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      })
      .catch(() => setNatural(null));
    return () => {
      alive = false;
    };
  }, [open, src]);

  const reset = useCallback(() => {
    setMode(defaultMode(preset.ratio));
    setZoom(1);
    setRotation(0);
    setCrop({ x: 0, y: 0 });
    setBox(null);
    setArea(null);
  }, [preset.ratio]);

  useEffect(() => {
    if (!open) return;
    skipHistory.current = true;
    reset();
    setHistory([]);
    setCursor(0);
  }, [open, src, reset]);

  /* custom box defaults to the largest box matching the image proportions */
  useEffect(() => {
    if (mode !== "custom" || box || !stage.w || !stage.h) return;
    const imgRatio = natural ? natural.w / natural.h : 16 / 9;
    const maxW = stage.w - 40;
    const maxH = stage.h - 40;
    let w = maxW;
    let h = w / imgRatio;
    if (h > maxH) {
      h = maxH;
      w = h * imgRatio;
    }
    setBox({ w: Math.round(w), h: Math.round(h) });
  }, [mode, box, stage, natural]);

  /* ------------------------------------------------------------- history */

  const snapshot: Snapshot = { mode, zoom, rotation, crop, box };
  useEffect(() => {
    if (!open) return;
    if (skipHistory.current) {
      skipHistory.current = false;
      setHistory([snapshot]);
      setCursor(0);
      return;
    }
    const t = window.setTimeout(() => {
      setHistory((h) => {
        const trimmed = h.slice(0, cursor + 1);
        const last = trimmed[trimmed.length - 1];
        if (last && JSON.stringify(last) === JSON.stringify(snapshot)) return h;
        const next = [...trimmed, snapshot].slice(-30);
        setCursor(next.length - 1);
        return next;
      });
    }, 260);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, zoom, rotation, crop.x, crop.y, box?.w, box?.h, open]);

  const applySnapshot = (s: Snapshot) => {
    skipHistory.current = false;
    setMode(s.mode);
    setZoom(s.zoom);
    setRotation(s.rotation);
    setCrop(s.crop);
    setBox(s.box);
  };

  const undo = () => {
    if (cursor <= 0) return;
    const s = history[cursor - 1];
    if (!s) return;
    setCursor(cursor - 1);
    applySnapshot(s);
  };
  const redo = () => {
    if (cursor >= history.length - 1) return;
    const s = history[cursor + 1];
    if (!s) return;
    setCursor(cursor + 1);
    applySnapshot(s);
  };

  /* ------------------------------------------------- custom box resizing */

  const resizeRef = useRef<{
    dir: string;
    startX: number;
    startY: number;
    w: number;
    h: number;
  } | null>(null);

  const startResize = (dir: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    resizeRef.current = {
      dir,
      startX: e.clientX,
      startY: e.clientY,
      w: box?.w ?? 0,
      h: box?.h ?? 0,
    };
  };

  const onResizeMove = (e: React.PointerEvent) => {
    const r = resizeRef.current;
    if (!r || !stage.w) return;
    const dx = e.clientX - r.startX;
    const dy = e.clientY - r.startY;
    const gx = r.dir.includes("e") ? dx * 2 : r.dir.includes("w") ? -dx * 2 : 0;
    const gy = r.dir.includes("s") ? dy * 2 : r.dir.includes("n") ? -dy * 2 : 0;
    const w = Math.max(60, Math.min(stage.w - 8, r.w + gx));
    const h = Math.max(60, Math.min(stage.h - 8, r.h + gy));
    setBox({ w: Math.round(w), h: Math.round(h) });
  };

  const endResize = () => {
    resizeRef.current = null;
  };

  /* set the crop box from manually typed output pixels */
  const setManual = (w: number, h: number) => {
    if (!stage.w || !stage.h || w <= 0 || h <= 0) return;
    const r = w / h;
    let bw = stage.w - 16;
    let bh = bw / r;
    if (bh > stage.h - 16) {
      bh = stage.h - 16;
      bw = bh * r;
    }
    setBox({ w: Math.round(bw), h: Math.round(bh) });
  };

  const outW = area ? Math.round(area.width) : natural?.w ?? 0;
  const outH = area ? Math.round(area.height) : natural?.h ?? 0;

  /* ---------------------------------------------------------------- save */

  async function handleSave() {
    if (!src) return;
    setBusy(true);
    try {
      const maxSize = Math.min(preset.maxSize, IMAGE_UPLOAD_MAX_EDGE);
      const outputOptions = { maxSize, quality: preset.quality ?? IMAGE_UPLOAD_QUALITY };
      const out =
        mode === "full"
          ? await renderFullImage(src, rotation, outputOptions)
          : area
            ? await renderRotatedCrop(src, area, rotation, outputOptions)
            : await renderFullImage(src, rotation, outputOptions);
      onSave(out);
    } finally {
      setBusy(false);
    }
  }

  const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="flex h-[min(94dvh,820px)] w-[calc(100vw-1rem)] max-w-2xl grid-rows-none flex-col gap-3 overflow-hidden border-border bg-background p-0 sm:rounded-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between px-4 pt-4 pr-12">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" aria-hidden /> Cancel
            </Button>
            <DialogTitle className="font-display">Adjust image</DialogTitle>
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void handleSave()}>
              <Check className="h-4 w-4" aria-hidden /> {busy ? "Saving…" : "Done"}
            </Button>
          </div>
        </DialogHeader>

        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1">
          {MODES.map((m) => (
            <Button
              key={m.key}
              type="button"
              variant={mode === m.key ? "hero" : "nav"}
              size="sm"
              onClick={() => {
                setMode(m.key);
                setCrop({ x: 0, y: 0 });
                setZoom(1);
                if (m.key !== "custom") setBox(null);
              }}
              className="shrink-0"
            >
              {m.label}
            </Button>
          ))}
        </div>

        <div
          ref={stageRef}
          className="relative min-h-0 flex-1 overflow-hidden bg-surface-2"
          style={{ touchAction: "none" }}
        >
          {src && mode === "full" && (
            <div className="absolute inset-0 grid place-items-center p-3">
              <img
                src={src}
                alt="Full image preview"
                style={{ transform: `rotate(${rotation}deg)` }}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}

          {src && mode !== "full" && (
            <>
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                minZoom={1}
                maxZoom={5}
                rotation={rotation}
                {...(mode === "custom" ? {} : { aspect: ratio })}
                {...(mode === "custom" && box ? { cropSize: { width: box.w, height: box.h } } : {})}
                objectFit="contain"
                showGrid
                restrictPosition={false}
                zoomWithScroll
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setArea(pixels)}
                classes={{ containerClassName: "lag-crop-container", cropAreaClassName: "lag-crop-area" }}
              />
              {mode === "custom" && box && (
                <div
                  className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{ width: box.w, height: box.h }}
                >
                  {HANDLES.map((dir) => (
                    <span
                      key={dir}
                      role="presentation"
                      onPointerDown={startResize(dir)}
                      onPointerMove={onResizeMove}
                      onPointerUp={endResize}
                      onPointerCancel={endResize}
                      className={cn(
                        "pointer-events-auto absolute h-7 w-7 rounded-full border border-white/70 bg-background/70 backdrop-blur-md",
                        dir.includes("n") && "-top-3.5",
                        dir.includes("s") && "-bottom-3.5",
                        dir.includes("w") && "-left-3.5",
                        dir.includes("e") && "-right-3.5",
                        (dir === "n" || dir === "s") && "left-1/2 -ml-3.5",
                        (dir === "e" || dir === "w") && "top-1/2 -mt-3.5",
                        dir.length === 2 ? "cursor-nwse-resize" : "cursor-ns-resize",
                      )}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background/75 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
            {mode === "full"
              ? "Complete image — nothing is cropped"
              : `${outW} × ${outH} px · drag to move · pinch to zoom`}
          </div>
        </div>

        <div className="space-y-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="text-center text-xs text-muted-foreground">
            Optimized photo · maximum 1.5K (1536 px) · original proportions preserved
          </p>
          {mode === "custom" && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold">Exact size</span>
              <Input
                type="number"
                inputMode="numeric"
                aria-label="Custom width"
                defaultValue={outW || 1536}
                onBlur={(e) => setManual(Number(e.target.value), outH || 710)}
                className="h-9 w-24"
              />
              <span>×</span>
              <Input
                type="number"
                inputMode="numeric"
                aria-label="Custom height"
                defaultValue={outH || 710}
                onBlur={(e) => setManual(outW || 1536, Number(e.target.value))}
                className="h-9 w-24"
              />
              <span>px</span>
            </div>
          )}

          {mode !== "full" && (
            <div className="flex items-center gap-3">
              <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <Slider value={[zoom]} min={1} max={5} step={0.01} onValueChange={(v) => setZoom(v[0] ?? 1)} aria-label="Zoom" />
              <span className="w-10 text-right text-xs text-muted-foreground">{zoom.toFixed(1)}×</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button type="button" variant="nav" size="sm" onClick={() => setRotation((v) => v - 90)} aria-label="Rotate left">
              <RotateCcw className="h-4 w-4" aria-hidden />
            </Button>
            <Button type="button" variant="nav" size="sm" onClick={() => setRotation((v) => v + 90)} aria-label="Rotate right">
              <RotateCw className="h-4 w-4" aria-hidden />
            </Button>
            <Button type="button" variant="nav" size="sm" onClick={undo} disabled={cursor <= 0} aria-label="Undo">
              <Undo2 className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="nav"
              size="sm"
              onClick={redo}
              disabled={cursor >= history.length - 1}
              aria-label="Redo"
            >
              <Redo2 className="h-4 w-4" aria-hidden />
            </Button>
            <Button type="button" variant="glass" size="sm" onClick={reset}>
              Reset
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
