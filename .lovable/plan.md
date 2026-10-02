# Add optimized 1080p photo uploads

## What will change
- Export website photos at compressed **1080p / 1.5K maximum** with no 4K output or quality selector.
- Keep each crop ratio and full-image mode intact; the limit applies to the longest edge without stretching or enlarging smaller photos.
- Compress saved images at a web-friendly JPEG quality to reduce loading time while preserving clear visuals.
- Keep purpose-specific smaller limits for avatars, logos, favicons, and game covers where larger files add no visible benefit.
- Show that saved photos are optimized to a maximum 1080p / 1.5K resolution.

## Technical details
- Extend the shared image preset configuration with output limits and compression quality.
- Pass the fixed optimized output settings through full-image, rotated-crop, and normal crop exports.
- Keep all current upload locations using the same shared editor, so the change applies consistently without redesigning forms.
- Verify compilation and test the editor at desktop and mobile widths.
