import { useState } from "react";
import { ArrowUpRight, Check, Crown, Gamepad2, Minus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { COMPARISON_TIERS, comparisonBenefits, type ComparisonTier } from "@/lib/ps-plus-comparison";
import { cn } from "@/lib/utils";

const accents = ["text-lag-red", "text-lag-blue", "text-chart-3"] as const;
const selectedCells = ["bg-lag-red/10", "bg-lag-blue/10", "bg-chart-3/10"] as const;
const icons = [Sparkles, Gamepad2, Crown];

export function PsPlusComparison({ selectedTier, prices, available, durationLabel, onSelect }: {
  selectedTier: string;
  prices: Record<ComparisonTier, string>;
  available: Record<ComparisonTier, boolean>;
  durationLabel: string;
  onSelect: (tier: ComparisonTier) => void;
}) {
  const [differencesOnly, setDifferencesOnly] = useState(false);
  return (
    <section aria-labelledby="ps-plus-comparison-title" className="mt-10 border-t border-border pt-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-lag-blue">Find your tier</p>
          <h2 id="ps-plus-comparison-title" className="font-display text-2xl font-bold">Compare memberships</h2>
        </div>
        <label htmlFor="ps-plus-differences" className="flex cursor-pointer items-center gap-3 text-xs text-muted-foreground">
          Differences only
          <Switch id="ps-plus-differences" checked={differencesOnly} onCheckedChange={setDifferencesOnly} />
        </label>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full table-fixed border-collapse text-xs sm:text-sm">
          <caption className="sr-only">PlayStation Plus Essential, Extra and Deluxe membership benefits</caption>
          <colgroup><col className="w-[31%]" /><col /><col /><col /></colgroup>
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th scope="col" className="p-2 text-left font-medium text-muted-foreground sm:p-4">Benefits</th>
              {COMPARISON_TIERS.map((tier, index) => {
                const Icon = icons[index] ?? Sparkles;
                return <th key={tier} scope="col" className={cn("px-1 py-4 sm:p-4", selectedTier === tier && selectedCells[index])}>
                  <Icon className={cn("mx-auto mb-2 h-5 w-5", accents[index])} aria-hidden />
                  <span className={cn("block font-display text-[11px] font-bold sm:text-base", accents[index])}>{tier}</span>
                  <span className="mt-2 block text-[11px] font-semibold sm:text-sm">{prices[tier]}</span>
                  <span className="mt-1 block text-[9px] font-normal text-muted-foreground sm:text-xs">{durationLabel}</span>
                </th>;
              })}
            </tr>
          </thead>
          <tbody>
            {comparisonBenefits(differencesOnly).map((benefit) => (
              <tr key={benefit.id} className="border-b border-border last:border-b-0 hover:bg-muted/20">
                <th scope="row" className="px-2 py-4 text-left text-[11px] font-medium text-muted-foreground sm:px-4 sm:text-sm">{benefit.label}</th>
                {benefit.included.map((included, index) => <td key={COMPARISON_TIERS[index]} className={cn("p-2 text-center sm:p-4", selectedTier === COMPARISON_TIERS[index] && selectedCells[index])}>
                  {included ? <Check className={cn("mx-auto h-4 w-4", accents[index])} aria-hidden /> : <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" aria-hidden />}
                  <span className="sr-only">{included ? "Included" : "Not included"}</span>
                </td>)}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/20">
              <th scope="row" className="p-2 text-left text-[11px] font-medium text-muted-foreground sm:p-4">Membership</th>
              {COMPARISON_TIERS.map((tier, index) => <td key={tier} className={cn("px-1 py-3 sm:p-4", selectedTier === tier && selectedCells[index])}>
                <Button variant="ghost" size="sm" disabled={!available[tier]} aria-label={`Choose ${tier} membership`} aria-pressed={selectedTier === tier} onClick={() => onSelect(tier)} className={cn("h-auto w-full gap-1 whitespace-normal px-0.5 py-2 text-[10px] sm:text-xs", accents[index])}>
                  {available[tier] ? (selectedTier === tier ? "Selected" : "Choose") : "Unavailable"}
                  {available[tier] && <ArrowUpRight aria-hidden className="!h-3 !w-3" />}
                </Button>
              </td>)}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Deluxe does not include cloud streaming. Cloud save storage is separate and included in all three tiers. Games and benefits vary by region and may change. <a href="https://www.playstation.com/en-in/ps-plus/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground">PlayStation membership details</a></p>
    </section>
  );
}