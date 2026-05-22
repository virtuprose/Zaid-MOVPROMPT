
# How "Pick the format" works today

## 1. Where the data lives

File: `src/lib/marketingStudio.ts`

The catalog is an array called `FORMATS: StudioPreset[]`. Each entry has this shape:

```ts
type StudioPreset = {
  id: string;          // stable key, e.g. "hero-shot"
  label: string;       // shown on the card, e.g. "Hero Shot"
  description: string; // one-line subtitle on the card
  category?: string;   // filter tab: "commercial" | "ugc" | "avatar" | "animated"
  emoji?: string;      // fallback icon if no image
  image?: string;      // cover image URL (currently Unsplash)
  fragment: string;    // the actual prompt text injected into the AI
};
```

Today there are ~16 presets across 4 categories. The picker is currently filtered to **commercial only**, so the visible ones are:

| id | label | what its `fragment` adds to the prompt |
|---|---|---|
| hyper-motion | Speed Reveal | fast push-in, splash/particle FX, studio lighting |
| hero-shot | Hero Shot | pedestal, dramatic key light, slow rotating camera |
| demo | Demo | clean shots of the product performing its core action |
| lifestyle | Lifestyle | product woven into a styled daily routine, warm color |
| before-after | Before / After | split-screen wipe between two states |
| documentary | Documentary | observational handheld, voiceover, real moments |
| founder-talk | Founder Talk | founder direct-to-camera, sincere mid-shot |
| problem-solution | Problem → Solution | frustration beat → product solves it cleanly |

## 2. How the user picks one

Component: `src/components/marketing/PresetPickerDialog.tsx`, opened from `src/pages/MarketingStudio.tsx` (~line 921) as `<PresetPickerDialog open={openPicker === "format"} ...>`.

Flow:
1. User clicks the "Format" tile in the studio → dialog opens with the filtered `FORMATS`.
2. Cards render the `image` (or emoji fallback) + `label` + `description`.
3. User clicks a card → local `draftId` is set; "Done" commits it back to the parent as `brief.formatId`.
4. There's also a "+ Custom" card → writes free text into `brief.customFormat` instead of selecting an id.

## 3. How the pick becomes a video prompt

Composer: `composeStudioPrompt(brief)` in `marketingStudio.ts` (line 616).

It builds the final Seedance/Veo prompt as a stack of lines:

```
Cinematic 9:16 social ad, 5 seconds, native audio.
Subject: <product|app line>
<brand line(s) with @ImageN refs>
<character line(s) with @ImageN refs>
<FORMAT.fragment>           ← this is where the picked preset lands
<SETTING.fragment>
<location line>
Story: <user master prompt>
Additional direction: <user note>
End on a confident product hero frame...
```

So the format preset's **only job** is to contribute its `fragment` string. If no preset is picked, `customFormat` is wrapped as `Format: <text>`.

## 4. The full studio workflow (end-to-end)

```
MarketingStudio page
  ├─ Subject toggle      → brief.subject ("product" | "app")
  ├─ Master prompt box   → brief.master  (the story)
  ├─ Brands row          → brief.brands[]   (+ optional reference images)
  ├─ Characters row      → brief.characters[]
  ├─ Location popover    → brief.location
  ├─ Format picker  ←──── you are here       → brief.formatId / customFormat
  ├─ Setting picker      → brief.settingId / customSetting
  └─ Render settings     → model, aspect, duration
            │
            ▼
   composeStudioPrompt(brief)   ← builds one prompt string
            │
            ▼
   edge fn: write-ad-scene      ← optional LLM polish
            │
            ▼
   edge fn: generate-video      ← Seedance/Veo, with reference_image_urls
            │
            ▼
   Result card in the studio (preview + save to Library)
```

`imageRefs` ties uploaded reference images to `@Image1`, `@Image2`… tags inside brand/character/location lines so the model binds each subject to the right ref.

## 5. What "building it right" means in practice

When you add or change a format preset, you only need to:

1. Add an entry to `FORMATS` with a unique `id`, a card `label` + `description`, a `category` ("commercial" keeps it visible), an `image` (cover), and most importantly a tight `fragment` — 1–2 sentences in the same imperative voice as the existing ones (camera move, lighting, mood, sound). The `fragment` is what actually steers the video model.
2. If you want it to surface in the picker, keep `category: "commercial"` (current filter) or widen the filter in `MarketingStudio.tsx` ~line 925.
3. Cover image: today these are Unsplash URLs. For a more on-brand feel we can swap to generated stills stored in Supabase Storage or to short looping mp4 thumbnails (the dialog currently only renders `<img>`, so video thumbs would need a small component change).

## Open questions before I edit anything

1. Do you want to **edit the existing 8 commercial formats** (rewrite labels / descriptions / fragments / cover images), **add new ones**, or **restructure the categories** (e.g. bring UGC back, add a new group)?
2. For the card covers — keep Unsplash, switch to AI-generated stills, or use short looping videos?
3. Anything you want to change in the **fragment style** itself (e.g. always mention audio, always specify a camera lens, always end on a logo beat)?

Answer those and I'll write a focused build plan.
