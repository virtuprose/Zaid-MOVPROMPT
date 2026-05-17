# Hide the description textarea after a preset is chosen

Once the user selects a Format preset, the preset already describes what happens in the ad — no need to ask them to type it again. The composer collapses to just the attachments (Product, Avatar, Location) plus the bottom chip row.

## Change in `src/pages/MarketingStudio.tsx`

In the composer card (around lines 648–666), wrap the `<Textarea>` block in a condition:

- **Show** the textarea only when **no Format preset is selected** (i.e. `!format`). This keeps the free-write path for users who skip presets and want to describe their own scene.
- **Hide** the textarea entirely as soon as `format` is set (preset picked). The composer now shows:
  - Top row: Product slot + Avatar slot (unchanged)
  - Bottom row: Format chip (showing picked preset), Location chip, Render chip, Generate

Detaching the format (clicking the chip and clearing it) brings the textarea back automatically.

## Prompt generation

No change. `composeStudioPrompt` already uses the preset's fragment when `formatId` is set, and `master` (textarea text) is appended as `Story:` only when non-empty — so an empty master with a preset selected is already the intended path.

## Out of scope

- Product / Avatar / Location pickers and chips — untouched.
- Bottom chip row, Generate button, render settings — untouched.
- No DB or edge function changes.
