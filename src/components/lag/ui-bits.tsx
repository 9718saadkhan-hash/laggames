import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

import logoAsset from "@/assets/lag-logo.jpg.asset.json";
import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link
      to="/"
      aria-label="LAG LIVE AS GAMERS — home"
      className={cn("flex min-w-0 items-center gap-2.5", className)}
    >
      <img
        src={logoAsset.url}
        alt="LAG LIVE AS GAMERS logo"
        width={44}
        height={44}
        className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-border"
      />
      {!compact && (
        <span className="min-w-0 leading-none">
          <span className="block font-display text-lg font-bold tracking-tight">
            <span className="text-lag-red">L</span>
            <span className="text-lag-blue">AG</span>
          </span>
          <span className="block text-[9px] font-semibold tracking-[0.22em] text-muted-foreground">
            LIVE AS GAMERS
          </span>
        </span>
      )}
    </Link>
  );
}

export function GlassIcon({
  icon: Icon,
  tone = "red",
  size = "md",
  className,
}: {
  icon: ElementType;
  tone?: "red" | "blue";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = size === "lg" ? "h-16 w-16" : size === "sm" ? "h-9 w-9" : "h-12 w-12";
  const iconDims = size === "lg" ? "h-7 w-7" : size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-2xl blur-xl opacity-60",
          tone === "red" ? "bg-lag-red/50" : "bg-lag-blue/50",
        )}
      />
      <span
        className={cn(
          "glass relative grid place-items-center rounded-2xl",
          dims,
          tone === "red" ? "text-lag-red" : "text-lag-blue",
        )}
      >
        <Icon className={iconDims} aria-hidden />
      </span>
    </span>
  );
}

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "-40px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      data-visible={visible}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn("reveal", className)}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 grid grid-cols-1 items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 text-[11px] font-bold tracking-[0.24em] text-lag-red">{eyebrow}</p>
        )}
        <h2 className="font-display text-2xl font-bold sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action && (
        <div className="flex flex-wrap items-center gap-2">{action}</div>
      )}
    </div>
  );
}

export function StarRating({
  value,
  onChange,
  size = 16,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-0.5" role={onChange ? "radiogroup" : undefined}>
      {[1, 2, 3, 4, 5].map((i) =>
        onChange ? (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i} star${i > 1 ? "s" : ""}`}
            onClick={() => onChange(i)}
            className="rounded p-0.5 transition-transform hover:scale-110"
          >
            <Star
              style={{ width: size, height: size }}
              className={cn(i <= value ? "fill-lag-red text-lag-red" : "text-muted-foreground")}
            />
          </button>
        ) : (
          <Star
            key={i}
            aria-hidden
            style={{ width: size, height: size }}
            className={cn(i <= Math.round(value) ? "fill-lag-red text-lag-red" : "text-muted-foreground/50")}
          />
        ),
      )}
      {!onChange && <span className="sr-only">{value} out of 5</span>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: ElementType;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="glass flex flex-col items-center rounded-3xl px-6 py-14 text-center">
      <GlassIcon icon={Icon} tone="blue" size="lg" />
      <h3 className="mt-5 font-display text-lg font-bold">{title}</h3>
      {body && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "red" | "blue" | "neutral";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase",
        tone === "red" && "border-lag-red/40 bg-lag-red/15 text-lag-red",
        tone === "blue" && "border-lag-blue/40 bg-lag-blue/15 text-lag-blue",
        tone === "neutral" && "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
