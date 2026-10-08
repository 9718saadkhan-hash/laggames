import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface CartItem {
  key: string;
  name: string;
  price: number | null;
  image: string | null;
  option?: string;
  productType?: string;
  productId?: string | null;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  total: number;
  /** Returns false (and asks to sign in) when no one is signed in. */
  addItem: (item: Omit<CartItem, "quantity">) => boolean;
  changeQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = "lag-shopping-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setItems(JSON.parse(saved) as CartItem[]);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0),
    addItem: (next) => {
      if (!user) {
        toast.error("Create an account or sign in to add items to your cart.", {
          action: { label: "Sign up", onClick: () => { window.location.href = "/register"; } },
        });
        return false;
      }
      setItems((current) => {
        const existing = current.find((item) => item.key === next.key);
        return existing
          ? current.map((item) => item.key === next.key ? { ...item, quantity: item.quantity + 1 } : item)
          : [...current, { ...next, quantity: 1 }];
      });
      return true;
    },
    changeQuantity: (key, quantity) => setItems((current) =>
      quantity < 1
        ? current.filter((item) => item.key !== key)
        : current.map((item) => item.key === key ? { ...item, quantity } : item),
    ),
    removeItem: (key) => setItems((current) => current.filter((item) => item.key !== key)),
    clear: () => setItems([]),
  }), [items, user]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}

export function buildCartMessage(
  items: CartItem[],
  brand: string,
  orderCode?: string,
  coupon?: { code: string; discount: number } | null,
) {
  const lines = items.map((item, index) => {
    const option = item.option ? ` — ${item.option}` : "";
    const price = item.price === null ? "Price on request" : `₹${item.price.toLocaleString("en-IN")}`;
    return `${index + 1}. ${item.name}${option}\n   ${item.quantity} × ${price}`;
  });
  const subtotal = items.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);
  const discount = coupon ? Math.min(coupon.discount, subtotal) : 0;
  return [
    `Hi ${brand} 👋`,
    "",
    orderCode ? `Order ID: ${orderCode}` : null,
    orderCode ? "" : null,
    "I would like to order:",
    "",
    ...lines,
    "",
    coupon ? `Subtotal: ₹${subtotal.toLocaleString("en-IN")}` : null,
    coupon ? `Coupon ${coupon.code}: −₹${discount.toLocaleString("en-IN")}` : null,
    `Total: ₹${(subtotal - discount).toLocaleString("en-IN")}`,
    "",
    "Please confirm availability and payment details.",
  ].filter((line) => line !== null).join("\n");
}