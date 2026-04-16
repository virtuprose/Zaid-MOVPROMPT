

## Save Uploaded Images for Future Training Data

**Current state:** Images are NOT saved. They're compressed to base64 in the browser, sent to edge functions for AI analysis, and discarded after processing. Nothing persists.

**Proposed:** Store uploaded images in cloud storage alongside their prompt history entry, building a dataset of image → prompt pairs for future model training and analytics.

### Architecture

```text
User uploads image → compress → send to AI (existing)
                   ↘ upload original to Storage bucket
                     → save storage path in prompt_history
```

### Changes

**1. Create a storage bucket (migration)**
- Create a `generation-images` private bucket
- RLS policies: users can upload to their own folder (`user_id/`), read their own files, admins can read all

**2. Database migration**
- Add `image_paths text[]` column to `prompt_history` table (nullable, default null — won't break existing rows)

**3. `src/components/WorkflowPanel.tsx`**
- After successful generation, upload each image to `generation-images/{user_id}/{prompt_history_id}/frame_{i}.jpg`
- Save the resulting paths into the `prompt_history` insert

**4. `src/pages/Library.tsx`**
- Display saved image thumbnails alongside each history entry (small previews using signed URLs)

### What this enables
- **Training data**: Paired image + prompt dataset grows organically
- **User value**: Users see their reference images in the library
- **Analytics**: Admins can study what types of images produce which prompts
- **Future**: Fine-tuning, style clustering, recommendation engine

### Privacy note
Images are stored per-user with RLS. Only the uploading user and admins can access them.

