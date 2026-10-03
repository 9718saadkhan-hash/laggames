# Games scrolling optimization

## Changes
- Reduce catalogue loading from 24-game batches to four-game batches.
- Keep only nearby cover images loaded; release cover images after cards move well outside the viewport.
- Preserve each card's exact dimensions and placeholder space so scrolling never jumps.
- Keep all existing game data, design, filters, sorting, wishlist, cart, and navigation unchanged.

## Validation
- Check mobile and desktop scrolling, image reloading when scrolling back, controls, layout width, and preview errors.

## Technical details
- Use viewport observation for reversible cover-image loading without removing card layout.
- Retain the shared wishlist subscription and current lightweight catalogue query.
