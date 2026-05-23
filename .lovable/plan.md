Logo wasn't appearing because the Fashion Dream and Cinematic Fashion preset templates never tell the video model when/where to render the brand logo. AI video models render a single continuous shot and won't auto-place a logo unless the prompt explicitly says so. Fix by baking an end-card hero beat into both presets.

**Edits in `src/lib/marketingStudio.ts`:**

1. **Fashion Dream preset (`fashion-dream`)** — extend sequence 6 ("The Lifestyle Hero") to end on a clean brand stamp:
   - Append: "…camera settles, then a final beat where the brand wordmark/logo (from the brand reference) fades in elegantly over the hero frame as an end-card — centered or lower-third, in the brand's typography vibe, held for ~1s before fade out."

2. **Cinematic Fashion preset (`cinematic-fashion`)** — same treatment on sequence 6 ("The Cinematic Hero"):
   - Append: "…ending on a tasteful brand end-card where the wordmark/logo from the brand reference fades in over the final hero frame (centered or lower-third in the brand's typography vibe, held briefly, then gentle fade out)."

3. **Brand line helper (`brandLineAt`, ~line 628-633)** — strengthen the logo instruction so the model knows the logo MUST appear in the end-card beat when one exists, not just "may appear on packaging":
   - Change the logo directive to: "Use {tag} as the brand wordmark/logo only — it MUST appear as the end-card stamp on the final hero shot (and on any packaging / screens / labels when the scene includes them). Do NOT use it as the product silhouette…" (keep the rest).

These changes are prompt-only — no UI or backend changes. Future Fashion Dream / Cinematic Fashion renders will end on a visible logo beat.

I'll skip the dress/video question for now since you didn't specify what was wrong — happy to dig in once you describe the issue (wrong color, distorted, not matching the uploaded reference, etc.).