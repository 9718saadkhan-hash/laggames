import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Minimize2, RotateCcw, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { AdminGate, AdminShell } from "@/components/lag/AdminShell";
import { SectionHeading } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/image-compressor")({
  head: () => ({
    meta: [
      { title: "Image Compressor — LAG Admin" },
      { name: "description", content: "Shrink the file size of website photos without visible quality loss, with undo." },
      { property: "og:title", content: "Image Compressor — LAG Admin" },
      { property: "og:description", content: "Shrink the file size of website photos without visible quality loss, with undo." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CompressorPage,
});

type Section = "Games" | "Upcoming" | "Deals" | "Home Banners" | "PS Plus" | "OTT" | "Reviews" | "Collabs" | "Categories" | "Customers" | "Media" | "Site Content";

type ImgItem = {
  id: string; // unique
  section: Section;
  label: string;
  table: string;
  rowKey: string; // row id or settings key
  keyCol: "id" | "key";
  field: string;
  path: string; // "" | "idx" (array) | json path
  url: string;
};

type Backup = {
  id: string; source_table: string; row_key: string; field: string; path: string;
  original: string; compressed: string; original_bytes: number; compressed_bytes: number; created_at: string;
};

const SOURCES: { section: Section; table: string; label: string; fields: string[]; arrays?: string[] }[] = [
  { section: "Games", table: "games", label: "title", fields: ["cover_url", "banner_url"], arrays: ["gallery"] },
  { section: "Upcoming", table: "upcoming_games", label: "title", fields: ["cover_url", "banner_url"], arrays: ["gallery"] },
  { section: "Deals", table: "deals", label: "title", fields: ["image_url"] },
  { section: "Home Banners", table: "hero_banners", label: "title", fields: ["image_url"] },
  { section: "PS Plus", table: "ps_plus_plans", label: "name", fields: ["image_url"] },
  { section: "OTT", table: "ott_plans", label: "name", fields: ["logo_url"] },
  { section: "Reviews", table: "reviews", label: "name", fields: ["image_url", "avatar_url"] },
  { section: "Collabs", table: "collab_videos", label: "title", fields: ["thumbnail_url"] },
  { section: "Customers", table: "profiles", label: "full_name", fields: ["avatar_url"] },
  { section: "Media", table: "media_library", label: "name", fields: ["url"] },
];

const isImg = (s: unknown): s is string =>
  typeof s === "string" && (s.startsWith("data:image/") || /^https?:\/\/.+\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(s));

const fmt = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(2)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function dataUrlBytes(u: string) {
  const i = u.indexOf(",");
  return Math.round(((u.length - i - 1) * 3) / 4);
}

async function sizeOf(url: string): Promise<number | null> {
  if (url.startsWith("data:")) return dataUrlBytes(url);
  try { const r = await fetch(url); return (await r.blob()).size; } catch { return null; }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("Image could not be loaded"));
    img.src = src;
  });
}

/** Re-encode at the original pixel size (no resize, no stretching). */
async function compress(url: string, quality: number): Promise<string> {
  const img = await loadImage(url);
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext("2d")!.drawImage(img, 0, 0);
  const out = c.toDataURL("image/webp", quality);
  if (!out.startsWith("data:image/webp")) return c.toDataURL("image/jpeg", quality);
  return out;
}

function getAt(obj: any, path: string) {
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}
function setAt(obj: any, path: string, v: unknown) {
  const ks = path.split("."); let o = obj;
  ks.slice(0, -1).forEach((k) => (o = o[k]));
  const leaf = ks.at(-1);
  if (leaf === undefined) return;
  o[leaf] = v;
}
function walkJson(v: any, base: string, out: string[]) {
  if (isImg(v)) out.push(base);
  else if (v && typeof v === "object") for (const k of Object.keys(v)) walkJson(v[k], base ? `${base}.${k}` : k, out);
}

async function writeValue(item: Pick<ImgItem, "table" | "rowKey" | "keyCol" | "field" | "path">, expected: string, next: string) {
  const db = supabase as any;
  const { data, error } = await db.from(item.table).select(item.field).eq(item.keyCol, item.rowKey).single();
  if (error) throw error;
  let value = data[item.field];
  if (item.path === "") {
    if (value !== expected) throw new Error("Photo changed since scan — rescan first");
    value = next;
  } else if (Array.isArray(value) && /^\d+$/.test(item.path)) {
    if (value[+item.path] !== expected) throw new Error("Photo changed since scan — rescan first");
    value = [...value]; value[+item.path] = next;
  } else {
    if (getAt(value, item.path) !== expected) throw new Error("Photo changed since scan — rescan first");
    value = structuredClone(value); setAt(value, item.path, next);
  }
  const { error: e2 } = await db.from(item.table).update({ [item.field]: value }).eq(item.keyCol, item.rowKey);
  if (e2) throw e2;
}

