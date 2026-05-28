## Remove the "Try an example" examples row

Delete the circled row (Neon Tokyo alley / Desert at golden hour / Rainy window portrait thumbnails plus the "Try an example →" label) from Step 1 — Upload, on all viewports.

### Changes

- **`src/components/WorkflowPanel.tsx`** — Remove the JSX block that renders the "Try an example" header and the 3 example thumbnails (the `OnboardingExamples` / inline examples grid sitting between the workflow tabs and the "Pick your target AI model" card). Keep the descriptive subtitle ("Upload any still image…") so the section still reads cleanly, or remove it too if it feels orphaned — confirm during implementation.
- Remove now-unused imports (example thumbnail assets, `OnboardingExamples` component import if it's only used here).

### Out of scope

- No backend, copy, or workflow changes.
- The "Try an example" feature elsewhere (onboarding flow) is untouched.
- Desktop/tablet/mobile all get the same removal.
