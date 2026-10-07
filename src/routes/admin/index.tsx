import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Gamepad2,
  Crown,
  Clapperboard,
  ShoppingBag,
  Users,
  Star,
  Mail,
  Eye,
  Tag,
} from "lucide-react";

import { AdminGate, AdminShell } from "@/components/lag/AdminShell";
import { SectionHeading, GlassIcon } from "@/components/lag/ui-bits";
import {
  gamesQuery,
  psPlusQuery,
  ottQuery,
  ordersQuery,
  reviewsQuery,
  customersQuery,
  contactMessagesQuery,
  dealsQuery,
  activityLogQuery,
} from "@/lib/queries";
import { money, formatDate } from "@/lib/lag";
import { Badge } from "@/components/lag/ui-bits";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard — LAG Admin" },
      { name: "description", content: "Overview of LAG store activity, orders and content." },
      { property: "og:title", content: "Dashboard — LAG Admin" },
      { property: "og:description", content: "Overview of LAG store activity, orders and content." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboardPage,
});

function StatCard({
  icon,
  label,
  value,
  tone = "red",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  tone?: "red" | "blue";
}) {
  return (
    <div className="glass hover-lift rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <GlassIcon icon={icon} tone={tone} size="sm" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="mt-0.5 font-display text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function AdminDashboardPage() {
  const { data: games = [] } = useQuery(gamesQuery({ admin: true }));
  const { data: psPlus = [] } = useQuery(psPlusQuery);
  const { data: ott = [] } = useQuery(ottQuery);
  const { data: orders = [] } = useQuery(ordersQuery());
  const { data: reviews = [] } = useQuery(reviewsQuery());
  const { data: customers = [] } = useQuery(customersQuery);
  const { data: messages = [] } = useQuery(contactMessagesQuery);
  const { data: deals = [] } = useQuery(dealsQuery({ admin: true }));
  const { data: activity = [] } = useQuery(activityLogQuery);

  const visibleGames = games.filter((g) => g.visible).length;
  const pendingReviews = reviews.filter((r) => r.status === "pending").length;
  const liveDeals = deals.filter((d) => d.visible).length;
  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <AdminGate>
      <AdminShell>
        <SectionHeading eyebrow="Overview" title="Admin Dashboard" subtitle="Live snapshot of the LAG store." />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={Gamepad2} label="Total Games" value={games.length} />
          <StatCard icon={Eye} label="Visible Games" value={visibleGames} tone="blue" />
          <StatCard icon={Tag} label="Live Deals" value={liveDeals} />
          <StatCard icon={Crown} label="PS Plus Plans" value={psPlus.length} />
          <StatCard icon={Clapperboard} label="OTT Plans" value={ott.length} tone="blue" />
          <StatCard icon={ShoppingBag} label="Total Orders" value={orders.length} />
          <StatCard icon={Star} label="Pending Reviews" value={pendingReviews} tone="blue" />
          <StatCard icon={Users} label="Customers" value={customers.length} />
          <StatCard icon={Mail} label="Contact Messages" value={messages.length} tone="blue" />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <Badge key={status} tone="neutral">
              {status}: {count}
            </Badge>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="glass rounded-2xl p-5">
            <h3 className="font-display text-lg font-bold">Recent Orders</h3>
            <div className="mt-4 divide-y divide-border">
              {orders.slice(0, 8).map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{o.product_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {o.customer_name ?? "Unknown"} · {formatDate(o.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold text-lag-blue">{money(o.price)}</span>
                    <Badge tone="red">{o.status}</Badge>
                  </div>
                </div>
              ))}
              {orders.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">No orders yet.</p>
              )}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="glass rounded-2xl p-5">
              <h3 className="font-display text-lg font-bold">Quick Links</h3>
              <div className="mt-4 flex flex-col gap-2 text-sm">
                <Link className="rounded-xl px-3 py-2 font-semibold hover:bg-surface-2" to="/admin/games">
                  Manage Games
                </Link>
                <Link className="rounded-xl px-3 py-2 font-semibold hover:bg-surface-2" to="/admin/deals">
                  Manage Deals
                </Link>
                <Link className="rounded-xl px-3 py-2 font-semibold hover:bg-surface-2" to="/admin/orders">
                  View Orders
                </Link>
                <Link className="rounded-xl px-3 py-2 font-semibold hover:bg-surface-2" to="/admin/reviews">
                  Moderate Reviews
                </Link>
                <Link className="rounded-xl px-3 py-2 font-semibold hover:bg-surface-2" to="/admin/homepage">
                  Edit Homepage
                </Link>
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-lg font-bold">Recent Activity</h3>
                <Link className="text-xs font-semibold text-lag-blue" to="/admin/activity">
                  View all
                </Link>
              </div>
              <ul className="mt-4 space-y-3 text-sm">
                {activity.slice(0, 6).map((a) => (
                  <li key={a.id} className="min-w-0">
                    <p className="truncate font-semibold">{a.action}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.entity_label ?? a.entity_type ?? "—"} · {formatDate(a.created_at)}
                    </p>
                  </li>
                ))}
                {activity.length === 0 && (
                  <li className="text-sm text-muted-foreground">No activity logged yet.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </AdminShell>
    </AdminGate>
  );
}
