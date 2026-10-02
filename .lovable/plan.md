# Add optimized 1080p photo uploads

## What will change
- Add an output-quality choice inside the existing image editor, with **Optimized 1080p** as the default for website photos.
- Keep each crop ratio and full-image mode intact; 1080p limits the longest edge without stretching or enlarging smaller photos.
- Compress saved images at a web-friendly JPEG quality to reduce loading time while preserving clear visuals.
- Keep purpose-specific smaller limits for avatars, logos, favicons, and game covers where larger files add no visible benefit.
- Show the expected saved resolution and quality before applying the image.

## Technical details
- Extend the shared image preset configuration with output limits and compression quality.
- Pass the chosen output settings through full-image, rotated-crop, and normal crop exports.
- Keep all current upload locations using the same shared editor, so the change applies consistently without redesigning forms.
- Verify compilation and test the editor at desktop and mobile widths.
