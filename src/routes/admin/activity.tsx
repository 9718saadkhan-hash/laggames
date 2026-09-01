import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminGate, AdminShell } from "@/components/lag/AdminShell";
import { Badge, EmptyState, SectionHeading } from "@/components/lag/ui-bits";
import { Input } from "@/components/ui/input";
import { activityLogQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/activity")({
  head: () => ({
    meta: [
      { title: "Activity Log — LAG Admin" },
      { name: "description", content: "Audit trail of all admin actions on the LAG store." },
      { property: "og:title", content: "Activity Log — LAG Admin" },
      { property: "og:description", content: "Audit trail of all admin actions." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminActivityPage,
});

const TYPES = ["All", "game", "deal", "upcoming_game", "order", "review", "settings"] as const;

function when(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdminActivityPage() {
  const { data: entries = [], isLoading, isError } = useQuery(activityLogQuery);
  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("All");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (type !== "All" && e.entity_type !== type) return false;
      if (!needle) return true;
      return [e.action, e.entity_label, e.actor_name, e.entity_type]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [entries, q, type]);

  return (
    <AdminGate>
      <AdminShell>
        <SectionHeading
          eyebrow="Audit"
          title="Activity Log"
          subtitle="Every add, edit and delete performed in the admin dashboard."
        />

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search action, item or user…"
            aria-label="Search activity"
            className="sm:max-w-xs"
          />
          <div className="no-scrollbar -mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-1">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                aria-pressed={type === t}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                  type === t
                    ? "border-lag-red/50 bg-lag-red/15 text-lag-red"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {t.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading activity…</p>
        ) : isError ? (
          <p className="text-sm text-lag-red">Failed to load the activity log.</p>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={History}
            title="No activity yet"
            body="Admin actions will appear here as soon as you add or edit content."
          />
        ) : (
          <ul className="grid gap-2">
            {rows.map((e) => (
              <li key={e.id} className="glass rounded-2xl p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-sm font-bold">{e.action}</span>
                  {e.entity_type && (
                    <Badge tone="blue">{e.entity_type.replace("_", " ")}</Badge>
                  )}
                </div>
                {e.entity_label && (
                  <p className="mt-1 text-sm break-words text-muted-foreground">{e.entity_label}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {e.actor_name ?? "System"} · {when(e.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </AdminShell>
    </AdminGate>
  );
}
