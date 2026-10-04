import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Sparkles, XCircle, Loader2, ImageIcon, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { AdminGate, AdminShell } from "@/components/lag/AdminShell";
import { AdminSearch, useAdminSearch } from "@/components/lag/AdminSearch";
import { Badge, SectionHeading } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

type MediaPresence = {
  id: string;
  has_cover: boolean;
  has_banner: boolean;
  gallery_count: number;
  has_trailer: boolean;
};
import { formatDate, type Game } from "@/lib/lag";
import {
  AUTOFILL_FIELDS,
  autofillGames,
  autofillGameMedia,
  undoGameMediaAutofill,
  MEDIA_AUTOFILL_FIELDS,
  type AutofillField,
  type AutofillResult,
  type MediaAutofillField,
  type MediaAutofillResult,
} from "@/lib/autofill.functions";

export const Route = createFileRoute("/admin/autofill")({
  head: () => ({
    meta: [
      { title: "Auto-Fill Game Info — LAG Admin" },
      {
        name: "description",
        content: "Automatically fill missing game metadata from verified sources for the LAG catalogue.",
      },
      { property: "og:title", content: "Auto-Fill Game Info — LAG Admin" },
      {
        property: "og:description",
        content: "Automatically fill missing game metadata from verified sources for the LAG catalogue.",
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

const MEDIA_LABEL: Record<MediaAutofillField, string> = {
  cover_url: "Cover",
  banner_url: "Banner",
  gallery: "4 Screenshots",
  trailer_url: "YouTube Trailer",
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
  const runMedia = useServerFn(autofillGameMedia);
  const undoMedia = useServerFn(undoGameMediaAutofill);
  // Lightweight list: text fields only, plus media presence flags — photos are never downloaded here.
  const games = useQuery({
    queryKey: ["games", "autofill-light"],
    queryFn: async () => {
      const [rows, media] = await Promise.all([
        supabase
          .from("games")
          .select(
            "id,slug,title,platform,genre,game_size,developer,publisher,rating,release_date,short_description,description,display_order,metadata_status,metadata_note,metadata_source,metadata_updated_at",
          )
          .order("title", { ascending: true }),
        (supabase.rpc as unknown as (n: string) => Promise<{ data: MediaPresence[] | null; error: Error | null }>)(
          "game_media_presence",
        ),
      ]);
      if (rows.error) throw rows.error;
      if (media.error) throw media.error;
      const byId = new Map((media.data ?? []).map((m) => [m.id, m]));
      return (rows.data ?? []).map((g) => {
        const m = byId.get(g.id);
        return {
          ...g,
          cover_url: m?.has_cover ? "x" : null,
          banner_url: m?.has_banner ? "x" : null,
          gallery: Array.from({ length: m?.gallery_count ?? 0 }, () => "x"),
          trailer_url: m?.has_trailer ? "x" : null,
        };
      }) as unknown as MetaGame[];
    },
  });
  const list = games.data ?? [];

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [running, setRunning] = useState(false);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [current, setCurrent] = useState<string | null>(null);
  const [log, setLog] = useState<AutofillResult[]>([]);
  const [mediaLog, setMediaLog] = useState<MediaAutofillResult[]>([]);
  const [mediaFields, setMediaFields] = useState<MediaAutofillField[]>([...MEDIA_AUTOFILL_FIELDS]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [mediaRunning, setMediaRunning] = useState(false);
  const [mediaDone, setMediaDone] = useState(0);
  const [mediaTotal, setMediaTotal] = useState(0);
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

  async function process(ids: string[], retry = false) {
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
          const res = await run({ data: { ids: chunk, retry } });
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
              sizePending: false,
              sources: [],
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

  const mediaIncomplete = useMemo(
    () => list.filter((g) => !g.cover_url || !g.banner_url || (g.gallery ?? []).length < 4 || !g.trailer_url),
    [list],
  );

  async function processMedia(ids: string[], retry = false) {
    if (!ids.length || !mediaFields.length) {
      toast.info("Select at least one game and media type.");
      return;
    }
    cancelRef.current = false;
    setMediaRunning(true);
    setMediaTotal(ids.length);
    setMediaDone(0);
    setMediaLog([]);
    try {
      for (let i = 0; i < ids.length; i += CHUNK) {
        if (cancelRef.current) break;
        const chunk = ids.slice(i, i + CHUNK);
        const results = await runMedia({ data: { ids: chunk, fields: mediaFields, replaceExisting, retry } });
        setMediaLog((previous) => [...results, ...previous]);
        setMediaDone(Math.min(i + chunk.length, ids.length));
        await qc.invalidateQueries({ queryKey: ["games"] });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Media auto-fill failed.");
    } finally {
      setMediaRunning(false);
      await qc.invalidateQueries({ queryKey: ["games"] });
    }
  }

  async function undoMediaResult(result: MediaAutofillResult) {
    if (!result.historyId) return;
    try {
      await undoMedia({ data: { historyIds: [result.historyId] } });
      setMediaLog((previous) => previous.map((item) => item.historyId === result.historyId ? { ...item, historyId: null, note: "Changes restored" } : item));
      await qc.invalidateQueries({ queryKey: ["games"] });
      toast.success(`${result.title} media restored.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Undo failed.");
    }
  }

  return (
    <AdminGate>
      <AdminShell>
        <SectionHeading
          eyebrow="Automation"
          title="Auto-Fill Game Information"
          subtitle="Fills only empty fields from verified game sources. Your existing values are never overwritten."
        />

        <div className="glass mt-6 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <ImageIcon className="mt-0.5 h-5 w-5 text-lag-blue" aria-hidden />
            <div>
              <h2 className="font-display text-lg font-bold">Game Media Auto-Fill</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Adds verified real game media from the confidently matched game version. Existing media stays untouched by default.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MEDIA_AUTOFILL_FIELDS.map((field) => (
              <label key={field} className="flex min-h-11 items-center gap-2 rounded-xl bg-surface-2 px-3 text-sm font-semibold">
                <Checkbox
                  checked={mediaFields.includes(field)}
                  onCheckedChange={(checked) => setMediaFields((current) => checked === true ? [...current, field] : current.filter((item) => item !== field))}
                />
                {MEDIA_LABEL[field]}
              </label>
            ))}
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={replaceExisting} onCheckedChange={(checked) => setReplaceExisting(checked === true)} />
            Replace existing selected media (every replacement can be undone)
          </label>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="blue" disabled={mediaRunning || !mediaIncomplete.length || !mediaFields.length} onClick={() => processMedia(mediaIncomplete.map((game) => game.id))}>
              {mediaRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              Auto-Fill Missing Media ({mediaIncomplete.length})
            </Button>
            <Button variant="outline" disabled={mediaRunning || !selectedIds.length || !mediaFields.length} onClick={() => processMedia(selectedIds, true)}>
              Auto-Fill Selected ({selectedIds.length})
            </Button>
            {mediaRunning ? <Button variant="destructive" onClick={() => (cancelRef.current = true)}>Stop</Button> : null}
          </div>
          {mediaTotal > 0 ? (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted-foreground"><span>{mediaRunning ? "Finding and saving verified media…" : "Finished"}</span><span>{mediaDone} / {mediaTotal}</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-lag-blue transition-all" style={{ width: `${mediaTotal ? Math.round((mediaDone / mediaTotal) * 100) : 0}%` }} /></div>
            </div>
          ) : null}
        </div>

        {mediaLog.length ? (
          <div className="glass mt-6 rounded-2xl p-5">
            <h2 className="font-display text-lg font-bold">Media Results</h2>
            <div className="mt-4 grid gap-3">
              {mediaLog.map((result) => (
                <article key={`${result.id}-${result.historyId ?? result.status}`} className="rounded-xl bg-surface-2 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {result.status === "updated" ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : result.status === "skipped" ? <CheckCircle2 className="h-4 w-4 text-muted-foreground" /> : <AlertTriangle className="h-4 w-4 text-amber-400" />}
                    <span className="font-semibold">{result.title}</span>
                    {result.match ? <Badge tone="blue">{result.match} · {result.confidence}%</Badge> : null}
                    {result.filled.map((field) => <Badge key={field}>{MEDIA_LABEL[field]}</Badge>)}
                    {result.historyId ? <Button size="sm" variant="outline" className="ml-auto" onClick={() => undoMediaResult(result)}><RotateCcw className="h-4 w-4" /> Undo</Button> : null}
                  </div>
                  {result.note ? <p className="mt-2 text-xs text-muted-foreground">{result.note}</p> : null}
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {([result.previews.cover_url, result.previews.banner_url, ...(Array.isArray(result.previews.gallery) ? result.previews.gallery : [])] as unknown[])
                      .filter((value): value is string => typeof value === "string")
                      .map((src, index) => <img key={`${src}-${index}`} src={src} alt={`${result.title} media preview ${index + 1}`} loading="lazy" className="h-24 w-32 shrink-0 rounded-lg border border-border object-contain bg-background" />)}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}

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
              onClick={() => process(needsReview.map((g) => g.id), true)}
            >
              Retry Auto-Fill ({needsReview.length})
            </Button>
            {running ? (
              <Button variant="destructive" onClick={() => (cancelRef.current = true)}>
                Stop
              </Button>
            ) : null}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Safe to stop anytime — running it again only picks up games still missing information.
            Game Size can stay blank as manual entry and does not count as Needs Review.
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
