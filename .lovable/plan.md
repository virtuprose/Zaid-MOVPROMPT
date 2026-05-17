# Remove the description textarea entirely

The flow is preset-driven: user picks a Format preset, attaches Product/Avatar/Location, hits Generate. No free-write textarea anywhere.

## Change in `src/pages/MarketingStudio.tsx`

1. **Delete** the entire `{!format && (<div className="relative"><Textarea …/>…</div>)}` block in the composer card (currently lines 648–668).
2. **Delete** the `master` state field's UI surface — keep the state variable itself for now since `composeStudioPrompt` reads it (it just stays empty, which `composeStudioPrompt` already handles by skipping the `Story:` line).
3. **Update** `hasInputs` / Generate gating so the button enables on **preset OR attachments** instead of requiring `master` text. Specifically, treat the composer as ready when any of: `formatId`, `customFormat`, `settingId`, `customSetting`, `location.place`, `location.imagePath`, `brandKit`, `characterKit` is set.
4. **Remove** the `drafting` "Drafting…" inline indicator (it lived inside the textarea wrapper). If `drafting` is still used elsewhere (auto-draft into `master`), leave the state but drop the visual since there's no textarea to fill anymore.

## Composer card after change

```text
┌─ Composer card ──────────────────────────────────┐
│  [+ Product]  [+ Avatar]                         │
│  ──────────────────────────────────────────     │
│  [Format] [Location] [Render]      [Generate]   │
└──────────────────────────────────────────────────┘
```

## Out of scope

- `composeStudioPrompt`, edge functions, DB — unchanged.
- Picker popovers, render settings, gallery — unchanged.
- `master` state stays defined so any auto-draft logic keeps compiling; we just stop rendering an input for it.
