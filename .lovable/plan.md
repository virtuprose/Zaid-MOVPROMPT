## Plan

Fix the model picker dropdown so long descriptions are fully readable and no longer get cut off on the right edge.

### What I’ll change
1. Update the shared select primitive in `src/components/ui/select.tsx` so select items can support multi-line content cleanly.
   - Change item alignment from centered to top/start-friendly for taller rows.
   - Make the item text wrapper behave like a full-width block, not a tight inline span.
   - Use logical positioning for the checkmark area so spacing works in both English and Arabic.

2. Adjust the model picker layout in `src/components/ModelPicker.tsx`.
   - Give the dropdown a wider desktop width and a safer mobile max width.
   - Remove the remaining width constraints that make descriptions run into the right edge.
   - Reserve clearer space for the checkmark icon and let the text column use the full remaining width.
   - Keep labels on one line where possible, but let descriptions wrap naturally across lines.

3. Add a regression test for the dropdown row structure.
   - Extend `src/components/__tests__/ModelPicker.test.tsx` with checks that guard the multi-line item layout classes so this clipping issue does not come back.

### Expected result
- Full model descriptions will be readable without being visually chopped off.
- The dropdown will look cleaner and more organized.
- The fix will still respect RTL support.

### Technical details
Files to update:
- `src/components/ui/select.tsx`
- `src/components/ModelPicker.tsx`
- `src/components/__tests__/ModelPicker.test.tsx`

Likely root cause:
- The Radix `ItemText` wrapper is still acting like a tight inline container in practice, while the dropdown itself is also constrained to a fairly narrow fixed width. Together, that leaves too little usable line width, so long sentences appear cut off instead of comfortably wrapping.
- The current shared `SelectItem` is optimized for one-line menu items, but the model picker uses two-line, description-heavy rows and needs a slightly different layout behavior.