import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Gamepad2, LoaderCircle, Monitor, SearchIcon, SlidersHorizontal, Tv, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDate, lowestGamePrice, money } from "@/lib/lag";
import { gameCoversQuery, gamesCatalogQuery, ottQuery, psPlusQuery } from "@/lib/queries";
import { buildGameSearchIndex, matchesGamePlatform, normalizeSearch, searchGames } from "@/lib/game-search";
import { cn } from "@/lib/utils";

const CATEGORIES = ["All", "Games", "PS Plus", "OTT"] as const;
const PLATFORMS = ["All", "PS4", "PS5", "PS4 & PS5"] as const;
const DURATIONS = ["All", "30 Days", "60 Days", "Permanent"] as const;

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>("All");
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>("All");
  const [showFilters, setShowFilters] = useState(false);

  const gamesState = useQuery({ ...gamesCatalogQuery(), enabled: open });
  const plusState = useQuery({ ...psPlusQuery, enabled: open && (category === "All" || category === "PS Plus") });
  const ottState = useQuery({ ...ottQuery, enabled: open && (category === "All" || category === "OTT") });
  const { data: games = [] } = gamesState;
  const { data: psPlus = [] } = plusState;
  const { data: ott = [] } = ottState;

  const deferredQ = useDeferredValue(q);
  const term = normalizeSearch(deferredQ);
  const index = useMemo(() => buildGameSearchIndex(games), [games]);

  const gameHits = useMemo(() => {
    if (category !== "All" && category !== "Games") return [];
    return searchGames(index, term)
      .filter((g) => {
        if (!matchesGamePlatform(g.platform, platform)) return false;
        if (duration === "30 Days" && g.price_30 === null && g.price_30_secondary === null) return false;
        if (duration === "60 Days" && g.price_60 === null && g.price_60_secondary === null) return false;
        if (duration === "Permanent" && g.price_permanent === null && g.price_permanent_secondary === null) return false;
        return true;
      })
      .slice(0, 8);
  }, [index, term, platform, duration, category]);
  const hitIds = useMemo(() => gameHits.map((g) => g.id), [gameHits]);
  const { data: covers } = useQuery({ ...gameCoversQuery(hitIds), enabled: open && hitIds.length > 0 });

  const plusHits = useMemo(() => {
    if (category !== "All" && category !== "PS Plus") return [];
    if (duration !== "All") return [];
    return psPlus
      .filter((p) =>
        !p.visible ? false : term
          ? term.split(" ").every((token) => normalizeSearch([p.name, p.tier, p.duration, p.region, "ps plus", "subscription"].join(" ")).includes(token))
          : true,
      )
      .slice(0, 5);
  }, [psPlus, term, category, duration]);

  const ottHits = useMemo(() => {
    if (category !== "All" && category !== "OTT") return [];
    if (duration !== "All") return [];
    return ott
      .filter((o) =>
        !o.visible ? false : term
          ? term.split(" ").every((token) => normalizeSearch([o.name, o.plan, o.duration, o.quality, "ott", "streaming", "subscription"].filter(Boolean).join(" ")).includes(token))
          : true,
      )
      .slice(0, 5);
  }, [ott, term, category, duration]);

  const empty = gameHits.length + plusHits.length + ottHits.length === 0;
  const activeQueries = [
    ...(category === "All" || category === "Games" ? [gamesState] : []),
    ...(duration === "All" && (category === "All" || category === "PS Plus") ? [plusState] : []),
    ...(duration === "All" && (category === "All" || category === "OTT") ? [ottState] : []),
  ];
  const loading = activeQueries.some((query) => query.isPending);
  const failed = activeQueries.some((query) => query.isError);
  const filtersActive = platform !== "All" || duration !== "All";

  function resetFilters() {
    setCategory("All");
    setPlatform("All");
    setDuration("All");
  }

  function close() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[86dvh] flex-col gap-0 overflow-hidden rounded-lg border-border bg-background p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 border-b border-border p-4 text-left">
          <DialogTitle className="sr-only">Search LAG LIVE AS GAMERS</DialogTitle>
          <div className="flex min-w-0 items-center gap-3 pr-7">
            <SearchIcon className="h-5 w-5 shrink-0 text-lag-red" aria-hidden />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search games, PS Plus, OTT…"
              aria-label="Search"
              className="h-11 min-w-0 rounded-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
            />
            {q && (
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => setQ("")}
                aria-label="Clear search"
                className="shrink-0 rounded-full p-1 text-muted-foreground opacity-60 transition-opacity hover:opacity-100 hover:text-foreground"
              >
                <X className="h-5 w-5" aria-hidden />
              </Button>
            )}
          </div>
          <div className="mt-3 space-y-3">
            <FilterRow label="Category" options={CATEGORIES} value={category} onChange={setCategory} />
            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
                <SlidersHorizontal className="h-4 w-4" />Filters{filtersActive ? " · Active" : ""}
              </Button>
              {filtersActive && <Button variant="ghost" size="sm" onClick={resetFilters}>Reset filters</Button>}
            </div>
            {showFilters && <>
              <FilterRow label="Platform" options={PLATFORMS} value={platform} onChange={setPlatform} />
              <FilterRow label="Availability" options={DURATIONS} value={duration} onChange={setDuration} />
            </>}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4" aria-busy={loading || q !== deferredQ}>
          {failed && <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
            <span>Some results couldn’t load.</span>
            <Button variant="glass" size="sm" onClick={() => { for (const query of activeQueries) if (query.isError) void query.refetch(); }}>Retry</Button>
          </div>}
          {empty && loading ? (
            <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Loading results…</div>
          ) : empty && !failed ? (
            <div className="py-8 text-center">
            <p className="px-2 py-10 text-center text-sm text-muted-foreground">
              No results for “{q.trim()}”.
            </p>
            {filtersActive || category !== "All" ? <Button variant="glass" size="sm" onClick={resetFilters}>Search all categories</Button> : null}
            </div>
          ) : !empty ? (
            <div className="space-y-5">
              {gameHits.length > 0 && (
                <Group title="Games" icon={Gamepad2}>
                  {gameHits.map((g) => (
                    <Link
                      key={g.id}
                      to="/games/$slug"
                      params={{ slug: g.slug }}
                      onClick={close}
                      className="group flex items-center gap-3 rounded-md border border-border bg-surface-2/50 p-2.5 transition-colors hover:border-lag-red/40 hover:bg-surface-2"
                    >
                      {covers?.[g.id] ? (
                        <span className="h-16 w-12 shrink-0 overflow-hidden rounded border border-border bg-surface">
                          <img
                            src={covers[g.id] ?? undefined}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-contain"
                          />
                        </span>
                      ) : (
                        <span className="grid h-16 w-12 shrink-0 place-items-center rounded border border-border bg-surface">
                          <Gamepad2 className="h-6 w-6 text-muted-foreground" aria-hidden />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="min-w-0 font-display text-sm font-bold leading-snug">{g.title}</span>
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
                      className="group flex items-center justify-between gap-4 rounded-md border border-border bg-surface-2/50 p-3 transition-colors hover:border-lag-blue/40 hover:bg-surface-2"
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
                      className="group flex items-center justify-between gap-4 rounded-md border border-border bg-surface-2/50 p-3 transition-colors hover:border-lag-blue/40 hover:bg-surface-2"
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
          ) : null}
        </div>

        <div className="shrink-0 border-t border-border p-4">
          <Button asChild variant="glass" className="w-full rounded-md font-display text-xs font-bold uppercase transition-colors hover:border-lag-red/50" onClick={close}>
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

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "rounded border border-lag-blue/30 bg-lag-blue/20 px-1.5 py-0.5 text-[9px] font-bold text-lag-blue uppercase",
        className,
      )}
    >
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
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Button
            variant="ghost"
            size="sm"
            key={o}
            type="button"
            onClick={() => onChange(o)}
            aria-pressed={value === o}
            className={cn(
              "h-8 shrink-0 whitespace-nowrap rounded-md px-3 text-xs font-bold transition-colors",
              value === o
                ? "border border-lag-red bg-lag-red text-primary-foreground hover:bg-lag-red/90 hover:text-primary-foreground"
                : "border border-border bg-surface-2/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {o}
          </Button>
        ))}
      </div>
    </div>
  );
}
