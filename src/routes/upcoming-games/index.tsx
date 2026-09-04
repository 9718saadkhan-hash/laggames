import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, MessageCircle, Play, Rocket } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge, EmptyState, SectionHeading } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/lib/lag";
import { contactFrom, settingsQuery, upcomingGamesQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/upcoming-games/")({
  head: () => ({
    meta: [
      { title: "Upcoming PlayStation Games — LAG LIVE AS GAMERS" },
      {
        name: "description",
        content:
          "Upcoming PS4 and PS5 games with release dates, genres and trailers. Pre-plan your next game with LAG LIVE AS GAMERS.",
      },
      { property: "og:title", content: "Upcoming PlayStation Games — LAG" },
      {
        property: "og:description",
        content: "See what's coming next on PS4 and PS5, with clear release dates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UpcomingGamesPage,
});

const PLATFORMS = ["All", "PS5", "PS4", "PS4 & PS5"] as const;
const SORTS = [
  { key: "release", label: "Release Date" },
  { key: "az", label: "A–Z" },
  { key: "new", label: "Newest Added" },
] as const;

function bigDate(value: string | null) {
  if (!value) return "TBA";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}

function UpcomingGamesPage() {
  const { data: items = [], isLoading } = useQuery(upcomingGamesQuery());
  const { data: settings } = useQuery(settingsQuery);
  const contact = contactFrom(settings);
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>("All");
  const [sort, setSort] = useState<(typeof SORTS)[number]["key"]>("release");

  const list = useMemo(() => {
    const visible = items.filter((g) => g.visible);
    const filtered =
      platform === "All" ? visible : visible.filter((g) => (g.platform ?? "").includes(platform));
    const sorted = [...filtered];
    if (sort === "az") sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "new")
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else
      sorted.sort(
        (a, b) =>
          new Date(a.release_date ?? "2999-12-31").getTime() -
          new Date(b.release_date ?? "2999-12-31").getTime(),
      );
    return sorted;
  }, [items, platform, sort]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <SectionHeading
        eyebrow="Coming soon"
        title="UPCOMING GAMES"
        subtitle="Upcoming PlayStation titles with confirmed and expected release dates."
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar -mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-1">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              aria-pressed={platform === p}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
                platform === p
                  ? "border-lag-red/50 bg-lag-red/15 text-lag-red"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm">
          <span className="text-muted-foreground">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="glass rounded-xl px-3 py-2 text-sm font-semibold"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key} className="bg-surface text-foreground">
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass h-80 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="No upcoming games listed"
          body="We add new PlayStation releases as soon as dates are announced."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((g) => (
            <article key={g.id} className="glass hover-lift flex flex-col overflow-hidden rounded-3xl">
              <div className="relative aspect-16/10 w-full">
                {g.cover_url ? (
                  <img
                    src={g.cover_url}
                    alt={`${g.title} artwork`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div aria-hidden className="h-full w-full bg-surface-2" />
                )}
                <div aria-hidden className="overlay-fade absolute inset-0" />
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <Badge tone="red">Coming Soon</Badge>
                  <Badge tone="blue">{g.platform}</Badge>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-4">
                <h2 className="min-w-0 font-display text-base font-bold">{g.title}</h2>
                {g.genre && <p className="mt-1 text-xs text-muted-foreground">{g.genre}</p>}
                {g.short_description && (
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                    {g.short_description}
                  </p>
                )}

                <div className="glass mt-4 rounded-2xl p-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.24em] text-lag-blue">
                    <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    RELEASE DATE
                  </p>
                  <p className="mt-1 font-display text-xl font-bold break-words">
                    {bigDate(g.release_date)}
                  </p>
                  {g.release_note && (
                    <p className="mt-1 text-xs text-muted-foreground">{g.release_note}</p>
                  )}
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {g.trailer_url ? (
                    <Button asChild variant="glass" size="sm">
                      <a href={g.trailer_url} target="_blank" rel="noreferrer noopener">
                        <Play className="h-4 w-4" aria-hidden />
                        Trailer
                      </a>
                    </Button>
                  ) : (
                    <span aria-hidden />
                  )}
                  <Button asChild variant="whatsapp" size="sm">
                    <a
                      href={whatsappLink(
                        contact.whatsapp,
                        `Hi ${contact.brand} 👋\n\nI want to know more about the upcoming game: ${g.title} (${g.platform}).\n\nPlease share pre-order / availability details.`,
                      )}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden />
                      Ask on WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
