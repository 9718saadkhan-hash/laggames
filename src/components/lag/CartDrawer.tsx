import { useState } from "react";
import { Loader2, MessageCircle, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { buildCartMessage, useCart } from "@/lib/cart";
import { money, whatsappLink } from "@/lib/lag";
import { contactFrom, settingsQuery } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";

export function CartDrawer() {
  const { items, count, total, changeQuantity, removeItem, clear } = useCart();
  const { data: settings } = useQuery(settingsQuery);
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [placing, setPlacing] = useState(false);
  const contact = contactFrom(settings);

  async function checkout() {
    if (items.length === 0) return;
    setPlacing(true);
    const orderCode = `LAG-${Date.now().toString(36).toUpperCase()}`;
    let saved = false;

    if (user) {
      const rows = items.map((item) => ({
        order_code: orderCode,
        user_id: user.id,
        customer_name: profile?.full_name ?? null,
        customer_phone: profile?.phone ?? null,
        product_type: item.productType ?? "Game",
        product_id: item.productId ?? null,
        product_name: item.name,
        option_type: item.option ?? null,
        price: item.price === null ? null : item.price * item.quantity,
        status: "Pending",
        notes: `Quantity: ${item.quantity}`,
      }));
      const { error } = await supabase.from("orders").insert(rows);
      if (error) {
        setPlacing(false);
        toast.error("Could not save your order. Please try again.");
        return;
      }
      saved = true;
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    }

    const url = whatsappLink(contact.whatsapp, buildCartMessage(items, contact.brand, saved ? orderCode : undefined));
    window.open(url, "_blank", "noopener,noreferrer");
    setPlacing(false);
    if (saved) {
      clear();
      toast.success(`Order ${orderCode} placed. Finish the chat on WhatsApp to confirm.`);
    } else {
      toast.success("Opening WhatsApp with your order. Sign in to keep an order history.");
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="nav" size="icon" className="relative h-9 w-9" aria-label={`Cart with ${count} items`}>
          <ShoppingCart className="h-4 w-4" aria-hidden />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-lag-red px-1 text-[10px] font-bold text-primary-foreground">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="glass-strong flex w-[min(92vw,26rem)] flex-col border-border p-5">
        <SheetHeader className="pr-8 text-left">
          <SheetTitle className="font-display text-xl">Your Cart</SheetTitle>
          <SheetDescription>{count ? `${count} item${count === 1 ? "" : "s"} ready to order` : "Your cart is empty."}</SheetDescription>
        </SheetHeader>

        <div className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto">
          {items.map((item) => (
            <article key={item.key} className="glass grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 rounded-2xl p-2.5">
              <div className="aspect-square overflow-hidden rounded-xl bg-surface-2">
                {item.image && <img src={item.image} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 py-1">
                <h3 className="truncate font-display text-sm font-bold">{item.name}</h3>
                {item.option && <p className="truncate text-xs text-muted-foreground">{item.option}</p>}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-bold">{money(item.price)}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="nav" size="icon" className="h-7 w-7" onClick={() => changeQuantity(item.key, item.quantity - 1)} aria-label={`Reduce ${item.name} quantity`}>
                      <Minus aria-hidden />
                    </Button>
                    <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                    <Button variant="nav" size="icon" className="h-7 w-7" onClick={() => changeQuantity(item.key, item.quantity + 1)} aria-label={`Increase ${item.name} quantity`}>
                      <Plus aria-hidden />
                    </Button>
                    <Button variant="nav" size="icon" className="h-7 w-7 text-lag-red" onClick={() => removeItem(item.key)} aria-label={`Remove ${item.name}`}>
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {items.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="mb-4 flex items-center justify-between font-display font-bold">
              <span>Total</span>
              <span className="text-xl">{money(total)}</span>
            </div>
            <Button variant="whatsapp" size="lg" className="w-full" onClick={() => void checkout()} disabled={placing}>
              {placing ? <Loader2 className="animate-spin" aria-hidden /> : <MessageCircle aria-hidden />}
              {placing ? "Placing order…" : "Checkout on WhatsApp"}
            </Button>
            {!user && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Sign in before checkout to save this order to your account.
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}