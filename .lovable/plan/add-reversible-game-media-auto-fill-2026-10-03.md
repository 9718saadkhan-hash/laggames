# Add reversible game media auto-fill

## What will change
- Extend **Admin → Auto-Fill Info** with a separate **Game Media** mode for verified real media only.
- Find media from the same confidently matched game/version and platform used by the existing metadata matcher.
- Support five independently selectable targets: cover image, landscape banner, up to four screenshots, and an official/verified YouTube trailer link.
- Fill only missing media by default; never replace an existing image or trailer unless the admin explicitly enables replacement for that run.
- Add bulk, selected-game, individual-row, and Edit Game actions through one shared lookup implementation.
- Show per-game previews and field-level outcomes before/after applying media, including source and match confidence.
- Add responsive progress, stop/resume-safe processing, retry for unresolved media, and clear “Needs Review” results when a reliable match or media asset cannot be verified.
- Keep downloaded images within the existing 1536px maximum, preserve aspect ratio, avoid upscaling/stretching, and store them in the website’s managed media storage rather than depending on expiring third-party links.
- Save every changed field in an admin-only media history table so the latest auto-fill operation can be undone per game or in bulk.

## Controls and safety
- Default controls: all five targets selected, missing fields only, four screenshots maximum.
- Trailer selection will prefer official publisher/developer videos and valid YouTube watch URLs; uncertain results remain for review rather than being guessed.
- Undo restores the exact previous cover, banner, gallery, and trailer values without changing game text, prices, editions, order, visibility, flags, or availability.
- Existing manual upload/edit controls remain unchanged.

## Validation
- Test a confident match, a partially filled game, and a no-match/ambiguous game.
- Verify apply and undo, image storage access, bulk progress, mobile layout, and public game detail rendering.
- Confirm all content pages retain unique social metadata and the final build is clean.

## Technical details
- Extend the IGDB request to include cover, artwork, screenshots, and videos, with image URL normalization and YouTube ID validation.
- Add a migration for admin-only media-operation backups with explicit grants, row-level security, and role checks.
- Reuse the authenticated server function boundary and existing catalogue query invalidation.
