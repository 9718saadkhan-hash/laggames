# Extend game auto-fill and clean admin pages

## What will change
- Add **Short Description** and **Description** to the existing missing-information scan and progress/review screens.
- Request IGDB’s verified summary and storyline for the already-matched game and platform.
- Fill only blank description fields; keep every existing manual value untouched.
- Build the short description from reliable IGDB text using concise extraction, without inventing facts or adding promotional claims.
- Use verified IGDB summary/storyline text for the full description, leaving it blank and marking **Needs Review** when reliable text is unavailable.
- Record IGDB as the source for each description field alongside the existing field-level tracking.
- Stop rendering the floating Instagram and WhatsApp controls on every `/admin` page while preserving their public-site behavior exactly.

## Safety and validation
- Do not change titles, slugs, images, prices, display order, merchandising flags, visibility, availability, or existing metadata.
- Confirm the admin form already supports manual editing of both description fields.
- Verify the updated bulk flow with a small real run, plus desktop and mobile checks of public and admin pages.
