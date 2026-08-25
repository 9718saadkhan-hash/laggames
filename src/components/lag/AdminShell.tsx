import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Gamepad2,
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
} from "lucide-react";
import type { ElementType, ReactNode } from "react";

import { useAuth } from "@/lib/auth";
import { GlassIcon } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV: { label: string; to: string; icon: ElementType }[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Games", to: "/admin/games", icon: Gamepad2 },
  { label: "PS Plus", to: "/admin/ps-plus", icon: Crown },
  { label: "OTT", to: "/admin/ott", icon: Clapperboard },
  { label: "Orders", to: "/admin/orders", icon: ShoppingBag },
  { label: "Customers", to: "/admin/customers", icon: Users },
  { label: "Reviews", to: "/admin/reviews", icon: Star },
  { label: "Collabs", to: "/admin/collabs", icon: Video },
  { label: "Homepage", to: "/admin/homepage", icon: Home },
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

export function AdminShell({ children }: { children: ReactNode }) {
  const location = useLocation();

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
