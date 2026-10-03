import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Copy, Database, Gauge, HardDrive, ImageOff, Loader2, RefreshCw, Sparkles, Trash2, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminGate, AdminShell } from "@/components/lag/AdminShell";
import { SectionHeading } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { cleanupUnusedMedia, scanWebsiteMedia } from "@/lib/media-cleanup.functions";

export const Route = createFileRoute("/admin/cleaner")({
  head: () => ({
    meta: [
      { title: "Website Cleaner — LAG Admin" },
      { name: "description", content: "Find unused and duplicate images and clear cache to keep the website fast." },
      { property: "og:title", content: "Website Cleaner — LAG Admin" },
      { property: "og:description", content: "Track duplicate and unused images and reduce lag." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CleanerPage,
});

type Scan = Awaited<ReturnType<typeof scanWebsiteMedia>>;

function fmt(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

const TABLE_LABEL: Record<string, string> = {
  games: "Games",
  upcoming_games: "Upcoming Games",
  deals: "Deals",
  hero_banners: "Homepage Banners",
  ps_plus_plans: "PS Plus",
  ott_plans: "OTT",
  reviews: "Reviews",
  collab_videos: "Collabs",
  profiles: "Customers",
  site_settings: "Homepage / Categories",
  game_editions: "Game Editions",
};

function Stat({ icon: Icon, label, value, hint, tone }: { icon: typeof Database; label: string; value: string; hint?: string; tone?: "red" | "blue" }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Icon className={tone === "red" ? "h-4 w-4 text-lag-red" : "h-4 w-4 text-lag-blue"} aria-hidden />
        {label}
      </div>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function measureFps(): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0;
    const start = performance.now();
    const tick = (t: number) => {
      frames++;
      if (t - start < 1000) requestAnimationFrame(tick);
      else resolve(Math.round((frames * 1000) / (t - start)));
    };
    requestAnimationFrame(tick);
  });
}

function CleanerPage() {
  const qc = useQueryClient();
  const scanFn = useServerFn(scanWebsiteMedia);
  const cleanFn = useServerFn(cleanupUnusedMedia);
  const [scan, setScan] = useState<Scan | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [fps, setFps] = useState<number | null>(null);
  const [device, setDevice] = useState<{ memory?: number; cores?: number; network?: string; cacheBytes?: number }>({});

  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      setScan(await scanFn());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scan failed.");
    } finally {
      setScanning(false);
    }
  }, [scanFn]);

  useEffect(() => {
    void runScan();
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { effectiveType?: string } };
    void (async () => {
      let cacheBytes: number | undefined;
      try {
        cacheBytes = (await navigator.storage?.estimate?.())?.usage;
      } catch {
        /* not supported */
      }
      setDevice({ memory: nav.deviceMemory, cores: nav.hardwareConcurrency, network: nav.connection?.effectiveType, cacheBytes });
    })();
  }, [runScan]);

  async function cleanNow() {
    setCleaning(true);
    try {
      const r = await cleanFn();
      toast.success(`Removed ${r.libraryRemoved + r.filesRemoved} unused images (${fmt(r.bytesFreed)} freed).`);
      await runScan();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cleanup failed.");
    } finally {
      setCleaning(false);
    }
  }

  async function clearDeviceCache() {
    try {
      if ("caches" in window) for (const k of await caches.keys()) await caches.delete(k);
      if ("serviceWorker" in navigator)
        for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
      sessionStorage.clear();
      qc.clear();
      toast.success("Cache cleared. Reloading with fresh data…");
      setTimeout(() => window.location.reload(), 700);
    } catch {
      toast.error("Could not clear cache on this browser.");
    }
  }

  function refreshData() {
    void qc.invalidateQueries();
    toast.success("All website data refreshed.");
  }

  const junkCount = scan ? scan.unusedLibrary.count + scan.duplicateLibrary.count + scan.unusedFiles.count : 0;
  const junkBytes = scan ? scan.unusedLibrary.bytes + scan.duplicateLibrary.bytes + scan.unusedFiles.bytes : 0;

  return (
    <AdminGate>
      <AdminShell>
        <SectionHeading
          eyebrow="Performance"
          title="Website Cleaner"
          subtitle="Track duplicate and unused images, heavy photos and cache — and clean them to reduce lag."
          action={
            <Button variant="glass" onClick={() => void runScan()} disabled={scanning}>
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Scan again
            </Button>
          }
        />

        {!scan ? (
          <div className="glass grid place-items-center rounded-2xl p-12 text-sm text-muted-foreground">
            <Loader2 className="mb-3 h-6 w-6 animate-spin text-lag-blue" /> Scanning the whole website…
          </div>
        ) : (
          <div className="space-y-6">
            <div className="glass-strong flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold tracking-[0.2em] text-lag-red">JUNK FOUND</p>
                <p className="mt-1 font-display text-3xl font-bold">
                  {junkCount} images · {fmt(junkBytes)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Unused, replaced and duplicate copies. Images shown on the website are never touched.
                </p>
              </div>
              <Button variant="hero" size="lg" onClick={() => void cleanNow()} disabled={cleaning || junkCount === 0}>
                {cleaning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {junkCount === 0 ? "All clean" : "Clean now"}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat icon={Sparkles} label="Images in use" value={String(scan.totals.imagesInUse)} />
              <Stat icon={HardDrive} label="Stored files" value={String(scan.totals.storageFiles)} hint={fmt(scan.totals.storageBytes)} />
              <Stat icon={ImageOff} label="Unused files" value={String(scan.unusedFiles.count + scan.unusedLibrary.count)} hint={fmt(scan.unusedFiles.bytes + scan.unusedLibrary.bytes)} tone="red" />
              <Stat icon={Copy} label="Duplicate copies" value={String(scan.duplicateLibrary.count + scan.duplicates.length)} hint="same image saved/used twice" tone="red" />
              <Stat icon={Database} label="Heavy embedded photos" value={String(scan.totals.embeddedCount)} hint={fmt(scan.totals.embeddedBytes)} tone="red" />
              <Stat icon={Gauge} label="Screen smoothness" value={fps ? `${fps} FPS` : "—"} hint={fps ? (fps >= 100 ? "120 Hz smooth" : fps >= 55 ? "60 Hz smooth" : "Laggy device") : "Run test below"} />
              <Stat icon={Activity} label="Device" value={device.memory ? `${device.memory} GB RAM` : `${device.cores ?? "?"} cores`} hint={device.network ? `Network: ${device.network.toUpperCase()}` : undefined} />
              <Stat icon={HardDrive} label="Browser cache" value={device.cacheBytes != null ? fmt(device.cacheBytes) : "—"} hint="on this device" />
            </div>

            <div className="glass rounded-2xl p-5">
              <h2 className="font-display text-lg font-bold">Quick fixes</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Button variant="glass" onClick={() => void clearDeviceCache()}>
                  <Trash2 className="h-4 w-4" /> Clear website cache
                </Button>
                <Button variant="glass" onClick={refreshData}>
                  <RefreshCw className="h-4 w-4" /> Refresh all data
                </Button>
                <Button variant="glass" onClick={() => void measureFps().then(setFps)}>
                  <Gauge className="h-4 w-4" /> Test smoothness
                </Button>
                <Button asChild variant="glass">
                  <Link to="/admin/image-compressor">
                    <Zap className="h-4 w-4" /> Compress heavy photos
                  </Link>
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Unused images are also removed automatically a few seconds after any change in the admin panel.
              </p>
            </div>

            <div className="glass rounded-2xl p-5">
              <h2 className="font-display text-lg font-bold">Duplicate images</h2>
              <p className="text-xs text-muted-foreground">The same picture used in more than one place.</p>
              {scan.duplicates.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No duplicates found.</p>
              ) : (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {scan.duplicates.map((d, i) => (
                    <li key={i} className="flex gap-3 rounded-xl border border-border/60 p-3">
                      {d.preview.length < 120_000 ? (
                        <img src={d.preview} alt="" loading="lazy" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="grid h-16 w-24 shrink-0 place-items-center rounded-lg bg-surface-2 text-[10px] text-muted-foreground">Large</div>
                      )}
                      <div className="min-w-0 text-xs">
                        <p className="font-semibold">Used {d.uses.length}×{d.bytes ? ` · ${fmt(d.bytes)} each` : ""}</p>
                        {d.uses.slice(0, 4).map((u, j) => (
                          <p key={j} className="truncate text-muted-foreground">
                            {TABLE_LABEL[u.table] ?? u.table} — {u.label} ({u.field})
                          </p>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="glass rounded-2xl p-5">
              <h2 className="font-display text-lg font-bold">Heaviest photos</h2>
              <p className="text-xs text-muted-foreground">These slow the website most. Compress them with the Image Compressor.</p>
              {scan.heaviestEmbedded.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No heavy photos.</p>
              ) : (
                <ul className="mt-4 divide-y divide-border/60 text-sm">
                  {scan.heaviestEmbedded.map((e, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 truncate">
                        <span className="text-muted-foreground">{TABLE_LABEL[e.table] ?? e.table} · </span>
                        {e.label} <span className="text-xs text-muted-foreground">({e.field})</span>
                      </span>
                      <span className={e.bytes > 150_000 ? "shrink-0 font-semibold text-lag-red" : "shrink-0 text-muted-foreground"}>{fmt(e.bytes)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {scan.unusedFiles.paths.length > 0 && (
              <div className="glass rounded-2xl p-5">
                <h2 className="font-display text-lg font-bold">Unused stored files</h2>
                <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                  {scan.unusedFiles.paths.map((p) => (
                    <li key={p} className="truncate">{p}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-muted-foreground">Last scan: {new Date(scan.scannedAt).toLocaleString("en-IN")}</p>
          </div>
        )}
      </AdminShell>
    </AdminGate>
  );
}
