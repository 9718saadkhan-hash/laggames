# Smooth, lightweight Games catalogue

## What will change
- Keep the existing Games page appearance, cards, data, filters, ordering, wishlist, cart, and navigation unchanged.
- Render the catalogue progressively so the browser does not mount every game card at once; automatically reveal more games near the bottom.
- Use one shared wishlist lookup for the catalogue instead of a separate subscription on every card.
- Load only the game fields needed by public catalogue cards and filters, while leaving admin and game-detail data untouched.
- Prioritize only the first visible cover images and keep later covers lazy-loaded with reserved dimensions.
- Reduce expensive live blur and animation work on mobile catalogue cards while retaining the same visual appearance.
- Remove scroll-triggered React updates that are not visually necessary.

## Verification
- Test mobile and desktop scrolling, automatic loading, search, filters, sorting, wishlist, Details, and Add to Cart.
- Check for layout shifts, horizontal overflow, console/network errors, and a clean project build.

## Technical details
- Add a shared wishlist state passed into memoized cards.
- Use an intersection sentinel with incremental batches rather than adding a new visible pagination design.
- Add a dedicated lightweight public catalogue query; existing full game queries remain available elsewhere.
- Scope paint/compositing optimizations to catalogue cards and small-screen fixed glass surfaces.
