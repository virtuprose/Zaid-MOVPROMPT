

## Plan: Preserve Image Aspect Ratio on Upload

### Problem
The preview container forces `aspect-video` (16:9) and uses `object-cover`, which crops images that aren't 16:9 (e.g. portrait, square, or ultra-wide images).

### Changes

**`src/components/ImageUploadZone.tsx`**
- Remove the fixed `aspect-video` class from the preview container (line 36)
- Change `object-cover` to `object-contain` on the `<img>` tag (line 38)
- Keep `aspect-video` on the empty upload zone (line 58) so it still has a nice shape before upload
- Use `w-full` with auto height on the preview container so it adapts to the image's natural aspect ratio
- Add `max-h-[400px]` to prevent extremely tall images from breaking the layout
- Set a background color on the preview container for letterboxing when using `object-contain`

### Technical Details
```
Preview container: "relative rounded-lg overflow-hidden border border-border"
Image tag: "w-full max-h-[400px] object-contain"
```

The upload zone keeps `aspect-video` for consistent empty-state sizing.

