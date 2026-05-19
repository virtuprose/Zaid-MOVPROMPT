## Goal

When the user is about to generate the first key frame, ask whether the scene has a recurring **character** or **product/object**. If yes, build a clean multi-angle **subject sheet on a white background** and **pin it** so every subsequent generation in the session (key frame + every storyboard panel) carries it as a hard identity reference. This is the missing piece for "same face, same product every frame".

## Flow

```text
User describes scene
        ↓
Director plans key frame (single_panel)
        ↓
NEW: Subject-lock chip (once per session, only if nothing pinned yet)
   ├─ "Yes — character"  → generate character sheet (3 views, white bg) → PIN
   ├─ "Yes — product"    → generate product sheet (3 views, white bg)   → PIN
   └─ "No recurring subject" → skip
        ↓
Aspect-ratio chip (existing)
        ↓
Key frame generation — client auto-prepends pinned sheet URL to reference_urls
        ↓
"Extend frame-by-frame" → storyboard chain — every panel keeps [subject sheet, scene anchor, prev panel]
```

## 1. New bubble — `subject_lock_choice` in `src/components/director/DirectorChat.tsx`

- Add bubble variant with three chips: Character / Product / Skip.
- Inserted before the existing `aspect_choice` bubble when the agent returns `mode: "single_panel"` AND `pinnedSubjectUrl` is null AND no prior `subject_lock_choice` exists in this session.
- On Character/Product: trigger an inline `runImageGeneration` with `mode: "character_sheet"` and a prompt tuned for the subject type:
  - Character: existing character-sheet prompt (already produces front / three-quarter / side on white).
  - Product: "Product sheet, three views in one image: front, three-quarter, side. Seamless pure white background. Even soft studio lighting. No people, no hands, no props, no text, no shadows below subject."
- After the sheet returns, **pin** the first generated URL (+ storage_path) into session state and continue to the existing aspect-ratio bubble for the original key frame.
- Skip: just mark pinned-decision as "none" so the chip never asks again this session, and continue.

## 2. Pinned-subject state — `src/components/director/DirectorChat.tsx`

- New ref + state `pinnedSubject: { url: string; storage_path: string; kind: "character" | "product" } | null`.
- Hydrated from the session row on load (new column `pinned_subject jsonb null` on `director_sessions`, or stored in the existing serialized bubbles — easier: derive from the most recent `generated_images` bubble flagged `subjectSheet: true`, no DB migration needed).
- Add `subjectSheet?: true` and `subjectKind?: "character" | "product"` to `GeneratedImageBubbleData` so the sheet bubble is distinguishable from a regular `character_sheet` generation.

## 3. Auto-attach in every reference call — `runImageGeneration`

At the top of `runImageGeneration`, if `pinnedSubject` exists, prepend its URL to `payload.reference_urls` (de-duped). This is the single enforcement point — applies to:
- Key frame (single_panel)
- Storyboard (storyboard_panels, both fresh and scene-extend)
- Single-panel regenerate (shot_index)

The agent prompt does not need to know about the pin; the client always wins.

## 4. Edge-function chain ordering — `supabase/functions/generate-reference-image/index.ts`

Today the chain builds refs as `[anchor, prevPanel, ...extras].slice(0, 4)`. We need the subject sheet (which the client puts first in `reference_urls`) to **stay sticky** across all panels and never be evicted.

Change to:
```text
sticky = referenceUrls[0]            // subject sheet (or scene anchor when no sheet)
sceneAnchor = referenceUrls[1] ?? sticky
extras = referenceUrls.slice(2, 3)
refsForPanel = [sticky, sceneAnchor, prevPanelUrl, ...extras].slice(0, 4)
```

When there is no subject sheet, behavior matches today (sticky === scene anchor, no duplication after dedupe).

Also append a sentence to the per-panel prompt when `referenceUrls.length >= 2`: "Match the subject (character/product) shown in the first attached reference sheet — keep face, wardrobe, hair, branding, and proportions exact."

## 5. Subject-sheet card UI — `src/components/director/GeneratedImageCard.tsx`

When `data.subjectSheet === true`:
- Header label becomes "Subject sheet · pinned" (with a small dot indicator using `--primary`).
- Add a tiny "Unpin" ghost button under the directors note. Unpinning clears the session pin so it stops being auto-attached.
- Keep all existing behaviors (download, expand).

## 6. Composer chip — `src/components/director/Composer.tsx` (small, optional)

Add a small read-only chip at the left of the composer when `pinnedSubject` exists: `● Subject pinned` so the user always sees that every generation will include it. Click → scrolls to the sheet bubble.

## 7. Director agent prompt — `supabase/functions/director-agent/index.ts`

One added line in the system rules:
> "When a subject sheet is pinned in the session (the client signals this via a `pinned_subject` marker in the latest user turn), every reference_image you describe must explicitly name the pinned subject ('the character from the attached sheet', 'the product from the attached sheet'). Do NOT regenerate the sheet; the client auto-attaches it."

The client sends a tiny `[pinned_subject: character]` system note on each turn after pinning.

## Out of scope

- DB migration / cross-device persistence of the pin (lives in the session bubbles for now).
- Multiple simultaneous subject sheets (one pinned subject per session).
- Video generation step — pin only flows through image generation.