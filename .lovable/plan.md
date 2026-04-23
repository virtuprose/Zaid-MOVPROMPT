

## Guided tour for new users + a Learn / Guide Book hub

Two pieces, one cohesive onboarding system:

1. **Interactive product tour** — first-time spotlight walkthrough on the main app.
2. **Learn page (`/learn`)** — durable in-app guide book with detailed sections, examples, and pro tips, reachable from the user menu and from the tour's "Finish" step.

Both EN + AR (RTL), dark cinematic theme, no new dependencies (custom lightweight tour — avoids 30KB+ from `react-joyride` / `driver.js` and gives us full control over RTL + theme).

---

### Part 1 — Guided tour (first-time spotlight)

**Behavior**
- Auto-starts once for newly signed-in users right after the existing `WelcomePopup` closes (chained, so they don't fight for the screen).
- Persisted as `movprompt.tour.v1.done` in `localStorage` (per user id) + a Supabase column would be overkill — `localStorage` matches the existing onboarding-seen pattern.
- Re-launchable any time from the user dropdown → **"Take the tour"** and from the Learn page.
- Skippable at any step. Keyboard: `Esc` to skip, `→ / ←` to navigate, `Enter` to advance. RTL mirrors arrow keys.

**Steps (6 total, anchored to existing UI)**

| # | Anchor (`data-tour` attr) | Message |
|---|--------------------------|---------|
| 1 | `model-picker` | "Start by picking the AI video model you'll use. The prompt is tailored to that model's strengths." |
| 2 | `image-upload` | "Drop a still image — single frame, two frames for transitions, or one concept for multi-shot." |
| 3 | `describe-textarea` | "Optionally describe the vibe. Type `@` to mention scene elements once analyzed." |
| 4 | `analyze-button` | "Analyze breaks the scene into elements you can lock or move individually." |
| 5 | `generate-button` | "Generate the cinematic prompt. Results appear above the breakdown for quick review." |
| 6 | `library-link` (top bar) | "Every prompt is saved to your Library. Open Learn anytime from your profile menu for examples & pro tips." |

**Visual**
- Dimmed page overlay (semi-transparent `bg-background/80 backdrop-blur-sm`), a cut-out around the anchored element using a fixed positioned ring (`ring-2 ring-primary shadow-[0_0_0_9999px_rgba(10,10,15,0.7)]`).
- Floating tooltip card (Card component) with: step counter (`2 / 6`), title, body, **Skip** / **Back** / **Next** buttons; **Finish** on last step opens `/learn` in a new tab and marks done.
- Auto-scrolls anchor into view; if anchor missing (e.g. user changed phase), the tour gracefully advances.

**Files (new)**
- `src/components/tour/TourProvider.tsx` — context, state machine, `useTour()` hook, localStorage persistence, anchor lookup via `document.querySelector('[data-tour="..."]')`.
- `src/components/tour/TourOverlay.tsx` — overlay + spotlight + tooltip card with framer-motion fade.
- `src/components/tour/tourSteps.ts` — step definitions (id, anchor, title key, body key, placement: top/bottom/left/right, fallback behavior).

**Files (edited)**
- `src/App.tsx` — wrap `AppRoutes` with `<TourProvider>`.
- `src/pages/Index.tsx` — add user-menu items: **"Take the tour"**, **"Learn / Guide"**; mount `<TourOverlay />`; auto-start logic chained after `WelcomePopup` closes (small event/flag `movprompt.welcomeDismissed`).
- `src/components/ModelPicker.tsx` — add `data-tour="model-picker"` on root.
- `src/components/ImageUploadZone.tsx` — `data-tour="image-upload"`.
- `src/components/MentionTextarea.tsx` (or its WorkflowPanel wrapper) — `data-tour="describe-textarea"`.
- `src/components/WorkflowPanel.tsx` — `data-tour="analyze-button"` on Analyze, `data-tour="generate-button"` on Generate.
- `src/pages/Index.tsx` (top bar Library button) — `data-tour="library-link"`.
- `src/i18n/translations/en.ts` + `ar.ts` — `tour.step1.title`/`.body` … `tour.step6.title`/`.body`, `tour.next`, `tour.back`, `tour.skip`, `tour.finish`, `tour.stepOf`, `tour.takeTour`.

---

### Part 2 — Learn page (`/learn`)

A standalone page acting as the durable guide book users return to.

**Layout** (mirrors `Library.tsx` structure: header bar with back arrow + LanguageToggle, container max-w-3xl, dark theme, RTL aware)

```
┌──────────────────────────────────────────────┐
│  ← Back · MovPrompt · Learn        [EN/AR]   │
├──────────────────────────────────────────────┤
│  Hero: "Master MovPrompt" + "Take the tour"  │
│  + "Watch 2-min video" (optional placeholder)│
├──────────────────────────────────────────────┤
│  Sticky TOC (left on desktop, top on mobile) │
│  ─ Getting started                            │
│  ─ Workflows (Single / Two-frame / Multi)    │
│  ─ Picking the right model                   │
│  ─ Scene analysis & element locking          │
│  ─ Writing better descriptions (@mentions)   │
│  ─ Reference media & presets                 │
│  ─ Examples gallery                           │
│  ─ Pro tips                                   │
│  ─ FAQ / Troubleshooting                      │
├──────────────────────────────────────────────┤
│  Sectioned content (Accordion + Card mix)    │
│  Each section: short paragraph + bullet      │
│  list + 1-2 example screenshots/prompts +    │
│  a "Try this" CTA that deep-links to `/`     │
└──────────────────────────────────────────────┘
```

**Content (all i18n keys, EN + AR)**
- **Getting started** — 3-step quick start, links to "Take the tour".
- **Workflows** — when to use each, with the 3 example thumbnails reused from `OnboardingExamples.tsx`.
- **Picking the model** — short table: Kling / Veo / Seedance / Any-Model with strengths + best use case (sourced from `src/lib/models.ts` labels).
- **Scene analysis & element locking** — explains Move/Lock badges, the reset behavior, why review hint exists.
- **Writing better descriptions** — `@element` mentions, tone keywords, common pitfalls.
- **Reference media & presets** — how presets influence the prompt, when to add reference images.
- **Examples gallery** — 3-6 before/after cards: input image + final prompt block + suggested model. Static seed; copy-prompt button.
- **Pro tips** — 6-8 punchy bullets (e.g., "Lock the subject for cleaner camera moves", "Two-frame works best when start/end share lighting", "For Seedance 2.0 use one detailed prompt, not multi-shot — model handles cuts internally").
- **FAQ** — Accordion: Why duplicates? Why no audio? Where are saved prompts? How do I reset onboarding?

**Files (new)**
- `src/pages/Learn.tsx` — page shell, TOC, scroll-spy.
- `src/components/learn/LearnSection.tsx` — reusable titled section.
- `src/components/learn/ExampleCard.tsx` — image + prompt + copy button.
- `src/components/learn/learnContent.ts` — structured content keys (so EN + AR stay in sync; references i18n keys, not raw strings).

**Files (edited)**
- `src/App.tsx` — add `<Route path="/learn" element={<Learn />} />` (public; no AuthGuard so users can share link).
- `src/pages/Index.tsx` — user dropdown gets a **Learn / Guide** item (BookOpen icon) above Sign Out; also a small **"New here? Take the tour"** ghost link in the top bar shown only when tour not yet completed.
- `src/i18n/translations/en.ts` + `ar.ts` — `learn.*` keys for every section title, paragraph, bullet, FAQ Q&A, and CTAs.

---

### Technical notes

- **No new npm packages.** Tour is ~150 lines using existing `framer-motion` + `lucide-react` + Tailwind. Spotlight uses a single `position: fixed` ring + huge box-shadow trick (no SVG mask needed).
- **Anchor resolver** runs on each step: if the target isn't in the DOM (e.g., user is mid-flow), we either auto-advance or pause the tour with a "Continue" button — never a stuck state.
- **RTL**: tooltip placement flips left↔right automatically when `document.dir === "rtl"`. Arrow-key navigation also mirrors.
- **Accessibility**: tooltip card is a `role="dialog"` with focus trap, `aria-labelledby`, and Escape to close.
- **Analytics**: emit `tour_started`, `tour_step_<n>`, `tour_completed`, `tour_skipped`, `learn_section_view` via existing `trackPageVisit` / a tiny `trackEvent` extension if not present (will reuse `trackPageVisit("/learn")`).
- **Persistence keys**:
  - `movprompt.tour.v1.done.<userId>` — completed once.
  - `movprompt.welcomeDismissed` — short-lived signal so tour waits for welcome popup.

### Out of scope

- No video recording / Loom embed (placeholder slot only — easy to fill later).
- No CMS-driven Learn content (admins can edit translations; full CMS later if needed).
- No tour for the Admin/Library/Auth pages (focused on the main creation flow).
- No payments/subscription-gated content.

### Verification

1. Brand-new account → WelcomePopup → on close, tour starts at step 1 and walks through all 6 steps.
2. Skip mid-tour → tour closes, `done` flag set, never auto-starts again.
3. User menu → **Take the tour** re-runs it any time.
4. User menu → **Learn / Guide** opens `/learn`; TOC scroll-spy highlights active section.
5. Arabic toggle on `/learn` and during tour → layout mirrors, arrow keys mirror, no overflow.
6. Mobile (360px) → tour tooltip stays within viewport, scrolls anchor into view; Learn TOC collapses to a sticky select at top.
7. Refresh during tour → tour does not auto-resume (we only persist completion, not partial state) — user can re-trigger from menu.