function CompressorPage() {
  const qc = useQueryClient();
  const [items, setItems] = useState<ImgItem[]>([]);
  const [sizes, setSizes] = useState<Record<string, number | null>>({});
  const [backups, setBackups] = useState<Backup[]>([]);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quality, setQuality] = useState(85);
  const [section, setSection] = useState<Section | "All">("All");
  const [q, setQ] = useState("");

  async function scan() {
    setScanning(true);
    try {
      const db = supabase as any;
      const found: ImgItem[] = [];
      for (const s of SOURCES) {
        const cols = ["id", s.label, ...s.fields, ...(s.arrays ?? [])].join(",");
        const { data, error } = await db.from(s.table).select(cols);
        if (error) { toast.error(`${s.section}: ${error.message}`); continue; }
        for (const r of data ?? []) {
          for (const f of s.fields) if (isImg(r[f])) found.push({ id: `${s.table}:${r.id}:${f}`, section: s.section, label: `${r[s.label] ?? "Untitled"} · ${f.replace("_url", "")}`, table: s.table, rowKey: r.id, keyCol: "id", field: f, path: "", url: r[f] });
          for (const a of s.arrays ?? []) (r[a] ?? []).forEach((u: unknown, i: number) => {
            if (isImg(u)) found.push({ id: `${s.table}:${r.id}:${a}:${i}`, section: s.section, label: `${r[s.label] ?? "Untitled"} · ${a} ${i + 1}`, table: s.table, rowKey: r.id, keyCol: "id", field: a, path: String(i), url: u });
          });
        }
      }
      const { data: settings } = await db.from("site_settings").select("key,value");
      for (const setting of settings ?? []) {
        const paths: string[] = []; walkJson(setting.value, "", paths);
        for (const p of paths) {
          const parentPath = p.split(".").slice(0, -1).join(".");
          const parent = parentPath ? getAt(setting.value, parentPath) : setting.value;
          const isCategory = setting.key === "categories";
          found.push({ id: `site_settings:${setting.key}:${p}`, section: isCategory ? "Categories" : "Site Content", label: `${parent?.title ?? parent?.name ?? parent?.label ?? setting.key} · photo`, table: "site_settings", rowKey: setting.key, keyCol: "key", field: "value", path: p, url: getAt(setting.value, p) });
        }
      }
      setItems(found);
      setSelected(new Set());
      const sz: Record<string, number | null> = {};
      await Promise.all(found.map(async (it) => (sz[it.id] = await sizeOf(it.url))));
      setSizes(sz);
      const { data: b } = await db.from("image_compress_backups").select("*").order("created_at", { ascending: false }).limit(200);
      setBackups(b ?? []);
    } finally { setScanning(false); }
  }

  useEffect(() => { void scan(); }, []);

  const visible = useMemo(() => items.filter((i) =>
    (section === "All" || i.section === section) && i.label.toLowerCase().includes(q.toLowerCase()),
  ), [items, section, q]);

  const total = visible.reduce((n, i) => n + (sizes[i.id] ?? 0), 0);

  async function compressOne(it: ImgItem): Promise<"ok" | "skip" | "fail"> {
    try {
      const before = sizes[it.id] ?? (await sizeOf(it.url)) ?? 0;
      const out = await compress(it.url, quality / 100);
      const after = dataUrlBytes(out);
      if (!before || after >= before * 0.95) return "skip";
      await writeValue(it, it.url, out);
      const { data: b } = await (supabase as any).from("image_compress_backups").insert({
        source_table: it.table, row_key: it.rowKey, field: it.field, path: it.path,
        original: it.url, compressed: out, original_bytes: before, compressed_bytes: after,
      }).select().single();
      setItems((xs) => xs.map((x) => (x.id === it.id ? { ...x, url: out } : x)));
      setSizes((s) => ({ ...s, [it.id]: after }));
      if (b) setBackups((bs) => [b, ...bs]);
      return "ok";
    } catch (e) {
      toast.error(`${it.label}: ${(e as Error).message}`);
      return "fail";
    }
  }

  async function runMany(list: ImgItem[]) {
    if (!list.length) return;
    setBusy("bulk"); setProgress({ done: 0, total: list.length });
    let ok = 0, skip = 0, saved = 0;
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (!item) continue;
      const before = sizes[item.id] ?? 0;
      const r = await compressOne(item);
      if (r === "ok") ok++; if (r === "skip") skip++;
      setProgress({ done: i + 1, total: list.length });
      if (r === "ok") saved += before;
    }
    setBusy(null); setProgress(null); setSelected(new Set());
    void qc.invalidateQueries();
    toast.success(`Compressed ${ok} photo(s)${skip ? `, ${skip} already optimized` : ""}.`);
    void saved;
  }

  async function undo(b: Backup) {
    setBusy(b.id);
    try {
      await writeValue({ table: b.source_table, rowKey: b.row_key, keyCol: b.source_table === "site_settings" ? "key" : "id", field: b.field, path: b.path }, b.compressed, b.original);
      await (supabase as any).from("image_compress_backups").delete().eq("id", b.id);
      setBackups((bs) => bs.filter((x) => x.id !== b.id));
      setItems((xs) => xs.map((x) => (x.table === b.source_table && x.rowKey === b.row_key && x.field === b.field && x.path === b.path ? { ...x, url: b.original } : x)));
      const it = items.find((x) => x.table === b.source_table && x.rowKey === b.row_key && x.field === b.field && x.path === b.path);
      if (it) setSizes((s) => ({ ...s, [it.id]: b.original_bytes }));
      void qc.invalidateQueries();
      toast.success("Original photo restored");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  }

  const backupFor = (it: ImgItem) => backups.find((b) => b.source_table === it.table && b.row_key === it.rowKey && b.field === it.field && b.path === it.path && b.compressed === it.url);
  const sections: (Section | "All")[] = ["All", "Games", "Upcoming", "Deals", "Home Banners", "PS Plus", "OTT", "Categories", "Reviews", "Collabs", "Customers", "Media", "Site Content"];

  return (
    <AdminGate>
      <AdminShell>
        <SectionHeading
          eyebrow="Smart Tools"
          title="Image Compressor"
          subtitle="Reduce photo file size (e.g. MB → KB) at the same dimensions with no visible quality loss. Every change can be undone."
        />

        <div className="glass mt-6 space-y-4 rounded-2xl p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-sm"><span className="text-muted-foreground">Photos found:</span> <b>{visible.length}</b> · <span className="text-muted-foreground">Total size:</span> <b>{fmt(total)}</b></div>
            <label className="flex items-center gap-2 text-sm">
              Quality <input type="range" min={70} max={95} value={quality} onChange={(e) => setQuality(+e.target.value)} /> <b>{quality}%</b>
            </label>
            <span className="text-xs text-muted-foreground">85% looks identical to the original; lower = smaller files.</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sections.map((s) => (
              <Button key={s} size="sm" variant={section === s ? "default" : "outline"} onClick={() => setSection(s)}>{s}</Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Search photos…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
            <Button disabled={!!busy || scanning} onClick={() => runMany(visible)}><Minimize2 className="mr-1 h-4 w-4" />Compress all shown</Button>
            <Button variant="outline" disabled={!!busy || !selected.size} onClick={() => runMany(visible.filter((i) => selected.has(i.id)))}>Compress selected ({selected.size})</Button>
            <Button variant="ghost" disabled={scanning || !!busy} onClick={scan}><RefreshCw className="mr-1 h-4 w-4" />Rescan</Button>
          </div>
          {progress && (
            <div className="text-sm">
              <div className="mb-1">Compressing… {progress.done} / {progress.total}</div>
              <div className="h-2 overflow-hidden rounded bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>
            </div>
          )}
        </div>

        {scanning ? (
          <div className="grid place-items-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((it) => {
              const b = backupFor(it);
              return (
                <div key={it.id} className="glass flex gap-3 rounded-2xl p-3">
                  <Checkbox checked={selected.has(it.id)} onCheckedChange={(v) => setSelected((s) => { const n = new Set(s); v ? n.add(it.id) : n.delete(it.id); return n; })} aria-label="Select photo" />
                  <img src={it.url} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-lg bg-muted object-contain" />
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="truncate font-medium">{it.label}</div>
                    <div className="text-xs text-muted-foreground">{it.section}</div>
                    <div className="mt-1 text-xs">
                      {b ? <><s className="text-muted-foreground">{fmt(b.original_bytes)}</s> → <b className="text-primary">{fmt(b.compressed_bytes)}</b> (−{Math.round((1 - b.compressed_bytes / b.original_bytes) * 100)}%)</> : sizes[it.id] != null ? fmt(sizes[it.id]!) : "Size unknown"}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" disabled={!!busy} onClick={async () => { setBusy(it.id); const r = await compressOne(it); setBusy(null); if (r === "skip") toast.info("Already optimized"); else if (r === "ok") { toast.success("Compressed"); void qc.invalidateQueries(); } }}>
                        {busy === it.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Compress"}
                      </Button>
                      {b && <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => undo(b)}><RotateCcw className="mr-1 h-3 w-3" />Undo</Button>}
                    </div>
                  </div>
                </div>
              );
            })}
            {!visible.length && <p className="text-sm text-muted-foreground">No photos found.</p>}
          </div>
        )}
      </AdminShell>
    </AdminGate>
  );
}
