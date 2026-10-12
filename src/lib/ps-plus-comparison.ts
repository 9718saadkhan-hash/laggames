export const COMPARISON_TIERS = ["Essential", "Extra", "Deluxe"] as const;
export type ComparisonTier = (typeof COMPARISON_TIERS)[number];

/** India/Deluxe benefits, not the cloud-enabled Premium offering. */
export const PS_PLUS_BENEFITS = [
  { id: "multiplayer", label: "Online multiplayer", included: [true, true, true] },
  { id: "monthly", label: "Monthly games", included: [true, true, true] },
  { id: "discounts", label: "Exclusive discounts", included: [true, true, true] },
  { id: "saves", label: "Cloud save storage", included: [true, true, true] },
  { id: "catalogue", label: "Game catalogue", included: [false, true, true] },
  { id: "classics", label: "Classics catalogue", included: [false, false, true] },
  { id: "trials", label: "Game trials", included: [false, false, true] },
  { id: "streaming", label: "Cloud streaming", included: [false, false, false] },
] as const;

export function comparisonBenefits(differencesOnly: boolean) {
  return PS_PLUS_BENEFITS.filter((benefit) => !differencesOnly || benefit.included.some((value) => value !== benefit.included[0]));
}