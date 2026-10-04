# Fix failing SEO findings

## Changes
- Add a complete `/sitemap.xml` for public static pages plus visible games, deals, and upcoming-game pages, and reference it from `robots.txt`.
- Give the homepage a distinct title and add self-referencing canonical and social URLs to public content pages.
- Load game details before rendering metadata so each game page uses its real title, description, image, price, and availability.
- Add Product structured data to game pages and review/rating structured data to the reviews page.
- Exclude account, authentication, password-reset, wishlist, and every admin page from sitemap discovery and add page-level `noindex` where appropriate.
- Connect Google Search Console, verify the published domain, and submit the sitemap after the source corrections are live.

## Verification
- Check the generated sitemap includes only public discoverable pages and visible records.
- Verify titles, descriptions, canonical links, social previews, and structured data in rendered output.
- Mark only findings whose complete corrections are confirmed as fixed; leave Search Console pending if authorization or publishing remains incomplete.
