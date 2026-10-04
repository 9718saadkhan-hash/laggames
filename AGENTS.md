<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep reversible image-compression originals in an admin-only database table so public records retain no backup data.
- Keep verified game-media auto-fill and undo in authenticated server functions, with admin-only history snapshots, so source matching and privileged storage never reach the browser.
- Keep the public game catalogue at 12 cards per page with one shared wishlist subscription; unmount the old page and preload only the selected page before revealing it.
- Delete unused media through the admin-only cleanup server function, triggered automatically after admin changes, so replaced or deleted images never linger in storage.
- Keep homepage first-paint readiness in the public home route: load slim critical data and only visible images before reveal, then start non-critical sections; never apply this gate to admin routes.
- Keep the public sitemap dynamic for visible catalogue records, omit synthetic last-modified dates, and exclude account, authentication, wishlist, admin, and API pages.
- Throttle the automatic unused-media cleanup (30s debounce, at most every 10 minutes, never on admin page open) because its full-content scan can overload the database.
- Load the admin games list without photos/descriptions and save only changed fields, so edits never re-send large images.
- Validate and redeem coupons only through server functions calling admin-only database functions, so coupon codes can never be listed or edited by customers.
