import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Sparkles, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AdminGate, AdminShell } from "@/components/lag/AdminShell";
import { AdminSearch, useAdminSearch } from "@/components/lag/AdminSearch";
import { Badge, SectionHeading } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { gamesQuery } from "@/lib/queries";
import { formatDate, type Game } from "@/lib/lag";
import {
  AUTOFILL_FIELDS,
  autofillGames,
  type AutofillField,
  type AutofillResult,
} from "@/lib/autofill.functions";

export const Route = createFileRoute("/admin/autofill")({
  head: () => ({
    meta: [
      { title: "Auto-Fill Game Info — LAG Admin" },
      {
        name: "description",
        content: "Automatically fill missing game metadata from IGDB for the LAG catalogue.",
      },
      { property: "og:title", content: "Auto-Fill Game Info — LAG Admin" },
      {
        property: "og:description",
        content: "Automatically fill missing game metadata from IGDB for the LAG catalogue.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AutofillPage,
});

const FIELD_LABEL: Record<AutofillField, string> = {
  genre: "Genre",
  game_size: "Game Size",
  developer: "Developer",
  publisher: "Publisher",
  rating: "Rating",
  release_date: "Release Date",
  short_description: "Short Description",
  description: "Description",
};

type MetaGame = Game & {
  metadata_status?: string | null;
  metadata_note?: string | null;
  metadata_source?: string | null;
  metadata_updated_at?: string | null;
};

const isEmpty = (v: unknown) => v === null || v === undefined || (typeof v === "string" && !v.trim());

function missingFields(g: MetaGame): AutofillField[] {
  return AUTOFILL_FIELDS.filter((f) => isEmpty((g as unknown as Record<string, unknown>)[f]));
}

const CHUNK = 4;

function AutofillPage() {
  const qc = useQueryClient();
  const run = useServerFn(autofillGames);
  const games = useQuery(gamesQuery({ admin: true }));
  const list = (games.data ?? []) as MetaGame[];

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [running, setRunning] = useState(false);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [current, setCurrent] = useState<string | null>(null);
  const [log, setLog] = useState<AutofillResult[]>([]);
  const cancelRef = useRef(false);

  const incomplete = useMemo(
    () => list.filter((g: MetaGame) => missingFields(g).length > 0),
    [list],
  );
  const needsReview = useMemo(
    () => list.filter((g: MetaGame) => g.metadata_status === "needs_review"),
    [list],
  );
  const {
    query,
    setQuery,
    results: visible,
  } = useAdminSearch<MetaGame>(incomplete, (g) => [g.title, g.slug, g.platform, g.genre]);

  const counts = useMemo(() => {
    let updated = 0;
    let review = 0;
    let none = 0;
    for (const r of log) {
      if (r.status === "updated") updated++;
      else if (r.status === "no_data") none++;
      else if (r.status === "needs_review") review++;
    }
    return { updated, review, none };
  }, [log]);

  async function process(ids: string[]) {
    if (!ids.length) {
      toast.info("Nothing to process — every game already has this information.");
      return;
    }
    cancelRef.current = false;
    setRunning(true);
    setTotal(ids.length);
    setDone(0);
    setLog([]);
    const byId = new Map(list.map((g) => [g.id, g.title]));

    try {
      for (let i = 0; i < ids.length; i += CHUNK) {
        if (cancelRef.current) break;
        const chunk = ids.slice(i, i + CHUNK);
        setCurrent(byId.get(chunk[0]!) ?? null);
        try {
          const res = await run({ data: { ids: chunk } });
          setLog((prev) => [...res, ...prev]);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Request failed";
          setLog((prev) => [
            ...chunk.map<AutofillResult>((id) => ({
              id,
              title: byId.get(id) ?? id,
              status: "needs_review",
              filled: [],
              unresolved: [],
              alreadyFilled: [],
              note: message,
              match: null,
              confidence: 0,
            })),
            ...prev,
          ]);
          if (/not configured|sign in to IGDB/i.test(message)) {
            toast.error(message);
            break;
          }
        }
        setDone(Math.min(i + chunk.length, ids.length));
        await qc.invalidateQueries({ queryKey: ["games"] });
      }
    } finally {
      setRunning(false);
      setCurrent(null);
      await qc.invalidateQueries({ queryKey: ["games"] });
    }
  }

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const percent = total ? Math.round((done / total) * 100) : 0;

  return (
    <AdminGate>
      <AdminShell>
        <SectionHeading
          eyebrow="Automation"
          title="Auto-Fill Game Information"
          subtitle="Fills only empty fields from IGDB. Your existing values are never overwritten."
        />

        <div className="glass mt-6 rounded-2xl p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Games in catalogue" value={list.length} />
            <Stat label="Missing information" value={incomplete.length} tone="red" />
            <Stat label="Needs review" value={needsReview.length} tone="blue" />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              variant="hero"
              disabled={running || !incomplete.length}
              onClick={() => process(incomplete.map((g) => g.id))}
            >
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Auto-Fill All Missing Information
            </Button>
            <Button
              variant="blue"
              disabled={running || !selectedIds.length}
              onClick={() => process(selectedIds)}
            >
              Auto-Fill Selected ({selectedIds.length})
            </Button>
            <Button
              variant="outline"
              disabled={running || !needsReview.length}
              onClick={() => process(needsReview.map((g) => g.id))}
            >
              Retry Needs Review ({needsReview.length})
            </Button>
            {running ? (
              <Button variant="destructive" onClick={() => (cancelRef.current = true)}>
                Stop
              </Button>
            ) : null}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Safe to stop anytime — running it again only picks up the games that are still missing
            information. Install sizes are not published by any game database, so Game Size stays
            blank and is flagged for review.
          </p>

          {total > 0 ? (
            <div className="mt-5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">
                  {running ? "Auto-filling game information…" : "Finished"}
                </span>
                <span className="text-muted-foreground">
                  {done} / {total} games processed · {percent}%
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-lag-red transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
              {current ? (
                <p className="mt-2 text-xs text-muted-foreground">Currently processing: {current}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> {counts.updated} updated
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <AlertTriangle className="h-4 w-4" /> {counts.review} needs review
                </span>
                <span className="flex items-center gap-1.5 text-lag-red">
                  <XCircle className="h-4 w-4" /> {counts.none} no reliable data
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {log.length > 0 ? (
          <div className="glass mt-6 rounded-2xl p-5">
            <h2 className="font-display text-lg font-bold">Results</h2>
            <ul className="mt-3 space-y-2">
              {log.map((r) => (
                <li
                  key={`${r.id}-${r.title}`}
                  className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm"
                >
                  {r.status === "updated" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : r.status === "no_data" ? (
                    <XCircle className="h-4 w-4 text-lag-red" />
                  ) : r.status === "skipped" ? (
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  )}
                  <span className="font-semibold">{r.title}</span>
                  {r.filled.length ? (
                    <span className="text-muted-foreground">
                      filled {r.filled.map((f) => FIELD_LABEL[f]).join(", ")}
                    </span>
                  ) : null}
                  {r.match ? <Badge tone="blue">{r.match}</Badge> : null}
                  {r.note ? <span className="text-xs text-muted-foreground">{r.note}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {needsReview.length > 0 ? (
          <div className="glass mt-6 rounded-2xl p-5">
            <h2 className="font-display text-lg font-bold">Needs Review</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Fill these in manually on the Games page. Anything you enter is treated as your own
              data and is never overwritten.
            </p>
            <ul className="mt-3 space-y-2">
              {needsReview.map((g) => (
                <li
                  key={g.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm"
                >
                  <span className="font-semibold">{g.title}</span>
                  <Badge tone="blue">{g.platform}</Badge>
                  {missingFields(g).map((f) => (
                    <Badge key={f}>{FIELD_LABEL[f]}</Badge>
                  ))}
                  {g.metadata_note ? (
                    <span className="text-xs text-muted-foreground">{g.metadata_note}</span>
                  ) : null}
                  {g.metadata_updated_at ? (
                    <span className="text-xs text-muted-foreground">
                      {g.metadata_source ?? "IGDB"} · {formatDate(g.metadata_updated_at.slice(0, 10))}
                    </span>
                  ) : null}
                  <Button asChild size="sm" variant="outline" className="ml-auto">
                    <Link to="/admin/games">Edit</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="glass mt-6 rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold">
              Games with missing information ({incomplete.length})
            </h2>
            <AdminSearch value={query} onChange={setQuery} count={visible.length} />
          </div>
          <ul className="mt-3 space-y-2">
            {visible.map((g: MetaGame) => (
              <li
                key={g.id}
                className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm"
              >
                <Checkbox
                  checked={!!selected[g.id]}
                  onCheckedChange={(v) =>
                    setSelected((prev) => ({ ...prev, [g.id]: v === true }))
                  }
                  aria-label={`Select ${g.title}`}
                />
                <span className="font-semibold">{g.title}</span>
                <Badge tone="blue">{g.platform}</Badge>
                {missingFields(g).map((f) => (
                  <Badge key={f}>{FIELD_LABEL[f]}</Badge>
                ))}
              </li>
            ))}
            {!visible.length ? (
              <li className="py-6 text-center text-sm text-muted-foreground">
                Every game has its information filled in.
              </li>
            ) : null}
          </ul>
        </div>
      </AdminShell>
    </AdminGate>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "red" | "blue";
}) {
  return (
    <div className="rounded-2xl bg-surface-2 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={
          tone === "red"
            ? "mt-1 font-display text-2xl font-bold text-lag-red"
            : tone === "blue"
              ? "mt-1 font-display text-2xl font-bold text-lag-blue"
              : "mt-1 font-display text-2xl font-bold"
        }
      >
        {value}
      </p>
    </div>
  );
}
