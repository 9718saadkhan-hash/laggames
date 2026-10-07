import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Heart, ShoppingCart } from "lucide-react";
import { createContext, memo, useContext, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { lowestGamePrice, money, type Game } from "@/lib/lag";
import { safePosition } from "@/lib/media";
import { wishlistQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

const WishlistContext = createContext<Set<string> | null>(null);

/** One wishlist subscription shared by every card in a catalogue grid. */
export function GameCardsWishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data = [] } = useQuery(wishlistQuery(user?.id));
  const savedIds = new Set(data.map((item) => item.game_id));
  return <WishlistContext.Provider value={savedIds}>{children}</WishlistContext.Provider>;
}

function GameCardBase({ game, className, priority = false }: { game: Game; className?: string; priority?: boolean }) {
  const { user } = useAuth();
  const { addItem } = useCart();
  const queryClient = useQueryClient();
  const savedIds = useContext(WishlistContext);
  const saved = savedIds?.has(game.id) ?? false;
  const from = lowestGamePrice(game);

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("auth");
      if (saved) {
        const { error } = await supabase
          .from("wishlist")
          .delete()
          .eq("user_id", user.id)
          .eq("game_id", game.id);
        if (error) throw new Error(error.message);
        return "removed" as const;
      }
      const { error } = await supabase.from("wishlist").insert({ user_id: user.id, game_id: game.id });
      if (error) throw new Error(error.message);
      return "added" as const;
    },
    onSuccess: (res) => {
      toast.success(res === "added" ? "Added to wishlist." : "Removed from wishlist.");
      void queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
    onError: (e) =>
      toast.error(e.message === "auth" ? "Sign in to save games to your wishlist." : e.message),
  });

  return (
    <article
      className={cn(
        "glass catalog-card hover-lift card-perf group relative flex flex-col overflow-hidden rounded-2xl",
        className,
      )}
    >

      <Link
        to="/games/$slug"
        params={{ slug: game.slug }}
        className="relative block aspect-2/3 overflow-hidden bg-surface-2"
        aria-label={`View details for ${game.title}`}
      >
        {game.cover_url ? (
          <img
            src={game.cover_url}
            alt={`${game.title} artwork`}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "low"}

            style={{ objectPosition: safePosition(game.cover_position) }}
            decoding="async"
            width="480"
            height="720"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div aria-hidden className="h-full w-full bg-surface-2" />
        )}
        {game.pre_order && (
          <span className="absolute top-3 left-3 rounded-full bg-lag-blue px-2.5 py-1 text-[10px] font-bold tracking-wider text-primary-foreground">
            PRE-ORDER
          </span>
        )}
      </Link>

      <button
        type="button"
        aria-label={saved ? `Remove ${game.title} from wishlist` : `Add ${game.title} to wishlist`}
        aria-pressed={saved}
        onClick={() => toggle.mutate()}
        className="glass absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full transition-colors hover:text-lag-red"
      >
        <Heart className={cn("h-4 w-4", saved && "fill-lag-red text-lag-red")} aria-hidden />
      </button>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="min-w-0 truncate font-display text-base font-bold">{game.title}</h3>
        <span className="mt-1 font-display text-lg font-bold">{money(from)}</span>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button asChild variant="glass" size="sm">
            <Link to="/games/$slug" params={{ slug: game.slug }}>
              Details
            </Link>
          </Button>
          <Button
            variant="hero"
            size="sm"
            onClick={() => {
              addItem({
                key: `game:${game.id}`,
                name: game.title,
                price: from,
                image: game.cover_url,
                productType: "Game",
                productId: game.id,
                option: "Choose account and duration on WhatsApp",
              });
              toast.success(`${game.title} added to cart.`);
            }}
          >
            <ShoppingCart aria-hidden />
            <span className="hidden sm:inline">Add to Cart</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>
    </article>
  );
}

/** Memoised: long catalogue grids only re-render the cards that changed. */
export const GameCard = memo(GameCardBase);

