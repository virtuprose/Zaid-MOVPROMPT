
## Plan — Offer Single / Start+End / Multi-shot for Any Model

When the user picks **Any Model (Universal Prompt)**, show the same 3-way workflow toggle already used by Kling 3.0: **Single Frame | Start + End | Multi-shot**. Today, "Any" falls through to the default `STD` contract, so no toggle appears and the user is locked into a single-frame workflow.

### Behavior per mode (when model = `any`)

| Mode | Slots | Workflow sent to backend | Description |
|---|---|---|---|
| Single Frame | 1 upload | `single` | Universal cinematic prompt for one still. |
| Start + End | 2 uploads (Start / End) | `twoframe` | Interpolation prompt between two frames. |
| Multi-shot | 1 concept image | `multishot`, `multiShotCount = 10` | Ten varied shot descriptions (wide, MCU, OTS, etc.). |

In every mode, the generic agent still emits the **Director's Pick** recommendation at the top of the result. The recommendation rubric already accounts for multi-cut scenes (→ Seedance Pro) and transitions (→ Kling 3.0); no rubric changes needed.

### Technical change — single file

**`src/lib/modelContracts.ts`** — add an explicit branch for `model === "any"` at the top of `getContract`:

```ts
if (model === "any") {
  return {
    slots: 1,
    slotLabels: ["contract.slot.reference"],
    supportsTwoFrameToggle: true,
    supportsMultiShotToggle: true,
    multiShotCount: 10,
    extrasHintKey: "contract.hint.anyModel",
    workflowType: "single",
  };
}
```

Because `WorkflowPanel` already renders the 3-way toggle whenever **both** `supportsTwoFrameToggle` and `supportsMultiShotToggle` are true, flipping those flags on for `any` is all that's needed — the UI, the `deriveWorkflowType` helper, slot labels (`frame.start` / `frame.end` / `frame.concept`), and the backend payload (`workflowType` + `multiShotCount`) all light up automatically.

### Translation

Add one new key for the hint strip that appears above the toggle:

- `contract.hint.anyModel` — EN: *"Any Model picks the best specialist for your scene. Choose a workflow: a single shot, a start→end transition, or a 10-shot storyboard."* ; AR equivalent.

Files: `src/i18n/translations/en.ts`, `src/i18n/translations/ar.ts`.

### Out of scope

- No backend change. `generate-prompt/index.ts` already handles `single`, `twoframe`, and `multishot` for any target model (including `any-model`), and the generic agent's system prompt already documents all three workflow shapes.
- No change to the Director's Pick logic — it fires on `any-model` regardless of workflow type.
- No change to other models.

### Verification

- Select **Any Model** → hint strip shows; 3-way toggle appears with Single / Start+End / Multi-shot.
- **Start + End**: two upload slots labelled *Start Frame* / *End Frame*; Generate produces a transition prompt.
- **Multi-shot**: one concept slot; Generate returns 10 shot cards.
- Director's Pick strip appears on the first shot in all three modes.
- Switch to any non-`any` model → old behavior unchanged (no hint, native toggle set per model).
- Verify layout + RTL in Arabic.
