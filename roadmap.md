# LAG upgrade roadmap

## Foundation
- [ ] Storage bucket `media` + `media_library` table + RLS/grants
- [ ] Schema: review images, image focal/crop positions, deal slugs, upcoming screenshots, collab uploads, customer sessions/activity
- [ ] `ImageUploadField` v2: crop / zoom / reposition / aspect-ratio presets, storage upload
- [ ] Video upload field for collabs

## Admin
- [ ] Swap all image-URL inputs for upload+crop (games, deals, upcoming, ps-plus, ott, homepage, collabs, settings logo/favicon, reviews)
- [ ] Reviews approval workflow (pending / approved / rejected / hidden, feature, edit, image)
- [ ] Customers: profile detail, wishlist, reviews, orders, sessions, activity timeline
- [ ] Media library page
- [ ] Dashboard revamp (stats, charts, quick actions)
- [ ] Nav additions

## Public
- [ ] Game detail page restructure (hero focal fix, mobile hero, price block near top)
- [ ] Upcoming game detail pages `/upcoming-games/$slug`
- [ ] Deal detail pages `/deals/$slug`
- [ ] Public review submission form (no WhatsApp redirect) with optional image
- [ ] About: 3 glass contact buttons
- [ ] Hamburger menu floating Instagram / WhatsApp community buttons

## Design / perf
- [ ] Premium light theme
- [ ] Stronger glass/blur buttons + icons
- [ ] High-refresh-rate friendly animations, lazy media
