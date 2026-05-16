## Goal

When the user has selected a **brand** and/or an **avatar (character)**, treat those as the description input — so the "Describe what happens in the ad…" placeholder no longer pressures them to type. Typing remains optional.

## Change — single edit in `src/pages/MarketingStudio.tsx`

Make the textarea's placeholder conditional on what's already attached:

- **Brand + Avatar both selected** → placeholder becomes empty string (`""`). The textarea looks clean; user can still type to add direction if they want.
- **Only brand selected** → `"Add a note about the character (optional)"`
- **Only avatar selected** → `"Add a note about the product (optional)"`
- **Neither selected** → keep the current `"Describe what happens in the ad…"`

No business-logic changes — `master` still feeds into `composeStudioPrompt` exactly as today, and `brand` / `character` already flow into the prompt independently. The textarea just stops asking for a description when references already supply one.

## Out of scope

- No removal of the textarea itself (the user said "up to the user" to still type).
- No prompt-composition changes.
