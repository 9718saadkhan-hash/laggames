import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Gamepad2, Monitor, SearchIcon, Tv, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDate, lowestGamePrice, money } from "@/lib/lag";
import { gamesQuery, ottQuery, psPlusQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

const CATEGORIES = ["All", "Games", "PS Plus", "OTT"] as const;
const PLATFORMS = ["All", "PS4", "PS5", "PS4 & PS5"] as const;
const DURATIONS = ["All", "30 Days", "60 Days", "Permanent"] as const;

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>("All");
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>("All");

  const { data: games = [] } = useQuery(gamesQuery());
  const { data: psPlus = [] } = useQuery(psPlusQuery);
  const { data: ott = [] } = useQuery(ottQuery);

  const term = q.trim().toLowerCase();

  const gameHits = useMemo(() => {
    if (category !== "All" && category !== "Games") return [];
    return games
      .filter((g) => {
        const hay = [g.title, g.genre, g.platform, g.developer, g.publisher, g.release_date?.slice(0, 4)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (term && !hay.includes(term)) return false;
        if (platform !== "All" && g.platform !== platform) return false;
        if (duration === "30 Days" && g.price_30 === null) return false;
        if (duration === "60 Days" && g.price_60 === null) return false;
        if (duration === "Permanent" && g.price_permanent === null) return false;
        return true;
      })
      .slice(0, 8);
  }, [games, term, platform, duration, category]);

  const plusHits = useMemo(() => {
    if (category !== "All" && category !== "PS Plus") return [];
    if (duration !== "All") return [];
    return psPlus
      .filter((p) =>
        term
          ? [p.name, p.tier, p.duration, p.region, "ps plus", "subscription"]
              .join(" ")
              .toLowerCase()
              .includes(term)
          : true,
      )
      .slice(0, 5);
  }, [psPlus, term, category, duration]);

  const ottHits = useMemo(() => {
    if (category !== "All" && category !== "OTT") return [];
    if (duration !== "All") return [];
    return ott
      .filter((o) =>
        term
          ? [o.name, o.plan, o.duration, o.quality, "ott", "streaming", "subscription"]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(term)
          : true,
      )
      .slice(0, 5);
  }, [ott, term, category, duration]);

  const empty = gameHits.length + plusHits.length + ottHits.length === 0;

  function close() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-h-[86vh] overflow-hidden rounded-[2rem] p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border p-5 pb-4">
          <DialogTitle className="sr-only">Search LAG LIVE AS GAMERS</DialogTitle>
          <div className="flex items-center gap-3">
            <SearchIcon className="h-5 w-5 shrink-0 text-lag-red" aria-hidden />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search games, PS Plus, OTT…"
              aria-label="Search"
              className="h-auto border-0 border-b border-border bg-transparent px-0 pb-1 font-display text-lg font-medium shadow-none rounded-none focus-visible:ring-0 focus-visible:border-lag-red/60"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Clear search"
                className="shrink-0 rounded-full p-1 text-muted-foreground opacity-60 transition-opacity hover:opacity-100 hover:text-foreground"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-4">
            <FilterRow label="Category" options={CATEGORIES} value={category} onChange={setCategory} />
            <FilterRow label="Platform" options={PLATFORMS} value={platform} onChange={setPlatform} />
            <FilterRow label="Availability" options={DURATIONS} value={duration} onChange={setDuration} />
          </div>
        </DialogHeader>

        <div className="max-h-[52vh] overflow-y-auto p-4">
          {empty ? (
            <p className="px-2 py-10 text-center text-sm text-muted-foreground">
              No results match your search or filters.
            </p>
          ) : (
            <div className="space-y-5">
              {gameHits.length > 0 && (
                <Group title="Games" icon={Gamepad2}>
                  {gameHits.map((g) => (
                    <Link
                      key={g.id}
                      to="/games/$slug"
                      params={{ slug: g.slug }}
                      onClick={close}
                      className="group flex items-center gap-4 rounded-2xl border border-border bg-surface-2/50 p-2.5 transition-all hover:border-lag-red/40 hover:bg-surface-2"
                    >
                      {g.cover_url ? (
                        <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border shadow-lg">
                          <img
                            src={g.cover_url}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </span>
                      ) : (
                        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-border bg-surface shadow-lg">
                          <Gamepad2 className="h-6 w-6 text-muted-foreground" aria-hidden />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="truncate font-display text-sm font-bold">{g.title}</span>
                          <Badge className="shrink-0">{g.platform}</Badge>
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                          {g.genre ? `${g.genre} · ` : ""}
                          {formatDate(g.release_date)}
                        </span>
                        <span className="mt-1 block font-display text-sm font-bold">
                          {money(lowestGamePrice(g))}
                        </span>
                      </span>
                    </Link>
                  ))}
                </Group>
              )}
              {plusHits.length > 0 && (
                <Group title="PS Plus" icon={Monitor}>
                  {plusHits.map((p) => (
                    <Link
                      key={p.id}
                      to="/ps-plus"
                      onClick={close}
                      className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface-2/50 p-3 transition-all hover:border-lag-blue/40 hover:bg-surface-2"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-display text-sm font-bold">
                          {p.name} · {p.duration}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">{p.region}</span>
                      </span>
                      <span className="shrink-0 font-display text-sm font-bold">{money(p.price)}</span>
                    </Link>
                  ))}
                </Group>
              )}
              {ottHits.length > 0 && (
                <Group title="OTT" icon={Tv}>
                  {ottHits.map((o) => (
                    <Link
                      key={o.id}
                      to="/ott"
                      onClick={close}
                      className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface-2/50 p-3 transition-all hover:border-lag-blue/40 hover:bg-surface-2"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-display text-sm font-bold">
                          {o.name} · {o.plan}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">{o.duration}</span>
                      </span>
                      <span className="shrink-0 font-display text-sm font-bold">{money(o.price)}</span>
                    </Link>
                  ))}
                </Group>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-border p-4">
          <Button asChild variant="glass" className="w-full rounded-2xl py-6 font-display text-xs font-bold uppercase tracking-[0.2em] transition-colors hover:border-lag-red/50" onClick={close}>
            <Link to="/games">Browse all games</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Group({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Gamepad2;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 px-1 font-display text-xs font-bold tracking-widest text-foreground/60 uppercase">
        <Icon className="h-4 w-4 text-lag-blue" aria-hidden />
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-lag-blue/30 bg-lag-blue/20 px-1.5 py-0.5 text-[9px] font-bold tracking-tighter text-lag-blue uppercase">
      {children}
    </span>
  );
}

function FilterRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <span className="mb-2 ml-1 block text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            aria-pressed={value === o}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-all",
              value === o
                ? "pill-glow border border-lag-red bg-lag-red text-primary-foreground"
                : "border border-border bg-surface-2/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
