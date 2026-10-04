import logoAsset from "@/assets/lag-logo.jpg.asset.json";

export function HomeInitialLoader({
  progress,
  phase,
  leaving,
}: {
  progress: number;
  phase: string;
  leaving: boolean;
}) {
  const value = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Loading LAG, ${value}%`}
      className={`fixed inset-0 z-[200] grid place-items-center overflow-hidden bg-background transition-all duration-300 ${
        leaving ? "scale-[1.015] opacity-0" : "scale-100 opacity-100"
      }`}
    >
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lag-blue to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-lag-red to-transparent" />

      <div className="relative flex w-full max-w-sm flex-col items-center px-8 text-center">
        <div className="relative">
          <span aria-hidden className="absolute -inset-4 rounded-3xl border border-lag-blue/30 motion-safe:animate-pulse" />
          <img
            src={logoAsset.url}
            alt="LAG LIVE AS GAMERS"
            width={112}
            height={112}
            fetchPriority="high"
            className="relative h-24 w-24 rounded-2xl object-cover ring-1 ring-border sm:h-28 sm:w-28"
          />
        </div>

        <p className="mt-6 font-display text-4xl font-bold sm:text-5xl">
          <span className="text-lag-red">L</span>
          <span className="text-lag-blue">AG</span>
        </p>
        <p className="mt-1 text-[10px] font-bold tracking-[0.32em] text-muted-foreground">LIVE AS GAMERS</p>
        <p className="mt-8 text-sm font-medium text-foreground">Loading your gaming experience...</p>

        <div className="mt-5 w-full" aria-hidden>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-lag-red to-lag-blue transition-[width] duration-200 ease-out"
              style={{ width: `${value}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">{phase}</span>
            <span className="font-display text-foreground">{value}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}