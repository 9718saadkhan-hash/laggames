# Smooth Games page transitions

## Changes
- Keep the current 12-games-per-page layout and all existing design, data, filters, sorting, wishlist, cart, and navigation unchanged.
- When a page number, Previous, or Next is selected, immediately unrender the old page’s game cards.
- Show a Games loading screen while only the selected page’s cover images are loaded.
- Reveal all 12 selected-page cards together after their covers finish loading; failed or missing covers will not block the page.
- Keep only the currently selected page mounted, so previous and other pages do not continue rendering.

## Validation
- Verify page 1 → 2 and direct jumps such as 1 → 7 on mobile and desktop.
- Confirm the loading screen appears, the old cards disappear immediately, and exactly 12 selected-page cards render afterward.
- Confirm search/filter changes return to page 1 and still use the same loading behavior.
