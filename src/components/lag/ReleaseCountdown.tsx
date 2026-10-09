import { useSyncExternalStore } from "react";
import { Timer } from "lucide-react";
import { releaseCountdown } from "@/lib/release-countdown";

// Every visible countdown shares one clock, regardless of card count.
const listeners = new Set<() => void>();
let clock: ReturnType<typeof setInterval> | undefined;
let now: number | null = null;
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!clock) {
    now = Date.now();
    clock = setInterval(() => {
      now = Date.now();
      listeners.forEach((notify) => notify());
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      clearInterval(clock);
      clock = undefined;
      now = null;
    }
  };
}
const snapshot = () => now;
const serverSnapshot = () => null;

export function ReleaseCountdown({ releaseDate, compact = false }: { releaseDate: string | null; compact?: boolean }) {
  const time = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const remaining = releaseCountdown(releaseDate, time ?? 0);
  const message = !remaining ? "Release date TBA" : time === null ? "Release countdown" : remaining.reached ? "Release date reached" : null;
  if (compact) {
    return (
      <div className="mt-2 flex min-h-5 items-center gap-1.5 text-[11px] font-semibold text-muted-foreground" aria-label="Release countdown">
        <Timer className="h-3.5 w-3.5 shrink-0 text-lag-blue" aria-hidden />
        <span className="tabular-nums">{message ?? `${remaining?.days}d ${String(remaining?.hours).padStart(2, "0")}h ${String(remaining?.minutes).padStart(2, "0")}m ${String(remaining?.seconds).padStart(2, "0")}s`}</span>
      </div>
    );
  }
  return (
    <div className="mt-5 border-l-2 border-lag-blue pl-4" aria-label="Release countdown">
      <p className="flex items-center gap-2 text-xs font-bold text-lag-blue"><Timer className="h-4 w-4" aria-hidden />{message ?? "RELEASES IN"}</p>
      <div className="mt-2 grid max-w-sm grid-cols-4 gap-3" role="timer" aria-live="off">
        {[remaining?.days, remaining?.hours, remaining?.minutes, remaining?.seconds].map((value, index) => (
          <div key={index} className="min-w-0">
            <span className="block font-display text-2xl font-bold tabular-nums sm:text-3xl">{message ? "—" : String(value).padStart(2, "0")}</span>
            <span className="text-[10px] font-semibold text-muted-foreground">{["DAYS", "HOURS", "MINUTES", "SECONDS"][index]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}