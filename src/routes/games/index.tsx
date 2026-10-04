import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Gamepad2, LoaderCircle, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { GameCard, GameCardsWishlistProvider } from "@/components/lag/GameCard";
import { EmptyState, SectionHeading } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { compareGameOrder, lowestGamePrice, PLATFORMS } from "@/lib/lag";
import { gameCoversQuery, gamesCatalogQuery } from "@/lib/queries";
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

const PAGE_SIZE = 12;

function GamesPage() {
  const { data: games = [], isLoading, isError, error } = useQuery(gamesCatalogQuery());
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState<string>("all");
  const [genre, setGenre] = useState<string>("all");
  const [tag, setTag] = useState<(typeof TAGS)[number]["key"]>("all");
  const [sort, setSort] = useState<(typeof SORTS)[number]["key"]>("featured");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [readyPageKey, setReadyPageKey] = useState("");
  const gridTopRef = useRef<HTMLDivElement>(null);
  const preloadRunRef = useRef(0);

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
      return Number(b.featured) - Number(a.featured) || compareGameOrder(a, b);
    });
    return list;
  }, [visible, q, platform, genre, tag, maxPrice, sort]);

  useEffect(() => {
    setPage(1);
  }, [q, platform, genre, tag, maxPrice, sort]);

  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageGames = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pageIds = useMemo(() => pageGames.map((g) => g.id), [pageGames.map((g) => g.id).join(",")]);
  const covers = useQuery(gameCoversQuery(pageIds));
  const renderedResults = useMemo(
    () => (covers.data ? pageGames.map((g) => ({ ...g, cover_url: covers.data[g.id] ?? null })) : []),
    [covers.data, pageIds],
  );
  const pageKey = `${currentPage}:${renderedResults.map((game) => `${game.id}:${game.cover_url ?? ""}`).join("|")}`;
  const pageIsReady = readyPageKey === pageKey && renderedResults.length > 0;

  useEffect(() => {
    if (isLoading || !renderedResults.length) return;
    const run = ++preloadRunRef.current;
    let cancelled = false;
    const covers = Array.from(
      new Set(renderedResults.map((game) => game.cover_url).filter((url): url is string => Boolean(url))),
    );

    const preload = (src: string) =>
      new Promise<void>((resolve) => {
        const image = new Image();
        const finish = () => resolve();
        image.onload = finish;
        image.onerror = finish;
        image.src = src;
        if (image.complete) finish();
      });

    void Promise.all(covers.map(preload)).then(() => {
      if (!cancelled && run === preloadRunRef.current) setReadyPageKey(pageKey);
    });

    return () => {
      cancelled = true;
    };
  }, [isLoading, pageKey]);

  const goToPage = (next: number) => {
    setReadyPageKey("");
    setPage(Math.min(Math.max(1, next), pageCount));
    gridTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
      ) : !pageIsReady ? (
        <div
          ref={gridTopRef}
          className="mt-4 flex min-h-[30rem] scroll-mt-24 flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-surface-2/40"
          role="status"
          aria-live="polite"
        >
          <LoaderCircle className="h-9 w-9 animate-spin text-lag-red" aria-hidden />
          <div className="text-center">
            <p className="font-display text-lg font-bold">Loading Games</p>
            <p className="mt-1 text-sm text-muted-foreground">Preparing page {currentPage} of {pageCount}…</p>
          </div>
        </div>
      ) : (
        <GameCardsWishlistProvider>
          <div ref={gridTopRef} className="mt-4 grid scroll-mt-24 grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {renderedResults.map((g) => (
              <GameCard key={g.id} game={g} priority />
            ))}
          </div>
          {pageCount > 1 ? (
            <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Games pages">
              <Button variant="glass" size="sm" disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}>
                Previous
              </Button>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => goToPage(n)}
                  aria-current={n === currentPage ? "page" : undefined}
                  className={cn(
                    "h-9 min-w-9 rounded-full border px-3 text-sm font-semibold transition-colors",
                    n === currentPage
                      ? "border-lag-red/50 bg-lag-red/20 text-lag-red"
                      : "border-border bg-muted/40 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {n}
                </button>
              ))}
              <Button
                variant="glass"
                size="sm"
                disabled={currentPage === pageCount}
                onClick={() => goToPage(currentPage + 1)}
              >
                Next
              </Button>
            </nav>
          ) : null}
        </GameCardsWishlistProvider>
      )}
    </div>
  );
}
