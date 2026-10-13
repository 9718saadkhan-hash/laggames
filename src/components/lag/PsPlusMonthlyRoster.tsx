import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CalendarDays, Crown, Gamepad2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { monthlyPsPlusRosterQuery } from "@/lib/ps-plus-roster-query";
import { currentRosterMonth, rosterGames } from "@/lib/ps-plus-roster";
import { cn } from "@/lib/utils";

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(`${month}-01T00:00:00+05:30`));
}

export function PsPlusMonthlyRoster() {
  const { data, isPending, isFetching, refetch } = useQuery(monthlyPsPlusRosterQuery);
  const [filter, setFilter] = useState<"all" | "extra" | "deluxe">("all");
  const roster = data?.roster;
  const currentMonth = currentRosterMonth(new Date(data?.checkedAt ?? Date.now()));
  const outdated = roster && roster.month < currentMonth;
  const games = roster ? rosterGames(roster, filter) : [];

  return <section aria-labelledby="ps-plus-roster-title" className="mt-10 border-t border-border pt-8">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-lag-blue"><CalendarDays className="h-3.5 w-3.5" aria-hidden /> Game Catalog · Monthly additions</p>
        <h2 id="ps-plus-roster-title" className="font-display text-2xl font-bold">{roster ? monthLabel(roster.month) : "This month on PS Plus"}</h2>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase text-muted-foreground">Sony announcements</span>
        <Button variant="ghost" size="icon" aria-label="Refresh monthly PS Plus games" title="Refresh monthly games" disabled={isFetching} onClick={() => void refetch()}><RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin motion-reduce:animate-none")} aria-hidden /></Button>
      </div>
    </div>

    {outdated && <p role="status" className="mt-4 border-l-2 border-lag-blue bg-lag-blue/10 px-4 py-3 text-xs leading-relaxed">{monthLabel(currentMonth)}’s Extra / Deluxe roster is awaiting Sony’s full announcement. Latest verified lineup below.</p>}
    {data?.stale && roster && <p role="status" className="mt-3 text-xs text-muted-foreground">Sony’s latest update could not be checked. Showing the last verified announcement.</p>}
    {isPending ? <div aria-label="Loading monthly PS Plus games" className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-32 animate-pulse rounded-lg border border-border bg-muted/30 motion-reduce:animate-none" />)}</div> : !roster ? <div className="mt-5 border-y border-border py-8 text-sm text-muted-foreground"><p>Monthly additions are temporarily unavailable.</p><a href="https://blog.playstation.com/category/ps-plus/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-lag-blue underline underline-offset-4">View Sony’s announcements <ArrowUpRight className="h-4 w-4" aria-hidden /></a></div> : <>
      <div aria-label="Monthly game membership filter" className="mt-5 flex flex-wrap gap-2">
        {([['all', 'All additions'], ['extra', 'Extra'], ['deluxe', 'Deluxe']] as const).map(([value, label]) => <Button key={value} variant="outline" size="sm" aria-pressed={filter === value} onClick={() => setFilter(value)} className={cn("rounded-lg", filter === value && "border-lag-blue bg-lag-blue/10 text-lag-blue")}>{label}</Button>)}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{roster.availability ?? "See Sony’s announcement for availability dates."}</p>
      <ul aria-label="Monthly PS Plus game roster" className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game, index) => <li key={game.title} className="relative flex min-h-36 flex-col rounded-lg border border-border bg-muted/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className={cn("flex items-center gap-1.5 text-[10px] font-bold uppercase", game.category === "classics" ? "text-chart-3" : "text-lag-blue")}>{game.category === "classics" ? <Crown className="h-4 w-4" aria-hidden /> : <Gamepad2 className="h-4 w-4" aria-hidden />}{game.category === "classics" ? "Premium / Deluxe*" : "Extra + Deluxe"}</span>
            <span className="font-display text-xs text-muted-foreground/50">{String(index + 1).padStart(2, "0")}</span>
          </div>
          <h3 className="break-words font-display text-base font-bold leading-snug">{game.title}</h3>
          <p className="mt-2 text-[11px] text-muted-foreground">{game.platforms}</p>
          {game.note && <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{game.note}</p>}
        </li>)}
      </ul>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">{games.length} additions · Checked {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(data.checkedAt))}</p>
        <Button asChild variant="link" size="sm" className="px-0 text-lag-blue"><a href={roster.sourceUrl} target="_blank" rel="noopener noreferrer">Sony’s full announcement <ArrowUpRight className="h-4 w-4" aria-hidden /></a></Button>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Included with an active membership, not permanently free. Catalogue availability varies by region and games can leave the service. *Sony announces classics as Premium; Deluxe availability in India is subject to the local PlayStation Store. Streaming-only PS3 titles are excluded.</p>
    </>}
  </section>;
}