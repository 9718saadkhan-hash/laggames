import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Gamepad2, Monitor, SearchIcon, Tv } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/lag/ui-bits";
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
      <DialogContent className="glass-strong max-h-[86vh] overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border p-4">
          <DialogTitle className="sr-only">Search LAG LIVE AS GAMERS</DialogTitle>
          <div className="flex items-center gap-2">
            <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search games, PS Plus, OTT, genre, year…"
              aria-label="Search"
              className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <FilterRow label="Category" options={CATEGORIES} value={category} onChange={setCategory} />
            <FilterRow label="Platform" options={PLATFORMS} value={platform} onChange={setPlatform} />
            <FilterRow label="Availability" options={DURATIONS} value={duration} onChange={setDuration} />
          </div>
        </DialogHeader>

        <div className="max-h-[52vh] overflow-y-auto p-3">
          {empty ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              No results match your search or filters.
            </p>
          ) : (
            <div className="space-y-4">
              {gameHits.length > 0 && (
                <Group title="Games" icon={Gamepad2}>
                  {gameHits.map((g) => (
                    <Link
                      key={g.id}
                      to="/games/$slug"
                      params={{ slug: g.slug }}
                      onClick={close}
                      className="glass hover-lift flex items-center gap-3 rounded-2xl p-2.5"
                    >
                      {g.cover_url && (
                        <img
                          src={g.cover_url}
                          alt=""
                          loading="lazy"
                          className="h-12 w-20 shrink-0 rounded-xl object-cover"
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{g.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {g.genre} · {formatDate(g.release_date)}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <Badge tone="blue">{g.platform}</Badge>
                        <span className="mt-1 block text-xs font-bold">
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
                      className="glass hover-lift flex items-center justify-between gap-3 rounded-2xl p-3"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">
                          {p.name} · {p.duration}
                        </span>
                        <span className="block text-xs text-muted-foreground">{p.region}</span>
                      </span>
                      <span className="shrink-0 text-sm font-bold">{money(p.price)}</span>
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
                      className="glass hover-lift flex items-center justify-between gap-3 rounded-2xl p-3"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">
                          {o.name} · {o.plan}
                        </span>
                        <span className="block text-xs text-muted-foreground">{o.duration}</span>
                      </span>
                      <span className="shrink-0 text-sm font-bold">{money(o.price)}</span>
                    </Link>
                  ))}
                </Group>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
          <Button asChild variant="glass" className="w-full" onClick={close}>
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
      <h3 className="mb-2 flex items-center gap-2 px-1 text-[11px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
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
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
      <span className="w-20 shrink-0 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          aria-pressed={value === o}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
            value === o
              ? "border-lag-red/50 bg-lag-red/15 text-lag-red"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
