/** Shared LAG domain helpers: types, money, WhatsApp order links. */

export type DurationKey = "30" | "60" | "permanent";
export type AccountKey = "primary" | "secondary";

export const DURATION_LABEL: Record<DurationKey, string> = {
  "30": "30 Days",
  "60": "60 Days",
  permanent: "Permanent",
};

export const PLATFORMS = ["PS4", "PS5", "PS4 & PS5"] as const;

export interface Game {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  description: string | null;
  cover_url: string | null;
  banner_url: string | null;
  gallery: string[];
  trailer_url: string | null;
  platform: string;
  genre: string | null;
  developer: string | null;
  publisher: string | null;
  release_date: string | null;
  game_size: string | null;
  rating: number | null;
  primary_available: boolean;
  secondary_available: boolean;
  primary_description: string | null;
  secondary_description: string | null;
  price_30: number | null;
  price_60: number | null;
  price_permanent: number | null;
  old_price: number | null;
  availability: string;
  featured: boolean;
  trending: boolean;
  hot_deal: boolean;
  new_release: boolean;
  visible: boolean;
  display_order: number;
  created_at: string;
}

export interface PsPlusPlan {
  id: string;
  name: string;
  tier: string;
  duration: string;
  region: string;
  platform: string;
  price: number | null;
  old_price: number | null;
  description: string | null;
  features: string[];
  image_url: string | null;
  availability: string;
  visible: boolean;
  display_order: number;
}

export interface OttPlan {
  id: string;
  name: string;
  logo_url: string | null;
  plan: string;
  duration: string;
  quality: string | null;
  screens: string | null;
  price: number | null;
  old_price: number | null;
  description: string | null;
  availability: string;
  visible: boolean;
  display_order: number;
}

export interface HeroBanner {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  game_slug: string | null;
  platform: string | null;
  price_from: number | null;
  release_date: string | null;
  availability: string | null;
  cta_label: string;
  visible: boolean;
  display_order: number;
}

export interface Review {
  id: string;
  user_id: string | null;
  name: string;
  rating: number;
  review: string;
  avatar_url: string | null;
  status: string;
  featured: boolean;
  created_at: string;
}

export interface CollabVideo {
  id: string;
  title: string;
  description: string | null;
  url: string;
  thumbnail_url: string | null;
  platform: string;
  visible: boolean;
  display_order: number;
}

export interface OrderRow {
  id: string;
  order_code: string;
  user_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  product_type: string;
  product_id: string | null;
  product_name: string;
  platform: string | null;
  option_type: string | null;
  duration: string | null;
  price: number | null;
  status: string;
  created_at: string;
}

export const ORDER_STATUSES = [
  "Pending",
  "Payment Requested",
  "Paid",
  "Processing",
  "Completed",
  "Cancelled",
] as const;

export const DEFAULT_CONTACT = {
  brand: "LAG LIVE AS GAMERS",
  tagline: "BEST GAMES. BEST SERVICE. BEST EXPERIENCE.",
  whatsapp: "919915882125",
  whatsapp_display: "+91 9915882125",
  instagram: "lag_prince",
  whatsapp_group: "https://chat.whatsapp.com/FhEYxa03iI0GxJ3K2Ke6sL",
};

export type ContactSettings = typeof DEFAULT_CONTACT;

export function money(value?: number | null): string {
  if (value === null || value === undefined) return "Ask on WhatsApp";
  return "₹" + Number(value).toLocaleString("en-IN");
}

export function discountPercent(oldPrice?: number | null, newPrice?: number | null): number | null {
  if (!oldPrice || !newPrice || oldPrice <= newPrice) return null;
  return Math.round(((oldPrice - newPrice) / oldPrice) * 100);
}

export function formatDate(value?: string | null): string {
  if (!value) return "TBA";
  const d = new Date(value + (value.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return "TBA";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function lowestGamePrice(game: Pick<Game, "price_30" | "price_60" | "price_permanent">) {
  const prices = [game.price_30, game.price_60, game.price_permanent].filter(
    (p): p is number => typeof p === "number",
  );
  return prices.length ? Math.min(...prices) : null;
}

export function instagramUrl(handle: string) {
  return `https://instagram.com/${handle.replace(/^@/, "")}`;
}

export function whatsappLink(phone: string, message: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

export interface OrderIntent {
  productType: "game" | "ps-plus" | "ott" | "general";
  productName: string;
  productId?: string | null;
  platform?: string | null;
  optionType?: string | null;
  duration?: string | null;
  price?: number | null;
  region?: string | null;
  customerName?: string | null;
}

export function buildOrderMessage(intent: OrderIntent, brand = DEFAULT_CONTACT.brand): string {
  const lines: string[] = [`Hi ${brand} 👋`, ""];
  if (intent.productType === "game") {
    lines.push("I want to order:", "", `Game: ${intent.productName}`);
    if (intent.platform) lines.push(`Platform: ${intent.platform}`);
    if (intent.optionType) lines.push(`Type: ${intent.optionType}`);
    if (intent.duration) lines.push(`Duration: ${intent.duration}`);
  } else if (intent.productType === "ps-plus") {
    lines.push("I want to buy:", "", `PS Plus: ${intent.productName}`);
    if (intent.duration) lines.push(`Duration: ${intent.duration}`);
    if (intent.region) lines.push(`Region: ${intent.region}`);
    if (intent.platform) lines.push(`Platform: ${intent.platform}`);
  } else if (intent.productType === "ott") {
    lines.push("I want to buy:", "", `OTT: ${intent.productName}`);
    if (intent.optionType) lines.push(`Plan: ${intent.optionType}`);
    if (intent.duration) lines.push(`Duration: ${intent.duration}`);
  } else {
    lines.push(intent.productName);
  }
  if (intent.price !== null && intent.price !== undefined) lines.push(`Price: ${money(intent.price)}`);
  if (intent.productId) lines.push(`Product ID: ${intent.productId.slice(0, 8).toUpperCase()}`);
  if (intent.customerName) lines.push(`Customer: ${intent.customerName}`);
  lines.push("", "Please confirm availability and payment details.");
  return lines.join("\n");
}
