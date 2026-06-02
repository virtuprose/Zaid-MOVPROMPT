# Director → Orchestrator: evolution sketch

A staged path from today's single-shot Director ("brief → one prompt → one model") to an orchestrator ("brief → plan → route each step to the best model → assemble → deliver"), without copying Hermes wholesale. Each stage ships value on its own.

## Where we are today

```text
user brief ──▶ Director (single agent) ──▶ one cinematic prompt ──▶ one video model ──▶ one clip
```

What already smells orchestrator-shaped in the codebase:

- `generate-prompt/experts/registry.ts` — per-model expert agents (Kling, Seedance, Veo, generic). Model-specialist routing already exists at prompt-craft level.
- `lib/director/modelRanking.ts` + `generic.ts` `recommendedModel` rubric — we already score "best model for this shot".
- Free Chat → Director handoff (`.lovable/plan.md`) — a lightweight two-phase pattern (brainstorm → locked spec) is already in place.
- `lib/director/tasteProfile.ts`, brand kits, character kits — memory primitives, just not unified.
- `story-bundle` / `story-render` / `story-stitch` edge functions — multi-shot rendering scaffolding exists.

So the gap to "orchestrator" is smaller than it looks: we have the parts, they aren't yet stitched into a single planning loop.

## Target shape

```text
                       ┌──────────────────────────────────────┐
brief + refs ──▶ PLAN ─┤ shot 1 → route → expert → model A   ├─▶ assemble ──▶ deliver
                       │ shot 2 → route → expert → model B   │   (stitch /
                       │ shot 3 → route → expert → model A   │    bundle /
                       │ …                                    │    export)
                       └──────────────────────────────────────┘
                                  ▲          ▲
                                  │          │
                              memory     cost/latency
                          (taste, brand,  budget policy
                           character,
                           project)
```

Key idea: the Director stops being "the thing that writes one prompt" and becomes "the thing that owns the plan and routes each step." Per-model experts stay — they become the workers the orchestrator calls.

## Staged rollout

### Stage 1 — Make the plan a first-class object (no new models needed)

Today the "plan" is implicit in chat markdown. Make it explicit.

- New type `DirectorPlan = { shots: PlannedShot[], globals: {...}, memoryRefs: {...} }` in `src/lib/director/`.
- `PlannedShot = { id, intent, locked: {duration, aspect, audio, model}, prompt?, status: 'draft'|'ready'|'rendering'|'done'|'failed', outputUrl? }`.
- Persist on `director_sessions` alongside messages. UI gains a collapsible "Plan" panel in `DirectorChat` showing the shot list with status chips.
- The existing pre-generation checklist (from `.lovable/plan.md`) now fills in `locked.*` per shot instead of per-session.

Ships: visible plan, per-shot status, foundation for everything below.

### Stage 2 — Per-shot model routing (turn `recommendedModel` into a real router)

- Extract a `routeShot(shot, budget, taste) → modelId` function from `generic.ts` + `modelRanking.ts`. Pure function, easy to test.
- Director proposes the routed model per shot; user can override (chip on each shot row).
- Add a `budget` axis to session settings: `quality | balanced | cheap` → biases routing toward Veo / mid-tier / Seedance-lite. Mirrors Hermes' "Orchestrator" layer without claiming parity.

Ships: "we pick the model, you don't choose" as a real differentiator, not just per-prompt advice.

### Stage 3 — Executor loop (one brain, many workers)

- New edge function `director-orchestrate` that, given a `DirectorPlan`:
  1. For each `ready` shot in parallel (bounded concurrency), calls the right expert agent in `generate-prompt/experts/` to craft the model-specific prompt.
  2. Invokes `generate-video` with the routed model.
  3. Streams per-shot status back via existing realtime channel.
- Failures route to a retry policy (re-route to fallback model after N fails) — kept simple, no agent loop here.
- `story-bundle` / `story-stitch` become the assembly step at the end.

Ships: one click on a multi-shot plan produces a finished cut. This is the moment Director feels like an orchestrator, not a prompt builder.

### Stage 4 — Unify memory

Three existing stores get a single read API:

- `tasteProfile.ts` (project/user style)
- brand kits (`lib/marketing/brandKit.ts`)
- character kits (`lib/marketing/characterKit.ts`)

New `lib/director/memory.ts` exposes `loadMemoryFor(sessionId) → { taste, brands, characters, recentShots }` and is injected into every expert call + the router. No new storage; just a façade. This is what Hermes markets as "3 memory layers" — we already have the data.

### Stage 5 — Connectors (optional, only if users ask)

The Hermes "ship to Slack/Drive/Figma" angle. Not core to MovPrompt's wedge. Defer until a real user asks. If we do it, do one connector well (Drive export of the assembled cut) rather than a matrix.

## What we deliberately don't copy from Hermes

- **Telegram / browser-agnostic surface** — not our wedge.
- **40+ tools** — surface area trap; we'd dilute the "cinematic DP" identity.
- **"Whole team is one agent" branding** — MovPrompt is sharper as *AI Director of Photography*, not *AI everything*. The orchestrator is a capability, not the headline.
- **Multi-model LLM routing for the planner itself** — keep Director on `gemini-3.1-pro-preview` (per project memory) until we have evidence another model plans better.

## Risks / open questions

- **UX of an exposed plan**: shot tables can feel spreadsheety. Worth a design pass before shipping Stage 1 — could render as a vertical "storyboard rail" instead of a table.
- **Cost surprise**: a one-click multi-shot render can rack up credits fast. Need a confirm-with-estimated-cost step in Stage 3 (we already have `lib/credits/pricing.ts`).
- **When to plan vs. ask**: orchestrator must still respect the one-question-per-turn rule. Suggest: plan is drafted silently as soon as enough info exists; questions still come one at a time to fill `locked.*` gaps per shot.
- **Story mode overlap**: there's existing `story-*` infra. Stage 3 should reuse it, not parallel-build. Need a short spike to confirm shape fits.

## Suggested first PR (if you green-light Stage 1)

1. Add `DirectorPlan` types + persistence column on `director_sessions`.
2. Render a read-only Plan panel in `DirectorChat` populated from current session state (no behavior change yet).
3. Migrate the pre-generation checklist to write into `plan.shots[0].locked` for single-shot sessions.

Small, reversible, and unblocks Stages 2–4.