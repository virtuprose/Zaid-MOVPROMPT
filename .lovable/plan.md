## Goal
Remove the guided product tour (the "Take the tour" option and the auto-started step overlay for new users) from the app.

## Changes

1. **`src/App.tsx`** — Remove `TourProvider` import and stop wrapping routes in it.
2. **`src/pages/Index.tsx`** — Remove `TourOverlay`, `useTour`, the `startTour` effect, and the `<TourOverlay />` render. New users will no longer see the tour auto-start.
3. **`src/components/TopNav.tsx`** — Remove the `useTour` import/hook usage and delete the "Take the tour" menu item (and its "new" highlight).
4. **`src/pages/Learn.tsx`** — Remove the `startTour` handler and the two "Take the tour" buttons on the Learn page.
5. **Delete tour files**:
   - `src/components/tour/TourProvider.tsx`
   - `src/components/tour/TourOverlay.tsx`
   - `src/components/tour/tourSteps.ts`
6. **i18n** — Leave the `tour.*` and `learn.takeTour` translation keys in `en.ts`/`ar.ts` in place (harmless, unused). Skip unless you want them cleaned too.

## Out of scope
The onboarding flow at `/onboarding` (StepWelcome, StepModel, etc.) is a separate first-run setup, not the tour — it stays untouched. Let me know if you want that removed too.