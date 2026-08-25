import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Gamepad2, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { GameCard } from "@/components/lag/GameCard";
import { EmptyState, SectionHeading } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lowestGamePrice, PLATFORMS } from "@/lib/lag";
import { gamesQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/games/")({
  head: () => ({
    meta: [
      { title: "PS4 & PS5 Games — Rent or Own | LAG LIVE AS GAMERS" },
      {
        name: "description",
        content:
          "Browse the full LAG catalog of PS4 and PS5 games. Rent for 30 or 60 days or buy permanent access, with instant WhatsApp delivery.",
      },
      { property: "og:title", content: "PS4 & PS5 Games — LAG LIVE AS GAMERS" },
      {
        property: "og:description",
        content: "Filter by platform, genre and price, then order your game on WhatsApp in seconds.",
      },
    ],
  }),
  component: GamesPage,
});

const SORTS = [
  { key: "featured", label: "Featured" },
  { key: "new", label: "Newest" },
  { key: "low", label: "Price: low to high" },
  { key: "high", label: "Price: high to low" },
  { key: "az", label: "A → Z" },
] as const;

const TAGS = [
  { key: "all", label: "All" },
  { key: "trending", label: "Trending" },
  { key: "hot_deal", label: "Hot deals" },
  { key: "new_release", label: "New releases" },
] as const;

function GamesPage() {
  const { data: games = [], isLoading, isError, error } = useQuery(gamesQuery());
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState<string>("all");
  const [genre, setGenre] = useState<string>("all");
  const [tag, setTag] = useState<(typeof TAGS)[number]["key"]>("all");
  const [sort, setSort] = useState<(typeof SORTS)[number]["key"]>("featured");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const visible = useMemo(() => games.filter((g) => g.visible), [games]);
  const genres = useMemo(
    () => Array.from(new Set(visible.map((g) => g.genre).filter((g): g is string => Boolean(g)))).sort(),
    [visible],
  );

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const cap = Number(maxPrice);
    let list = visible.filter((g) => {
      if (needle && !`${g.title} ${g.genre ?? ""} ${g.publisher ?? ""}`.toLowerCase().includes(needle))
        return false;
      if (platform !== "all" && g.platform !== platform) return false;
      if (genre !== "all" && g.genre !== genre) return false;
      if (tag === "trending" && !g.trending) return false;
      if (tag === "hot_deal" && !g.hot_deal) return false;
      if (tag === "new_release" && !g.new_release) return false;
      if (maxPrice && Number.isFinite(cap)) {
        const low = lowestGamePrice(g);
        if (low === null || low > cap) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "az") return a.title.localeCompare(b.title);
      if (sort === "new") return (b.created_at ?? "").localeCompare(a.created_at ?? "");
      if (sort === "low" || sort === "high") {
        const pa = lowestGamePrice(a) ?? Number.MAX_SAFE_INTEGER;
        const pb = lowestGamePrice(b) ?? Number.MAX_SAFE_INTEGER;
        return sort === "low" ? pa - pb : pb - pa;
      }
      return Number(b.featured) - Number(a.featured) || a.display_order - b.display_order;
    });
    return list;
  }, [visible, q, platform, genre, tag, maxPrice, sort]);

  const reset = () => {
    setQ("");
    setPlatform("all");
    setGenre("all");
    setTag("all");
    setMaxPrice("");
    setSort("featured");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SectionHeading
        eyebrow="Catalog"
        title="PS4 & PS5 Games"
        subtitle="Rent for 30 or 60 days, or own it permanently. Every order is completed on WhatsApp."
        action={
          <Button variant="glass" size="sm" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Filters
          </Button>
        }
      />

      <div className="glass rounded-3xl p-4 sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search games, genres, publishers…"
            aria-label="Search games"
            className="h-12 pl-10"
          />
        </div>

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
          {TAGS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTag(t.key)}
              aria-pressed={tag === t.key}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
                tag === t.key
                  ? "border-lag-red/50 bg-lag-red/20 text-lag-red"
                  : "border-border bg-muted/40 text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {showFilters && (
          <div className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="f-platform">Platform</Label>
              <select
                id="f-platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="all">All platforms</option>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="f-genre">Genre</Label>
              <select
                id="f-genre"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="all">All genres</option>
                {genres.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="f-price">Max price (₹)</Label>
              <Input
                id="f-price"
                inputMode="numeric"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 500"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="f-sort">Sort by</Label>
              <select
                id="f-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="mt-1.5 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button variant="ghost" size="sm" onClick={reset}>
                Reset filters
              </Button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
        {isLoading ? "Loading games…" : `${results.length} game${results.length === 1 ? "" : "s"} found`}
      </p>

      {isError ? (
        <div className="mt-4">
          <EmptyState icon={Gamepad2} title="Couldn't load games" body={(error as Error).message} />
        </div>
      ) : isLoading ? (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass h-72 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Gamepad2}
            title="No games match your filters"
            body="Try a different platform, genre or price range."
            action={
              <Button variant="hero" onClick={reset}>
                Reset filters
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      )}
    </div>
  );
}
