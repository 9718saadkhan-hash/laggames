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
  cover_position: string | null;
  banner_position: string | null;
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
  price_30_secondary?: number | null;
  price_60_secondary?: number | null;
  price_permanent_secondary?: number | null;
  old_price: number | null;

  availability: string;
  featured: boolean;
  trending: boolean;
  hot_deal: boolean;
  new_release: boolean;
  pre_order?: boolean;
  visible: boolean;
  /** Manual priority. null/blank = no priority, sorted alphabetically after the prioritised games. */
  display_order: number | null;
  created_at: string;
}

/** True when a game has a real manual priority (blank/null means "auto A–Z"). */
export function hasManualOrder(value?: number | null): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Display Order as a priority system:
 * prioritised games first (ascending, ties broken A–Z), then all blank ones A–Z.
 */
export function compareGameOrder(
  a: { title: string; display_order?: number | null },
  b: { title: string; display_order?: number | null },
): number {
  const am = hasManualOrder(a.display_order);
  const bm = hasManualOrder(b.display_order);
  if (am !== bm) return am ? -1 : 1;
  if (am && bm && a.display_order !== b.display_order) {
    return (a.display_order as number) - (b.display_order as number);
  }
  return a.title.localeCompare(b.title, "en", { sensitivity: "base" });
}

/** Sort a list of games by the Display Order priority system. */
export function sortGamesByOrder<T extends { title: string; display_order?: number | null }>(list: T[]): T[] {
  return [...list].sort(compareGameOrder);
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
  price_1m: number | null;
  price_3m: number | null;
  price_12m: number | null;
  description: string | null;
  features: string[];
  image_url: string | null;
  image_position: string | null;
  availability: string;
  visible: boolean;
  display_order: number;
}

/** LAG sells exactly three PS Plus categories. */
export const PS_PLUS_TIERS = ["Essential", "Extra", "Deluxe"] as const;
export type PsPlusTier = (typeof PS_PLUS_TIERS)[number];

export const PS_PLUS_DURATIONS = [
  { key: "price_1m" as const, label: "1 Month" },
  { key: "price_3m" as const, label: "3 Months" },
  { key: "price_12m" as const, label: "12 Months" },
];
export type PsPlusDurationKey = (typeof PS_PLUS_DURATIONS)[number]["key"];

export interface OttPlan {
  id: string;
  name: string;
  logo_url: string | null;
  image_position: string | null;
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
  image_position: string | null;
  game_slug: string | null;
  platform: string | null;
  price_from: number | null;
  release_date: string | null;
  availability: string | null;
  cta_label: string;
  cta_link: string | null;
  badge: string | null;
  discount: string | null;
  deal_id: string | null;
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
  image_url: string | null;
  image_position: string | null;
  admin_note: string | null;
  verified: boolean;
  status: string;
  featured: boolean;
  created_at: string;
}

export interface CollabVideo {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  storage_path: string | null;
  source: string;
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
  notes?: string | null;
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
  instagram: "thelaggames",
  whatsapp_group: "https://chat.whatsapp.com/FhEYxa03iI0GxJ3K2Ke6sL",
};

export type ContactSettings = typeof DEFAULT_CONTACT;

export const HELP_MESSAGE =
  "Hi LAG LIVE AS GAMERS \u{1F44B} I need help with your games/subscriptions.";

export interface Deal {
  id: string;
  slug: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  image_position: string | null;
  discount: string | null;
  badge: string | null;
  cta_label: string;
  cta_link: string | null;
  start_date: string | null;
  end_date: string | null;
  featured: boolean;
  show_in_hero: boolean;
  visible: boolean;
  display_order: number;
  created_at: string;
}

export interface UpcomingGame {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  description: string | null;
  cover_url: string | null;
  banner_url: string | null;
  cover_position: string | null;
  banner_position: string | null;
  gallery: string[];
  platform: string;
  genre: string | null;
  developer: string | null;
  publisher: string | null;
  release_date: string | null;
  release_note: string | null;
  trailer_url: string | null;
  featured: boolean;
  visible: boolean;
  display_order: number;
  created_at: string;
}

export interface ActivityEntry {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_label: string | null;
  actor_id: string | null;
  actor_name: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

/** Pre-filled WhatsApp message for customer review submissions. */
export function buildReviewMessage(
  input: { name: string; rating: number; review: string },
  brand = DEFAULT_CONTACT.brand,
): string {
  return [
    `Hi ${brand} \u{1F44B}`,
    "",
    "I want to submit a review/feedback.",
    "",
    `Name: ${input.name}`,
    `Rating: ${input.rating}/5`,
    `Review: ${input.review}`,
    "",
    "Thank you.",
  ].join("\n");
}

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

/** Game sizes are always shown in GB: a bare number gets the "GB" unit appended. */
export function formatGameSize(size?: string | null): string {
  const v = (size ?? "").trim();
  if (!v) return "Ask on WhatsApp";
  if (/gb/i.test(v)) return v;
  if (/^\d+(\.\d+)?$/.test(v)) return `${v} GB`;
  return v;
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

export const REVIEW_STATUSES = ["pending", "approved", "rejected", "hidden"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export interface CustomerSession {
  id: string;
  user_id: string;
  device: string | null;
  browser: string | null;
  os: string | null;
  user_agent: string | null;
  created_at: string;
  last_active_at: string;
}

export interface CustomerActivity {
  id: string;
  user_id: string;
  action: string;
  detail: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

/** Slugify a title for deal / game detail URLs. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Days remaining until a date, or null when it is missing/past. */
export function daysUntil(date?: string | null): number | null {
  if (!date) return null;
  const target = new Date(date + (date.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(target.getTime())) return null;
  const diff = Math.ceil((target.getTime() - Date.now()) / 86_400_000);
  return diff > 0 ? diff : null;
}

/** Lightweight, non-invasive device summary for session history. */
export function describeDevice(ua: string): { device: string; browser: string; os: string } {
  const device = /Mobi|Android|iPhone/i.test(ua) ? "Mobile" : /iPad|Tablet/i.test(ua) ? "Tablet" : "Desktop";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : /Firefox\//.test(ua)
            ? "Firefox"
            : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iOS/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown OS";
  return { device, browser, os };
}

/** An alternate edition of a game (Standard, Deluxe, Ultimate…) with its own prices. */
export interface GameEdition {
  id: string;
  game_id: string;
  name: string;
  note: string | null;
  price_30: number | null;
  price_60: number | null;
  price_permanent: number | null;
  price_30_secondary?: number | null;
  price_60_secondary?: number | null;
  price_permanent_secondary?: number | null;
  old_price: number | null;
  visible: boolean;
  display_order: number;
}

/** Lowest listed price across a game and its editions. */
export function lowestEditionPrice(editions: GameEdition[]): number | null {
  const prices = editions
    .flatMap((e) => [
      e.price_30,
      e.price_60,
      e.price_permanent,
      e.price_30_secondary,
      e.price_60_secondary,
      e.price_permanent_secondary,
    ])
    .filter((p): p is number => typeof p === "number");
  return prices.length ? Math.min(...prices) : null;
}

