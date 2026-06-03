
# Director Activity Feed — Build Plan

A transparent, live stream of every step the Director takes (thinking, searching, loading skills, mining free-chat, generating reference images, picking model, generating prompt), styled like the Higgsfield Orchestrator panel.

I recommend **building it in 3 phases**, shipping each as a working slice rather than one giant change. You'll see results after phase 1.

---

## Phase 1 — Visual feed using events we already emit (fastest win)

Goal: stop showing only the final card. Render every Director tool-call as a row in a live feed, above the existing `QuestionCard`.

- New component: `src/components/director/DirectorActivityFeed.tsx`
  - Rows: `{ id, kind, label, status, detail? }`
  - Icon by `kind`: thinking, skill, mining, reference, model, prompt, error
  - Status colors: running = cyan pulse, done = muted check, failed = amber triangle
  - Expandable `›` for `thinking` and `skills` rows
  - Rotating status caption pinned at the bottom ("Reading the brief → Picking the look → Painting the frame")
- Wire it into `src/components/director/DirectorChat.tsx` above the current question card.
- Source events: reuse the tool-call stream already coming back from `director-agent` (`ask_clarification`, `generate_reference_image`, `ask_model_choice`, `generate_prompt`, skill loads, axis pre-flight). No backend changes.
- Style: dark cinematic theme, 13px, `text-muted-foreground`, tiny lucide icons.

Deliverable: visible feed of real steps for every brief, no backend work.

---

## Phase 2 — Backend `step` SSE stream (intermediate + failed steps)

Goal: surface the steps the frontend can't currently see (thinking phases, free-chat mining, axis pre-flight, retries, soft failures).

- In `supabase/functions/director-agent/index.ts`, wrap each phase and emit SSE events:
  ```
  event: step
  data: { id, kind, label, status: 'running'|'done'|'failed', detail? }
  ```
- Phases to instrument:
  - `reading_brief`, `mining_free_chat`, `axis_preflight`, `loading_skill:<id>`, `thinking`, `generating_reference_image`, `picking_model`, `generating_prompt`
- Frontend: extend `src/lib/director/api.ts` SSE parser to forward `step` events to `DirectorActivityFeed`.
- Failed steps render as amber warnings inline, non-blocking (Director keeps going).

Deliverable: full transparency, including silent retries and failures.

---

## Phase 3 — Polish & parity touches

- Rotating phase caption driven by current `kind` (with MovPrompt logo chip).
- Collapse/expand the whole feed (sticky header with step count + elapsed time).
- Persist the feed alongside `director_sessions.messages` so reopening a task shows the historical run.
- Keyboard: `Esc` collapses, `↑/↓` jumps between steps.

Deliverable: production-grade feel matching the reference video.

---

## Explicit non-goals
- No "credits" row in the feed (we already have `CreditBadge`).
- No "Soul references" naming — we keep our own labels.
- No business-logic changes to the Director itself; this is presentation + an extra event channel.

---

## Recommended order
Ship **Phase 1 first** (1 file added, 1 file touched) so you can see the feed today against real briefs. Then decide whether Phase 2's backend instrumentation is worth it before doing Phase 3 polish.

Want me to start with **Phase 1 only**, or queue **Phase 1 + 2** back-to-back?
