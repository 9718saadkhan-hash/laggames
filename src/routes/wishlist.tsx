import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, LogIn } from "lucide-react";

import { GameCard, GameCardsWishlistProvider } from "@/components/lag/GameCard";
import { EmptyState, GlassIcon, SectionHeading } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { wishlistQuery } from "@/lib/queries";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "My Wishlist — LAG LIVE AS GAMERS" },
      { name: "description", content: "Games you've saved for later on LAG — Live As Gamers." },
      { property: "og:title", content: "My Wishlist — LAG LIVE AS GAMERS" },
      { property: "og:description", content: "Games you've saved for later on LAG — Live As Gamers." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { user, loading: authLoading } = useAuth();
  const { data, isLoading, isError } = useQuery(wishlistQuery(user?.id));

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <EmptyState
          icon={LogIn}
          title="Sign in required"
          body="Sign in to view and manage the games you've saved to your wishlist."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild variant="hero" size="lg">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild variant="glass" size="lg">
                <Link to="/register">Create account</Link>
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  const games = (data ?? []).filter((w) => w.games !== null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SectionHeading eyebrow="Saved for later" title="My Wishlist" subtitle="Your favourite games, ready when you are." />
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass aspect-3/4 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState icon={Heart} title="Couldn't load wishlist" body="Please refresh the page and try again." />
      ) : games.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty."
          body="Browse our catalogue and tap the heart icon to save games here."
          action={
            <Button asChild variant="hero" size="lg">
              <Link to="/games">Browse games</Link>
            </Button>
          }
        />
      ) : (
        <GameCardsWishlistProvider>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {games.map((w, index) => (
              <GameCard key={w.id} game={w.games!} priority={index < 4} />
            ))}
          </div>
        </GameCardsWishlistProvider>
      )}
    </div>
  );
}
