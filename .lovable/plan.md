## Problem

When you click **Generate**, nothing visibly happens — even though a loading skeleton already exists in the code. Two reasons:

1. **No auto-scroll on loading start.** The page only auto-scrolls to the results area *after* results arrive. While generating, the skeleton renders below the fold and you never see it.
2. **The current skeleton is plain.** A thin progress bar + one rotating line of text doesn't feel like "something is happening" — especially for a 10–30s wait.

## Solution

### 1. Scroll the skeleton into view the moment generation starts
Trigger the existing scroll-into-view behavior on `isLoading` becoming true (not just on `results` arriving), so the loading UI is immediately visible after clicking Generate.

### 2. Replace `ResultsSkeleton` with a cinematic "Director at work" loading experience
Keep the same component name and props (drop-in replacement) but make it feel alive and on-brand (dark cinematic, cyan/amber, Space Grotesk).

New elements, all stacked in the results area:

- **Film-strip / clapperboard header**
  - Animated clapperboard SVG icon that "claps" once every ~2s (subtle rotate of the top arm).
  - Headline: *"Your AI Director is on set…"* with a typing-cursor blink.

- **Progress bar — upgraded**
  - Same eased 0→90% curve, but with a moving cyan "scanline" highlight sweeping across it (gradient shimmer) so it never looks frozen even when paused near 90%.
  - Small percentage label on the right.

- **Director's checklist (the entertainment piece)**
  - A vertical list of 6–8 cinematic tasks, each revealed in sequence as the wait progresses. Each line animates from gray → cyan with a check icon when "completed":
    1. *Reading the scene…*
    2. *Blocking the subject…*
    3. *Setting up the key light…*
    4. *Choosing the lens (35mm? 85mm?)…*
    5. *Choreographing camera movement…*
    6. *Calling for {modelLabel}…*
    7. *Writing the shot list…*
    8. *Final polish on the prompt…*
  - Items advance on a timer (~1.6s each) and the last item keeps pulsing until results arrive — so even a long wait still feels like progress.

- **Rotating cinematography trivia card** (below the checklist)
  - A small muted card showing one of ~12 short film-craft facts, rotating every 4s. Examples:
    - *"Roger Deakins shot Blade Runner 2049 mostly with a single 21mm Master Prime."*
    - *"The 'golden hour' lasts about 40 minutes — and great DPs plan their day around it."*
    - *"A Dutch tilt is named after German Expressionist cinema, not the Netherlands."*
    - *"Kubrick used a NASA f/0.7 lens to shoot Barry Lyndon by candlelight."*
  - Purely decorative; gives users something to read instead of staring.

- **Existing card-shaped skeleton placeholders** stay below the trivia card so the spatial layout doesn't jump when real results replace it.

### 3. Copy & i18n
Add new translation keys for the checklist items and trivia (English + Arabic), under namespaces `loading.checklist.*` and `loading.trivia.*`. Existing `loading.step1–5` keys stay so nothing else breaks.

### 4. Quietly fix the auth-token "lock stolen" runtime warnings
Unrelated to this request but visible in runtime errors — caused by overlapping `getSession()` calls. Will dedupe the session calls in `useAuth` so the console stays clean.

## Files to touch

- `src/components/ResultsSkeleton.tsx` — rewrite with clapperboard, checklist, trivia, shimmer progress.
- `src/components/WorkflowPanel.tsx` — also auto-scroll `resultsRef` into view when `isLoading` flips true.
- `src/i18n/translations/en.ts` and `src/i18n/translations/ar.ts` — add `loading.checklist.*` and `loading.trivia.*` keys.
- `src/hooks/useAuth.ts` — small dedupe fix for the lock-stolen warning.

No backend, schema, or contract changes.

## Out of scope

- Showing real backend progress events (the edge function doesn't stream progress today; the timed checklist is the closest we can do without a streaming refactor).
- Changing how long generation actually takes.
