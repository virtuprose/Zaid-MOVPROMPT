## Add Enhance button to the Director composer

Add a small "Enhance" button beside the mic button in the composer. It sends the current textarea text to the existing `enhance-description` edge function and replaces the textarea with the clarified, more vivid version. Minimal UI, matches the mic/attach button style.

### Scope
- File: `src/components/director/Composer.tsx` only.
- No backend changes — `supabase/functions/enhance-description/index.ts` already exists and is used elsewhere (`WorkflowPanel.tsx`).

### Behavior
- Button sits between the Paperclip (attach) and Mic buttons.
- Icon: `Sparkles` (lucide-react), same `h-9 w-9` ghost style as siblings.
- Disabled when: `busy`, `ingesting`, `recording`, `transcribing`, enhancing in progress, or `value.trim().length < 3`.
- On click:
  1. Set local `enhancing = true`, swap icon to `Loader2` spinner.
  2. Call `supabase.functions.invoke("enhance-description", { body: { description: value } })`.
  3. On success: `onChange(data.enhanced)`, refocus textarea, place caret at end, toast "Description enhanced".
  4. On error: `toast.error(...)`, leave text unchanged.
- Tooltip: "Enhance description" / "Enhancing…".
- Preserves any `@N` mentions (the edge function already instructs the model to keep them verbatim).

### Out of scope
- No changes to credits/cost chip (enhance is currently free like in WorkflowPanel).
- No undo UI — user can simply edit or re-type.
- No new translations of the prompt; relies on existing edge-function behavior.

### Technical notes
```text
[Paperclip] [Sparkles ← new] [Mic]                [Cost] [Send]
```
- Import: add `Sparkles` to the existing `lucide-react` import.
- Import `supabase` from `@/integrations/supabase/client`.
- New local state: `const [enhancing, setEnhancing] = useState(false);`
- Reuse existing `toast` and `Tooltip` primitives already in the file.
