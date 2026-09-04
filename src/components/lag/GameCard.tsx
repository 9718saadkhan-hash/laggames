import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarDays, Heart, Star } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { discountPercent, formatDate, lowestGamePrice, money, type Game } from "@/lib/lag";
import { safePosition } from "@/lib/media";
import { wishlistQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function GameCard({ game, className }: { game: Game; className?: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: wishlist } = useQuery(wishlistQuery(user?.id));
  const saved = wishlist?.some((w) => w.game_id === game.id) ?? false;
  const from = lowestGamePrice(game);
  const off = discountPercent(game.old_price, from);

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
        "glass hover-lift group relative flex flex-col overflow-hidden rounded-3xl",
        className,
      )}
    >
      <Link
        to="/games/$slug"
        params={{ slug: game.slug }}
        className="relative block aspect-16/10 overflow-hidden"
        aria-label={`View details for ${game.title}`}
      >
        {game.cover_url ? (
          <img
            src={game.cover_url}
            alt={`${game.title} artwork`}
            loading="lazy"
            style={{ objectPosition: safePosition(game.cover_position) }}
            className="h-full w-full object-cover transition-[transform,opacity] duration-700 will-change-transform group-hover:scale-105"
          />
        ) : (
          <div aria-hidden className="h-full w-full bg-surface-2" />
        )}
        <div aria-hidden className="overlay-fade absolute inset-0" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge tone="blue">{game.platform}</Badge>
          {game.hot_deal && <Badge tone="red">Hot</Badge>}
          {game.new_release && <Badge tone="red">New</Badge>}
        </div>
        {off && (
          <span className="glass absolute top-3 right-3 rounded-full px-2 py-0.5 text-[11px] font-bold text-lag-red">
            -{off}%
          </span>
        )}
      </Link>

      <button
        type="button"
        aria-label={saved ? `Remove ${game.title} from wishlist` : `Add ${game.title} to wishlist`}
        aria-pressed={saved}
        onClick={() => toggle.mutate()}
        className="glass absolute top-12 right-3 grid h-9 w-9 place-items-center rounded-full transition-colors hover:text-lag-red"
      >
        <Heart className={cn("h-4 w-4", saved && "fill-lag-red text-lag-red")} aria-hidden />
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <h3 className="min-w-0 truncate font-display text-base font-bold">{game.title}</h3>
          {game.rating ? (
            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground">
              <Star className="h-3.5 w-3.5 fill-lag-red text-lag-red" aria-hidden />
              {game.rating}
            </span>
          ) : null}
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          {formatDate(game.release_date)}
          <span aria-hidden>·</span>
          <span className={game.availability === "In Stock" ? "text-lag-blue" : ""}>
            {game.availability}
          </span>
        </p>
        <div className="mt-3 flex items-end gap-2">
          <span className="font-display text-lg font-bold">{money(from)}</span>
          {game.old_price && from && game.old_price > from ? (
            <span className="pb-0.5 text-xs text-muted-foreground line-through">
              {money(game.old_price)}
            </span>
          ) : null}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button asChild variant="glass" size="sm">
            <Link to="/games/$slug" params={{ slug: game.slug }}>
              Details
            </Link>
          </Button>
          <Button asChild variant="hero" size="sm">
            <Link to="/games/$slug" params={{ slug: game.slug }}>
              Buy / Rent
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
