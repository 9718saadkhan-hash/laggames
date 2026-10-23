import { DURATION_LABEL, type AccountKey, type DurationKey, type Game } from "./lag";

export type GamePriceSource = Pick<Game, "price_30" | "price_60" | "price_permanent" | "price_30_secondary" | "price_60_secondary" | "price_permanent_secondary">;

/** Keep search offers consistent with the selectable account's displayed price. */
export function priceFor(source: GamePriceSource, duration: DurationKey, account: AccountKey = "primary") {
  const primary = duration === "30" ? source.price_30 : duration === "60" ? source.price_60 : source.price_permanent;
  if (account === "primary") return primary;
  const secondary = duration === "30" ? source.price_30_secondary : duration === "60" ? source.price_60_secondary : source.price_permanent_secondary;
  return secondary ?? primary;
}

/** Standard edition only; no invented stock status or prices for unavailable accounts. */
export function gameSearchOffers(game: Game, url: string) {
  if (!game.visible) return [];
  const accounts: AccountKey[] = [];
  if (game.primary_available) accounts.push("primary");
  if (game.secondary_available) accounts.push("secondary");
  return accounts.flatMap((account) => (["30", "60", "permanent"] as DurationKey[]).flatMap((duration) => {
    const price = priceFor(game, duration, account);
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return [];
    return [{
      "@type": "Offer",
      name: `Standard Edition · ${account === "primary" ? "Primary" : "Secondary"} account · ${DURATION_LABEL[duration]}`,
      description: "PlayStation account access; availability and payment are confirmed on WhatsApp.",
      url,
      priceCurrency: "INR",
      price,
      seller: { "@type": "Organization", name: "LAG LIVE AS GAMERS" },
      ...(game.pre_order ? { availability: "https://schema.org/PreOrder" } : {}),
    }];
  }));
}