

## Empty-state inside mention popover

### What changes

When the mention popover in `SceneMentionTextarea` opens and `elements.length === 0`, render a friendly empty state instead of a blank list, and let the user "create" a placeholder first mention by clicking a CTA.

### Behavior

- **Before breakdown runs / no detected elements**: popover shows empty state:
  - Icon (AtSign) + title: "No elements yet"
  - Muted line: "Run scene analysis to detect elements, or insert a placeholder to start writing."
  - Primary CTA: **"Insert @1 placeholder"** — inserts `@1 ` at the caret using the same `insertMention` path.
- **With elements**: existing list renders as today (no change).
- The "Insert mention" pill (trigger button) is currently disabled when `elements.length === 0`. Enable it so the empty-state CTA is reachable; the popover now handles the empty case itself.

### Implementation details

`src/components/SceneMentionTextarea.tsx`
- Remove `disabled={elements.length === 0}` from the `PopoverTrigger` button (keep the visual affordance the same).
- Keep the `handleChange` auto-trigger gated on `elements.length > 0` so typing `@` on an empty scene does not auto-open the picker — only the explicit pill click opens it.
- In `PopoverContent`, branch on `elements.length`:
  - If 0: render empty-state block with icon, two lines of copy, and a CTA button that calls `insertMention(1)` (works because `insertMention` doesn't validate the index against `elements`).
  - If >0: render existing list.
- Keep popover width `w-[min(20rem,calc(100vw-2rem))]`.

`src/i18n/translations/en.ts` & `ar.ts`
- Add three keys under `scene.*`:
  - `scene.mentionEmptyTitle` — "No elements yet" / "لا توجد عناصر بعد"
  - `scene.mentionEmptyHint` — "Run scene analysis to detect elements, or insert a placeholder to start writing." / Arabic equivalent
  - `scene.mentionEmptyCta` — "Insert @1 placeholder" / "أدرج العنصر @1"

### Files touched

- `src/components/SceneMentionTextarea.tsx`
- `src/i18n/translations/en.ts`
- `src/i18n/translations/ar.ts`

### Out of scope
- Triggering scene analysis from the popover.
- Changes to `MentionTextarea` (shots flow).
- Auto Move/Lock logic, breakdown parsing, or generation flow.

