# Fix the fresh Seedance reference-render failure

## Problem

The message is still appearing because a brand/avatar render is creating a brand-new `seedance-2.0-ref` job that fails on the provider side. This is not the old refresh toast loop anymore.

## What to change

1. **Stop using the broken provider id for new reference renders**
   - In `src/pages/MarketingStudio.tsx`, change the provider selected when reference images exist from `seedance-2.0-ref` to `seedance-v1-pro-ref`.
   - Keep the no-reference path on `seedance-v1-pro`.

2. **Add a backend safety alias**
   - In `supabase/functions/generate-video/index.ts`, keep support for old saved `seedance-2.0-ref` jobs by mapping that legacy provider id to the working `fal-ai/bytedance/seedance/v1/pro/image-to-video` endpoint.
   - Add a short comment explaining that the Seedance 2.0 reference endpoint does not exist on fal, so legacy ids are intentionally routed to the v1 Pro image-to-video endpoint.

3. **Verify the failing path is gone**
   - Deploy the updated `generate-video` function.
   - Confirm that there are no remaining active jobs using the broken provider path.
   - Check the latest network or edge-function activity after the change to ensure new reference renders use `seedance-v1-pro-ref`.

## Expected result

- Refresh should no longer surface this message from new marketing renders.
- New ads generated with brand/avatar/location references should use the working reference-video model.
- Older failed rows can remain in history, but they should not keep breaking new renders.

## Technical details

- Confirmed from fal docs/openapi:
  - `fal-ai/bytedance/seedance/v1/pro/image-to-video` exists
  - `fal-ai/bytedance/seedance-2.0/image-to-video` returns 404
- Files involved:
  - `src/pages/MarketingStudio.tsx`
  - `supabase/functions/generate-video/index.ts`