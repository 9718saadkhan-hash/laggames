# Fix metadata matching and fallback collection

## What will change
- Keep IGDB as the first source, but never let a weak IGDB candidate end processing.
- Add a real key-free Wikipedia/Wikidata fallback that searches canonical titles, validates the title identity and PlayStation platform, then maps verified genre, developer, publisher, release date, rating availability, and source text.
- Keep RAWG support conditional and truthful: it will run only when `RAWG_API_KEY` exists. The current project does not have that secret, so results will no longer imply RAWG was checked.
- Replace the brittle title comparison with a shared identity matcher supporting numeric/Roman entries through 20, base-title-as-entry-one, parts, subtitles, remakes/remasters, and editions without crossing sequels.
- Merge metadata field by field across accepted sources. A source missing Rating or Description will not block fields found elsewhere.
- Build short/full descriptions only from accepted source summaries and verified structured facts; never invent gameplay or story details.
- Keep Game Size outside failure/review logic and preserve every existing field value.

## Result and review behavior
- Record the actual source used for each field and list every source genuinely queried.
- Show field-level filled, already available, and unresolved results.
- Mark complete when every non-size field is filled; show Game Size as manual-only.
- Mark Needs Review only after all available sources and title/platform variants are exhausted for the remaining non-size fields.
- Isolate each game so one lookup failure cannot stop bulk processing.

## Validation
- Run the real individual Auto-Fill on multiple database games covering exact, canonical-title, numbered, remastered, partial-source, and no-IGDB-match cases.
- Confirm database writes change only empty metadata fields.
- Verify bulk, list-row, and edit-dialog entry points use the same engine and show accurate source/status results.
