# Image Prompt button for the Director

Add a dedicated "Image Prompt" action to the Director chat. When the user clicks it (with or without a description / reference image), the AI Director returns a **pro, highly-structured image prompt** designed to be pasted into any image generator (Midjourney, Flux, SDXL, DALL·E, Nano Banana, Ideogram, etc.). Result is rendered in a new card with per-section copy and per-generator variants.

This is purely a new capability — no existing video / story flow is touched.

## UX

1. New round icon button in `Composer.tsx` toolbar, between **Enhance** (✨) and the mic, using the `ImageIcon` lucide icon with tooltip **"Generate image prompt"**.
2. Behavior on click:
   - If composer is empty and no attachments → sends a hidden intent `__image_prompt__` and the Director asks 1–2 quick chips (subject, style, aspect) before generating.
   - If composer has a draft / reference image → sends the draft tagged with intent `image_prompt` so the Director skips straight to generating.
3. Director replies with a new bubble `image_prompt_result` rendered by **`ImagePromptCard`** showing:
   - Title + one-line concept
   - Sections: Subject · Scene/Environment · Composition & Framing · Lighting · Color & Mood · Style references · Lens / camera feel · Technical (resolution, aspect, detail level) · Negative prompt
   - **Generator variants** tabs: Midjourney v6 · Flux 1.1 Pro · SDXL · DALL·E 3 · Nano Banana · Ideogram · *Universal*. Each tab is a single copy-ready string formatted to that generator's conventions (MJ uses `--ar --style --stylize`, SDXL uses tag-style, DALL·E uses natural language, etc.).
   - Copy buttons: per-section, per-variant, and "Copy all".

## Files

**New**
- `src/components/director/ImagePromptCard.tsx` — renders the structured result + tabs + copy buttons (uses existing `Tabs`, `Button`, `toast`).
- `supabase/functions/generate-image-prompt/index.ts` — edge function calling Lovable AI Gateway (`google/gemini-3.1-pro-preview`) with a strict system prompt + Zod-validated structured output (sections + 7 generator variants). CORS + JWT validation in code. Accepts `{ description, attachments?: {url,kind}[], aspect? }`.

**Edited**
- `src/components/director/Composer.tsx` — add image-prompt icon button + new prop `onGenerateImagePrompt?: () => void`.
- `src/components/director/DirectorChat.tsx`:
  - Add bubble type `image_prompt_result` to the union and render path.
  - Add `handleGenerateImagePrompt()` that calls `generate-image-prompt` with current composer text + last image attachment (if any), pushes a loading bubble then replaces with result. Pass to `<Composer onGenerateImagePrompt={…} />`.
- `src/lib/director/api.ts` — thin wrapper `invokeImagePrompt(payload)`.

## Edge function contract

```ts
// request
{ description?: string; attachments?: { url: string; kind: "image" }[]; aspect?: "1:1"|"16:9"|"9:16"|"3:2"|"2:3"|"4:5" }

// response
{
  concept: string,
  sections: {
    subject: string, scene: string, composition: string,
    lighting: string, color_mood: string, style_refs: string,
    lens_camera: string, technical: string, negative: string
  },
  variants: {
    midjourney: string, flux: string, sdxl: string, dalle: string,
    nano_banana: string, ideogram: string, universal: string
  }
}
```

System prompt enforces: no fluff, concrete nouns, named lighting + lens feel, explicit color palette, mood word, no copyrighted artist names unless the user asked, generator-idiomatic syntax per variant (MJ flags, SDXL comma tags, DALL·E natural sentences, etc.).

## Out of scope

- No DB persistence (results live in chat session like other Director bubbles).
- No actual image generation — text prompt only.
- No changes to existing video / story / reference-image flows.
- No new model picker; uses Lovable AI Gateway default.

## Verification

- Click button with empty composer → Director asks chips.
- Click with a 1-line subject + reference image → result card renders with 7 working copy buttons; each variant differs in syntax.
- Card respects dark cinematic theme tokens.
