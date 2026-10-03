# LAG upgrade roadmap

## Done
- Photo/video picking from device with crop + zoom editor, focal-point control
- Uploads across admin: games, deals, upcoming games, PS Plus, OTT, homepage banners, logo/favicon, collab videos
- Deal detail pages (/deals/:slug) and upcoming game detail pages (/upcoming-games/:slug)
- Game detail page rebuilt (mobile hero, pricing near top, gallery, trailer, related)
- On-site review submission (pending approval) + admin moderation with approve/reject/hide/feature/edit
- Admin: dashboard stats + chart, media library, wishlist analytics, contact messages, richer customer profiles (orders, wishlist, reviews, sessions, activity)
- Premium light theme, stronger glass buttons/icons, hamburger social buttons, About social buttons
- Account page: device avatar upload, active sessions list
- Overflow + console checks pass on all public and admin pages at 390px and 1280px
- Rebuilt crop tool (drag, pinch zoom, slider, ratios, reset/cancel/save, live preview)
- PS Plus Essential/Extra/Deluxe with 1/3/12-month dynamic pricing (public + admin)
- Collab videos: direct device uploads, thumbnails, order/publish controls; homepage swipe rail above How It Works
- Homepage: image category cards (Games / PS Plus / OTT) editable from admin; removed New Releases, Latest Deals, generic subscription strip
- Admin customer search (name/username/email/phone) and manual WhatsApp order entry
- Registration with name, username, email, country code, phone (email sign-up, no OTP provider yet)
- JOIN WHATSAPP COMMUNITY button in the menu
- Larger, simplified product cards with persistent cart and combined WhatsApp checkout
- Floating WhatsApp reference artwork with Instagram directly above it
- WhatsApp-style admin image adjuster with crop ratios, drag, pinch/slider zoom, rotation, reset, cancel, save, and live preview
- Second full-access administrator account
- Homepage category cards updated to the compact two-column collection style from the supplied reference
- Homepage deal cards changed to 4:5 with marked labels removed; primary actions use frosted white styling
- Auto-fill now includes missing short and full descriptions from verified IGDB summaries
- Floating Instagram and WhatsApp controls removed from admin pages only
- Image uploads limited to compressed 1080p/1.5K output without stretching, distortion, or upscaling
- Admin Image Compressor scans every website photo section, supports individual/selected/bulk compression, reports savings, and keeps restorable originals

## Possible next
- Public bucket for images (currently blocked, images stored inline) to reduce page weight
- Media library reuse directly inside each upload field
- Game editions: per-game editions with their own 30d/60d/permanent prices, managed from admin Games
