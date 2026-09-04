import { Slider } from "@/components/ui/slider";
import { FOCAL_OPTIONS, safePosition } from "@/lib/media";
import { cn } from "@/lib/utils";

function parse(pos: string): { x: number; y: number } {
  const m = pos.match(/(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
  return { x: m ? Number(m[1]) : 50, y: m ? Number(m[2]) : 50 };
}

/**
 * Focal-point picker for hero/cover artwork. Stores a CSS object-position
 * string ("50% 30%") so the same image looks right on every screen size.
 */
export function ImagePositionField({
  value,
  onChange,
  preview,
  label = "Image focal position",
  className,
}: {
  value: string | null | undefined;
  onChange: (position: string) => void;
  preview?: string | null;
  label?: string;
  className?: string;
}) {
  const pos = safePosition(value);
  const { x, y } = parse(pos);

  return (
    <div className={cn("min-w-0", className)}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>

      {preview && (
        <div className="mb-3 overflow-hidden rounded-xl border border-border">
          <img
            src={preview}
            alt="Focal position preview"
            loading="lazy"
            className="h-28 w-full object-cover sm:h-36"
            style={{ objectPosition: pos }}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FOCAL_OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              pos === o.key
                ? "border-lag-blue/50 bg-lag-blue/15 text-lag-blue"
                : "border-border text-muted-foreground hover:bg-surface-2 hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="min-w-0 text-xs text-muted-foreground">
          Horizontal {Math.round(x)}%
          <Slider
            className="mt-2"
            value={[x]}
            min={0}
            max={100}
            step={1}
            onValueChange={(v) => onChange(`${v[0] ?? 50}% ${y}%`)}
            aria-label="Horizontal focal position"
          />
        </label>
        <label className="min-w-0 text-xs text-muted-foreground">
          Vertical {Math.round(y)}%
          <Slider
            className="mt-2"
            value={[y]}
            min={0}
            max={100}
            step={1}
            onValueChange={(v) => onChange(`${x}% ${v[0] ?? 50}%`)}
            aria-label="Vertical focal position"
          />
        </label>
      </div>
    </div>
  );
}
