import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Users, ShieldAlert } from "lucide-react";

import { AdminGate, AdminShell } from "@/components/lag/AdminShell";
import { SectionHeading, EmptyState, Badge, GlassIcon } from "@/components/lag/ui-bits";
import { customersQuery, ordersQuery } from "@/lib/queries";
import { money, formatDate } from "@/lib/lag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/customers")({
  head: () => ({
    meta: [
      { title: "Manage Customers — LAG Admin" },
      { name: "description", content: "View registered LAG customers and their order history." },
      { property: "og:title", content: "Manage Customers — LAG Admin" },
      { property: "og:description", content: "View registered LAG customers and their order history." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminCustomersPage,
});

function AdminCustomersPage() {
  const { data: allCustomers = [], isLoading, isError } = useQuery(customersQuery);
  const { data: orders = [] } = useQuery(ordersQuery());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const customers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allCustomers;
    return allCustomers.filter((c) => {
      const row = c as Record<string, unknown>;
      const fields = [row["full_name"], row["username"], row["email"], row["phone"]];
      return fields.some((v) => typeof v === "string" && v.toLowerCase().includes(q));
    });
  }, [allCustomers, search]);

  const orderCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      if (!o.user_id) continue;
      map.set(o.user_id, (map.get(o.user_id) ?? 0) + 1);
    }
    return map;
  }, [orders]);

  const activeCustomer = allCustomers.find((c) => c.id === activeId) ?? null;
  const activeOrders = useMemo(
    () => (activeId ? orders.filter((o) => o.user_id === activeId) : []),
    [orders, activeId],
  );

  return (
    <AdminGate>
      <AdminShell>
        <SectionHeading
          eyebrow="People"
          title="Manage Customers"
          subtitle="Registered accounts and their order activity."
        />

        <div className="glass mb-5 flex items-start gap-3 rounded-2xl p-4">
          <GlassIcon icon={ShieldAlert} tone="red" size="sm" />
          <p className="text-xs text-muted-foreground">
            Customer contact data is visible to admins only and is never shown on the public site.
          </p>
        </div>

        <div className="mb-5">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, username, email or phone"
            aria-label="Search customers"
          />
        </div>


        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading customers…</p>
        ) : isError ? (
          <p className="text-sm text-lag-red">Failed to load customers.</p>
        ) : customers.length === 0 ? (
          <EmptyState icon={Users} title="No customers yet" body="Registered customers will appear here." />
        ) : (
          <div className="grid gap-3">
            {customers.map((c) => (
              <div key={c.id} className="glass flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-bold">{c["full_name"] ?? "Unnamed customer"}</h3>
                    <Badge tone="blue">{orderCounts.get(c["id"]) ?? 0} orders</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c["email"] ?? "No email"} · {c["phone"] ?? "No phone"} · Joined {formatDate(c["created_at"])}
                  </p>
                </div>
                <Button variant="glass" size="sm" onClick={() => setActiveId(c["id"])}>
                  View Orders
                </Button>
              </div>
            ))}
          </div>
        )}

        <Dialog open={Boolean(activeId)} onOpenChange={(v) => !v && setActiveId(null)}>
          <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{activeCustomer?.["full_name"] ?? "Customer"} — Orders</DialogTitle>
            </DialogHeader>
            {activeOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders for this customer yet.</p>
            ) : (
              <div className="grid gap-2">
                {activeOrders.map((o) => (
                  <div key={o.id} className="rounded-xl bg-surface-2 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{o.order_code}</span>
                      <Badge tone="neutral">{o.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {o.product_name} · {money(o.price)} · {formatDate(o.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </AdminShell>
    </AdminGate>
  );
}
