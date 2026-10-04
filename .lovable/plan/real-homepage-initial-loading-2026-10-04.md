# Real homepage initial loading

## What will change
- Replace the existing timed intro with a full-screen LAG loading screen that appears immediately on the public homepage, reports real data/image progress, and exits quickly when cached.
- Keep the homepage hidden until its critical first-screen data and images are ready, then reveal it with a short transition.
- Add a timeout and failure fallback so one unavailable image or request can never trap a customer.
- Leave the admin panel and all existing public design, content, controls, and features unchanged.

## Real loading and performance work
- Load the homepage’s critical records through the existing query cache before rendering its main content; remove homepage requests whose results are not displayed.
- Replace the current full-game homepage download with a lightweight query that returns only the visible homepage games and their required card fields.
- Preload only the logo, first visible deal artwork, category artwork, and first visible game covers; below-the-fold reviews, collaborations, and secondary media remain lazy.
- Mark first-screen images high priority, preserve image aspect-ratio space, and keep later images low priority.
- Reuse TanStack Query’s existing memory cache with sensible freshness rather than adding duplicate requests or permanently caching dynamic catalogue data.

## Verification
- Test a cold homepage load and a repeat visit at mobile size, confirming the branded loader appears first and the visible page arrives without image-by-image popping or major layout shift.
- Test failed/slow images and confirm the safety timeout still reveals a usable homepage.
- Confirm only critical homepage media is preloaded, below-the-fold media stays lazy, admin routes do not show the loader, and the project build remains clean.

## Technical details
- Use the homepage route loader with `ensureQueryData` for critical records and shared query options so components consume the same cached requests.
- Drive the percentage from completed critical data and image tasks, with a short capped transition instead of an artificial delay.
- Keep optimization within the existing CDN/browser cache flow; do not add a service worker because dynamic admin-edited image URLs and inline legacy images need explicit invalidation rather than broad stale caching.