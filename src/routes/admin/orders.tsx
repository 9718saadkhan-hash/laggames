import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AdminGate, AdminShell } from "@/components/lag/AdminShell";
import { SectionHeading, EmptyState, Badge } from "@/components/lag/ui-bits";
import { supabase } from "@/integrations/supabase/client";
import { ordersQuery } from "@/lib/queries";
import { money, formatDate, ORDER_STATUSES, type OrderRow } from "@/lib/lag";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle as ADTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({
    meta: [
      { title: "Manage Orders — LAG Admin" },
      { name: "description", content: "View and manage all customer orders on LAG." },
      { property: "og:title", content: "Manage Orders — LAG Admin" },
      { property: "og:description", content: "View and manage all customer orders on LAG." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminOrdersPage,
});

function statusTone(status: string): "red" | "blue" | "neutral" {
  if (status === "Completed" || status === "Paid") return "blue";
  if (status === "Cancelled") return "red";
  return "neutral";
}

function AdminOrdersPage() {
  const { data: orders = [], isLoading, isError } = useQuery(ordersQuery());
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["orders"] });

  const filtered = useMemo(
    () => (filter === "all" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter],
  );

  async function updateStatus(order: OrderRow, status: string) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", order.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Order status updated.");
      invalidate();
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Order deleted.");
      invalidate();
    }
  }

  return (
    <AdminGate>
      <AdminShell>
        <SectionHeading
          eyebrow="Sales"
          title="Manage Orders"
          subtitle="Track and update customer orders across the store."
          action={
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-44" aria-label="Filter by status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading orders…</p>
        ) : isError ? (
          <p className="text-sm text-lag-red">Failed to load orders.</p>
        ) : filtered.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="No orders found" body="Orders will appear here once customers checkout." />
        ) : (
          <div className="grid gap-3">
            {filtered.map((o) => (
              <div key={o.id} className="glass flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-bold">{o.order_code}</h3>
                    <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                    <Badge tone="neutral">{o.product_type}</Badge>
                  </div>
                  <p className="mt-1 text-sm">{o.product_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {o.customer_name ?? "Guest"} · {o.customer_phone ?? "—"} · {formatDate(o.created_at)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {o.platform ?? "—"} · {o.option_type ?? "—"} · {o.duration ?? "—"} · {money(o.price)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Select value={o.status} onValueChange={(v) => updateStatus(o, v)}>
                    <SelectTrigger className="w-40" aria-label={`Change status for ${o.order_code}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="glass" size="sm" aria-label={`Delete order ${o.order_code}`}>
                        <Trash2 className="h-4 w-4 text-lag-red" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <ADTitle>Delete order {o.order_code}?</ADTitle>
                        <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(o.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminShell>
    </AdminGate>
  );
}
