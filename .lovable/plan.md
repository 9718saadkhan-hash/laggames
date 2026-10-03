# Prefer standard-edition media in game Auto-Fill

## What will change
- Update the shared game-media matcher to prefer the standard/base game when special editions or version records match the same title.
- Treat numeric and Roman sequel names as the same identity, so “Alan Wake 2” can safely match “Alan Wake II.”
- Keep sequel, remake, remaster, DLC, and genuinely different-game protections intact.
- Use the matched base game's cover and artwork/banner, plus up to four unique in-game screenshots from that same record.
- Keep existing missing-only behavior, replacement control, previews, and Undo unchanged across bulk, row, and Edit Game actions.

## Validation
- Confirm Alan Wake 2 no longer stops on equivalent standard/special-edition candidates.
- Confirm four screenshots are selected when the verified base record provides them.
- Confirm genuinely different versions still return Needs Review rather than guessing.
