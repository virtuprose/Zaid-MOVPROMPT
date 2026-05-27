# Harmonize the three tools — one ecosystem, three doors

Today MovPrompt (prompt builder), AI Director (chat brief → cinematic prompt), and Marketing Studio (ad/commercial videos) work as **separate islands**. The user pastes/copies between them. The goal: make each tool naturally **hand the user off** to the next step, carrying the full context (prompt + image refs + aspect + duration + suggested model) so nothing is retyped.

---

## The mental model

Think of it as one funnel with three roles:

```text
   ┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
   │  MovPrompt  │ →   │ AI Director  │ →   │  Video Render   │
   │  (Writer)   │     │ (Producer)   │     │  (Camera)       │
   └─────────────┘     └──────────────┘     └─────────────────┘
          ↑                   ↑
   ┌──────┴───────┐     ┌─────┴────────┐
   │  Ads Studio  │ ──→ │ AI Director  │
   │ (Strategist) │     │ for shotlist │
   └──────────────┘     └──────────────┘
```

- **MovPrompt** is the fastest entry: image(s) + a sentence → a polished text prompt.
- **AI Director** is the conversational producer: reviews the brief, locks model/aspect/duration, then triggers render.
- **Marketing Studio** is the strategist for ads: brand + product + character → scene plan, which then flows into Director for the actual generation.

Every tool should end with **one obvious "next step" button** instead of dead-ending on a copied prompt.

---

## Three handoff bridges to build

### Bridge 1 — MovPrompt → AI Director ("Generate with Director")

After the prompt is generated in `ResultsPanel`, add a primary CTA below the prompt card:

> **🎬 Generate video with AI Director**
> *Send this prompt + your images to the Director and confirm settings before render.*

Click → navigate to `/director` with a **prefilled session** containing:
- The final prompt text (as the first user message body)
- Uploaded reference images (as attachments)
- Selected model, aspect ratio, duration (as session preferences)
- A system-injected first Director message: *"I have your prompt and references ready. Aspect **16:9**, duration **5s**, model **Veo 3 Fast**. Shall I generate now, or do you want to change the model or shot before we render?"*

The Director then only needs a **yes/confirm** click → triggers `generate-video`. If the user wants to swap model, an inline model picker chip appears in the Director composer.

### Bridge 2 — Marketing Studio → AI Director ("Plan with Director")

In Marketing Studio, when the user is shaping an ad and asks something open-ended (e.g. "make this more cinematic", "I want a 3-shot story"), surface a CTA:

> **🎬 Continue with AI Director**

This bundles brand kit + character kit + product + ad copy + reference frames into a Director session, opens `/director`, and the Director's first message is: *"Here's the ad brief from Marketing Studio. I'll storyboard 3 shots — confirm the model and aspect, and I'll render."*

### Bridge 3 — AI Director → Marketing Studio (when ad intent is detected)

When the Director detects ad/commercial intent in the user's brief (keywords: ad, commercial, product, brand, campaign, launch), it suggests in chat:

> *"This looks like an ad. Want me to pull in your brand kit and product details from Marketing Studio first? That gives me logo, colors, and product facts to lock the look."*
> **[ Yes, open Studio ]   [ No, keep going ]**

"Yes" opens Studio in a modal/slideover or routes to `/marketing` with the Director session attached, so when the user finishes the brand/product step, **Bridge 2** carries them back into the same Director session.

---

## What the user sees

| Where | New element | Behaviour |
|---|---|---|
| `ResultsPanel` (after prompt generated) | Primary CTA **"Generate with AI Director"** beneath the copy/share row | Navigates to `/director?from=movprompt` with prefilled session |
| AI Director (when session prefilled) | One-tap **"Render now"** confirmation card as Director's first message | Skips the brief-gathering chat — goes straight to confirm |
| AI Director (when ad intent detected) | Inline suggestion chip: *"Pull from Marketing Studio?"* | Opens Studio in slideover or `/marketing` |
| Marketing Studio (after scene/ad shaped) | CTA **"Continue with AI Director"** in the bottom action bar | Navigates to `/director?from=marketing` with full ad context |
| Top nav | Subtle **"Workflow"** breadcrumb on each tool ("Step 1 of 3 · MovPrompt → Director → Render") | Reinforces ecosystem feel |

---

## Technical notes (for the implementation step)

- **Handoff payload format** — single shape stored briefly in `sessionStorage` under key `director_handoff_v1`:
  ```ts
  type Handoff = {
    source: "movprompt" | "marketing";
    prompt: string;
    references: Array<{ url: string; kind: "image" | "video_keyframes" }>;
    settings: { model?: string; aspect?: string; duration?: number };
    brandKitId?: string;
    characterKitId?: string;
    productFactsId?: string;
    autoConfirmCard: boolean; // if true, Director skips chat and shows render confirm
  };
  ```
- **Director session bootstrap** — `DirectorChat` reads `sessionStorage.director_handoff_v1` on mount; if present, it creates a new `director_sessions` row with the prompt as the first user message and a synthetic assistant "render-confirm card" message, then clears the key.
- **Render-confirm card** — new compact assistant message variant in `src/components/director/` that shows: prompt preview · reference thumbs · model · aspect · duration · **Render** button · **Change model** popover. Reuses existing `submitVideoJob` from `src/lib/director/api.ts`.
- **Ad-intent detection** — small heuristic in `src/lib/director/questionIntent.ts` (or new sibling) that flags messages with ad keywords; on first match the Director emits the "Pull from Marketing Studio?" suggestion chip.
- **Marketing → Director payload** — Studio's "Continue with AI Director" button assembles brand/character/product context (already available in `lib/marketing/*`) into the same `Handoff` shape.
- **No backend changes required** for bridges 1 & 2 — pure client-side handoff. Bridge 3 (ad-intent → Studio) also stays client-side. Existing `director_sessions`, `generate-video`, and Marketing tables are unchanged.

---

## Scope boundaries

- **In scope:** the three CTA bridges, the prefilled Director session, the render-confirm card, ad-intent suggestion chip.
- **Out of scope (this round):** rewriting any tool's core UI, changing pricing/credits flow, adding new video models, changing aspect/duration logic, modifying the cinema console redesign we just finished.

---

## Questions before I build

1. **Bridge 1 confirm card** — when the user lands in Director from MovPrompt, should it be a **one-tap "Render now"** (fully skip the chat) or always **one Director question first** ("Want me to tighten the prompt or render as-is?")? I lean toward the second — keeps the Director's value proposition visible.
2. **Bridge 3 (ad detection in Director)** — auto-suggest Studio, or only suggest when the user explicitly types "ad/commercial"? Auto-suggest is more "ecosystem", but can feel pushy.
3. **Marketing Studio handoff trigger** — should the "Continue with AI Director" button appear **always** at the bottom of Studio, or only **after** the user has filled brand + product?
