import { MessageCircle, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";

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
  const { items, count, total, changeQuantity, removeItem } = useCart();
  const { data: settings } = useQuery(settingsQuery);
  const contact = contactFrom(settings);
  const checkoutUrl = whatsappLink(contact.whatsapp, buildCartMessage(items, contact.brand));

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
            <Button asChild variant="whatsapp" size="lg" className="w-full">
              <a href={checkoutUrl} target="_blank" rel="noreferrer noopener">
                <MessageCircle aria-hidden />
                Checkout on WhatsApp
              </a>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}