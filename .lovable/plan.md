# Wire Seedance 2.0 (multi-reference) into our pipeline

You were right — I missed the right endpoint. Seedance 2.0 ships **two** variants on FAL:

| Endpoint | Inputs | Use case |
|---|---|---|
| `bytedance/seedance-2.0/image-to-video` | 1 starting image (+ optional end image) | Animate one still |
| `bytedance/seedance-2.0/reference-to-video` | **up to 9 images + 3 videos + 3 audio (12 total)** | Multi-reference identity lock |

The reference-to-video one is what your "12 reference files" matches. It supports native audio, 4–15s, 480p/720p/1080p, all the aspect ratios we already use (9:16 / 16:9 / 1:1 / etc.), and pricing is the same $0.30 / sec at 720p (drops to $0.18 if video refs are attached). References are addressed inline as `@Image1`, `@Image2`, `@Video1`, etc. in the prompt.

This means we can drop Kling Omni and standardize on Seedance 2.0 for everything — same provider, lower complexity, native audio across the board, and proper identity lock.

## What changes

**1. `supabase/functions/generate-video/index.ts` — endpoint mapping**

Replace the broken Seedance 2.0 aliases with the real endpoints (no `fal-ai/` prefix — FAL serves these under bare `bytedance/...`):

- `seedance-2.0` → `bytedance/seedance-2.0/image-to-video` (single image, optional end frame)
- `seedance-2.0-ref` → `bytedance/seedance-2.0/reference-to-video` (multi-ref, up to 12 files)
- Keep `seedance-v1-pro` as the text-only fallback.
- Keep `kling-omni-ref` mapping for in-flight jobs (graceful), but stop routing new jobs there.

Confirm our queue caller handles a bare `bytedance/...` path the same way it handles `fal-ai/...` paths. Normalize in one place if not.

**2. `supabase/functions/generate-video/index.ts` — `buildFalPayload`**

Extend the `seedance` branch:

- For `seedance-2.0-ref`: send `image_urls: referenceImages.slice(0, 9)` (array, NOT `image_url`). Optionally `video_urls` and `audio_urls` if we ever start collecting those.
- For `seedance-2.0` (image-to-video): keep `image_url = referenceImages[0]`, optional `end_image_url = referenceImages[1]`.
- Map our `duration` (number) → Seedance enum string ("4"–"15" or "auto"), clamping into range.
- Pass `resolution`, `aspect_ratio`, `generate_audio`.

**3. `src/pages/MarketingStudio.tsx` — provider routing**

```
refs = 0   → seedance-v1-pro              (text-only, fast)
refs = 1   → seedance-2.0  (image-to-video)
refs ≥ 2   → seedance-2.0-ref (reference-to-video, all refs passed)
```

Pass all up to 9 brand+character+location refs to the function.

**4. Prompt composition — `src/lib/marketingStudio.ts`**

Reference-to-video relies on `@Image1`, `@Image2`, ... tags inside the prompt to bind each ref to a subject. Update `composeStudioPrompt` so when refs exist:
- Brand line mentions `@Image1` for the logo/product.
- Character line mentions `@Image2` for the avatar.
- Location line mentions `@Image3` for the place.
- Order must match the order we pass to `image_urls`.

This is what actually makes the identity lock work — without `@ImageN` tags Seedance treats the refs as loose style hints.

**5. Verify**

- Deploy `generate-video`.
- Curl with prompt + 3 refs (brand + character + location) → confirm FAL request body contains `image_urls: [3 urls]` and resulting clip preserves all three.
- Curl with prompt + 1 ref → confirm it routes to `image-to-video` with `image_url`.
- Curl with prompt only → confirm v1 Pro text-to-video still works.
- Watch a fresh render in the UI end-to-end.

## Trade-offs

- Cheaper than Kling Omni at the same quality tier and with up to 12 inputs vs Kling's 7.
- Same native audio support, same aspect ratios.
- Only catch: the `@ImageN` prompt tags must line up with the order of `image_urls` — that's a prompt-composition discipline thing, handled in step 4.

## Out of scope

UI layout, Director chat, DB schema. No new secrets — `FAL_KEY` covers it.
