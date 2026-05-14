## Goal
Add a 7-step first-run onboarding flow at `/onboarding` that runs once per user after signup, then never again.

## Persistence
- Track completion in `localStorage` per user (`movprompt.onboarding.done.<userId>`), mirroring the existing `TourProvider` pattern. No DB schema change required for v1 (keeps scope tight; can promote to a `profiles.onboarding_complete` column later if needed).
- After signup in `src/pages/Auth.tsx`, redirect new users to `/onboarding` instead of `/`. Existing users continue to `/`.

## Routing
- New route in `src/App.tsx`: `<Route path="/onboarding" element={<AuthGuard><Onboarding /></AuthGuard>} />`
- New page: `src/pages/Onboarding.tsx` — a single full-screen container that renders the active step. Header shows step pills (1–7) + "Skip" link top-right (skip jumps to STEP 7 quick-tips on top of `/`).

## Step components (in `src/components/onboarding/`)
1. `StepWelcome.tsx` — Heading "Welcome to MovPrompt, {first name}", sub copy, amber primary CTA "Let's go →". Subtle Framer fade/slide.
2. `StepStarterImage.tsx` — 6 curated cinematic stills in a responsive grid (3×2 desktop, 2×3 mobile) sourced from `src/assets/onboarding/starter-*.jpg` (generated via imagegen). Each tile selectable; "Upload your own" tile triggers file picker. Selection stored in onboarding context.
3. `StepWorkflow.tsx` — 3 large cards (single, twoframe, multishot) each playing a 5s muted autoplay loop on hover/in-view (reuse existing `loop-*.mp4` assets where applicable; add a small "Most people start with Single shot" badge on card 1).
4. `StepModel.tsx` — Reuse existing `ModelPicker` component pre-set to `any`. Helper text "Don't worry, you can change this anytime."
5. `StepGenerating.tsx` — Calls existing `analyze-scene` + `generate-prompt` edge functions with the chosen image/model/workflow. Shows existing skeleton + a rotating cinematography facts strip (10 short facts hardcoded in the file).
6. `StepReveal.tsx` — Shows the generated prompt in a styled card, runs a 1s sparkle/confetti micro-animation (Framer Motion stagger of small SVG sparkles — no extra package). Primary CTA "Copy & open in Seedance", secondary "Save to library" (auto-saves on mount via existing prompt_history insert path).
7. `StepQuickTips.tsx` — Spotlight overlay with 4 tips (text + icon, no actual element targeting needed for v1; just a centered modal carousel). "Got it" finalizes, sets the localStorage flag, navigates to `/`.

## Onboarding context
- `src/components/onboarding/OnboardingContext.tsx` — local React context holding `{ step, image, workflow, model, result }` and `next/prev/skip/complete` helpers. Lives only inside the `/onboarding` page tree.

## Reused infrastructure
- `useAuth` for the user (display name, id).
- `WorkflowPanel`'s underlying generation calls — extract the minimum logic into `src/lib/onboardingGenerate.ts` (a thin wrapper that posts the file + chosen model to `analyze-scene` then `generate-prompt`, returning the first prompt). No changes to existing components.
- `ModelPicker` for STEP 4.
- Existing `loop-*.mp4` cards for STEP 3 previews.

## Auto-redirect logic
- `RootRoute` in `src/App.tsx`: when user is signed in AND onboarding flag is missing AND not currently on `/onboarding` or `/auth`, redirect to `/onboarding`. Keep this behind a one-shot check so returning users with the flag never see it.

## Assets to generate
- 6 cinematic still JPEGs in `src/assets/onboarding/` (Tokyo neon street, desert dune, Rembrandt portrait, kitchen scene, underwater diver, cyberpunk rooftop) — fast tier, 1024×640.

## Out of scope (v1)
- No DB column for `onboarding_complete` — localStorage is enough and avoids a migration. Easy upgrade later.
- No translation strings yet (English copy hardcoded; can be moved to `i18n/translations/en.ts` in a follow-up).
- Quick-tips spotlight does not target real DOM nodes — it's a centered carousel. True element-targeted spotlight can reuse the existing `TourOverlay` later.

## Files to add
- `src/pages/Onboarding.tsx`
- `src/components/onboarding/OnboardingContext.tsx`
- `src/components/onboarding/StepWelcome.tsx`
- `src/components/onboarding/StepStarterImage.tsx`
- `src/components/onboarding/StepWorkflow.tsx`
- `src/components/onboarding/StepModel.tsx`
- `src/components/onboarding/StepGenerating.tsx`
- `src/components/onboarding/StepReveal.tsx`
- `src/components/onboarding/StepQuickTips.tsx`
- `src/components/onboarding/Sparkles.tsx`
- `src/lib/onboardingGenerate.ts`
- `src/assets/onboarding/starter-{1..6}.jpg`

## Files to edit
- `src/App.tsx` — add route + redirect logic in `RootRoute`.
- `src/pages/Auth.tsx` — after successful signup, set a session flag so `RootRoute` sends them to `/onboarding`.
