## Goal

The "New brand" / "Edit brand" panel currently slides in from the right side of the screen. Make it appear as a centered popup instead.

## Where it lives

`src/components/marketing/BrandKitSheet.tsx` — uses shadcn's `Sheet` component, which renders a side-anchored panel (right by default). Triggered from the brand picker on `/marketing`.

## Change

Swap the `Sheet` shell for a centered `Dialog`:

- Replace `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription` with `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription` (from `@/components/ui/dialog`).
- Container sizing: `max-w-md` (or `max-w-lg`) centered, `max-h-[85vh]` with internal scroll so the long form still fits.
- Keep all existing props, state, form fields, and submit logic untouched — only the wrapper changes.
- Optional rename of the file/component to `BrandKitDialog` for clarity, with re-export shim so existing imports (`MarketingStudio.tsx`) keep working. Default: keep the name `BrandKitSheet` to minimize churn.

## Out of scope

- No changes to the brand picker trigger, brand list, or save logic.
- No visual redesign of the form fields themselves.
