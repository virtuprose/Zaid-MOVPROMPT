

## Plan — Make the end frame optional in Start + End mode

### What changes

When the user picks **Start + End** workflow, the second upload slot ("End Frame") becomes optional. The user only needs the start frame to proceed. If no end frame is provided, the backend receives a single image but with `workflowType: "twoframe"`, which tells the AI to imagine the destination frame.

### Changes

**`src/components/WorkflowPanel.tsx`**

1. **Relax `hasRequiredImages`**: Change the two-frame check from requiring exactly 2 images to requiring at least 1:
   ```ts
   activeSlots === 2 ? images.filter(Boolean).length >= 1 : images.filter(Boolean).length >= 1
   ```
   (Simplifies to just `images.filter(Boolean).length >= 1` for both cases.)

2. **Filter images before sending**: In `handleAnalyze` and `handleGenerate`, filter out empty slots so only uploaded images are sent:
   ```ts
   const imageBase64s = await Promise.all(
     images.filter(Boolean).map((img) => compressImage(img.file))
   );
   ```

3. **Add "(Optional)" label to end frame slot**: Update the slot label for the second frame to show it's optional. Change the `slotLabels` logic to append "(Optional)" to the end-frame label when in twoframe mode.

**`src/components/ImageUploadZone.tsx`** — No change needed; it already handles an empty state gracefully.

**`src/i18n/translations/en.ts`** — Add key `"frame.endOptional": "End Frame (Optional)"`.

**`src/i18n/translations/ar.ts`** — Add key `"frame.endOptional": "إطار النهاية (اختياري)"`.

**`src/components/WorkflowPanel.tsx` (frame labels)** — Use `frame.endOptional` instead of `frame.end` for the second slot label when in twoframe mode.

### No backend change
The `generate-prompt` edge function already handles receiving 1 image with `workflowType: "twoframe"` — the generic agent's system prompt instructs it to imagine the missing end state when only one frame is provided.

### Verification
- Select **Start + End** → second slot shows "End Frame (Optional)".
- Upload only start frame → Analyze and Generate buttons are enabled and work.
- Upload both frames → still works as before.
- Single Frame and Multi-shot modes unaffected.
- RTL layout correct.

