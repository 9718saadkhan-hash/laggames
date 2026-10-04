import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Gamepad2,
  Tag,
  CalendarClock,
  History,
  Crown,
  Clapperboard,
  ShoppingBag,
  Users,
  Star,
  Video,
  Home,
  Settings,
  Loader2,
  ShieldAlert,
  Sparkles,
  Minimize2,
  Eraser,
} from "lucide-react";
import { useEffect, type ElementType, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { useAuth } from "@/lib/auth";
import { cleanupUnusedMedia } from "@/lib/media-cleanup.functions";
import { GlassIcon } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV: { label: string; to: string; icon: ElementType }[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Games", to: "/admin/games", icon: Gamepad2 },
  { label: "Auto-Fill Info", to: "/admin/autofill", icon: Sparkles },
  { label: "Image Compressor", to: "/admin/image-compressor", icon: Minimize2 },
  { label: "Cleaner", to: "/admin/cleaner", icon: Eraser },
  { label: "Deals", to: "/admin/deals", icon: Tag },
  { label: "Upcoming Games", to: "/admin/upcoming-games", icon: CalendarClock },
  { label: "PS Plus", to: "/admin/ps-plus", icon: Crown },
  { label: "OTT", to: "/admin/ott", icon: Clapperboard },
  { label: "Orders", to: "/admin/orders", icon: ShoppingBag },
  { label: "Customers", to: "/admin/customers", icon: Users },
  { label: "Reviews", to: "/admin/reviews", icon: Star },
  { label: "Collabs", to: "/admin/collabs", icon: Video },
  { label: "Homepage", to: "/admin/homepage", icon: Home },
  { label: "Activity Log", to: "/admin/activity", icon: History },
  { label: "Settings", to: "/admin/settings", icon: Settings },
];

export function AdminGate({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-lag-blue" aria-label="Loading" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <div className="glass w-full rounded-3xl p-8">
          <GlassIcon icon={ShieldAlert} tone="red" size="lg" className="mx-auto" />
          <h1 className="mt-5 font-display text-xl font-bold">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You need admin privileges to view this page. Sign in with an admin account to continue.
          </p>
          <Button asChild variant="hero" size="lg" className="mt-6 w-full">
            <Link to="/admin/login">Go to admin login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * After admin changes, delete images that are no longer used anywhere.
 * The scan reads every content row, so it is debounced and throttled to keep
 * saves and deletes fast (at most once every 10 minutes, never on page open).
 */
const CLEANUP_DEBOUNCE_MS = 30_000;
const CLEANUP_MIN_GAP_MS = 10 * 60_000;
let lastCleanupAt = 0;

function useUnusedMediaCleanup() {
  const qc = useQueryClient();
  const runCleanup = useServerFn(cleanupUnusedMedia);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let running = false;
    const schedule = () => {
      clearTimeout(timer);
      const wait = Math.max(CLEANUP_DEBOUNCE_MS, lastCleanupAt + CLEANUP_MIN_GAP_MS - Date.now());
      timer = setTimeout(async () => {
        if (running) return schedule();
        running = true;
        lastCleanupAt = Date.now();
        try {
          await runCleanup();
        } catch (e) {
          console.warn("Unused image cleanup failed", e);
        } finally {
          running = false;
        }
      }, wait);
    };
    const unsub = qc.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "invalidate") schedule();
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [qc, runCleanup]);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  useUnusedMediaCleanup();

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-8 md:grid-cols-[220px_minmax(0,1fr)] md:px-6">
      <aside className="glass no-scrollbar h-max rounded-2xl p-3 md:sticky md:top-24">
        <p className="px-3 pb-2 pt-1 text-[11px] font-bold tracking-[0.24em] text-lag-red">
          LAG ADMIN
        </p>
        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible" aria-label="Admin navigation">
          {NAV.map((item) => {
            const active =
              item.to === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-lag-red/15 text-lag-red"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
