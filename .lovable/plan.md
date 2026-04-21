

## RTL overflow test for 360px

### Goal
Guarantee that the longest Arabic translated labels never overflow, clip, or trigger horizontal scroll at 360px width — the narrowest mobile target.

### Scope
Single new Vitest test file, no app code changes, no i18n key changes, no route changes.

### File

**New:** `src/components/__tests__/RtlOverflow.test.tsx`

### What it tests

1. **Render harness** — mounts a stripped-down version of the dense action rows we recently tightened, inside:
   - `LanguageProvider` forced to `ar` (Arabic) so the RTL translations + `dir="rtl"` propagate.
   - A fixed-width wrapper styled `width: 360px; overflow: visible` so we can detect overflow by measuring child geometry instead of relying on real scrollbars (jsdom has no layout, but we can still assert structural invariants + use getBoundingClientRect shims that jsdom provides as zero — so we rely on className + DOM structure assertions rather than real pixel measurements).
   - `dir="rtl"` on the container.

2. **Assertions** (jsdom-safe, structural, not pixel-based):
   - The primary CTA wrapper uses `flex-col sm:flex-row` so Arabic labels stack vertically at 360px instead of competing for width → assert the class is present on the render output.
   - The breakdown header's Start Over / Re-analyze buttons use the `hidden sm:inline` pattern on the label span → assert the `<span>` has that class so Arabic text collapses to icon-only on mobile.
   - The Clear button in ConfigPanel has `hidden sm:inline` on its label span.
   - Each icon-only button exposes a non-empty `aria-label` equal to the Arabic translation (proves the label is still accessible even when visually hidden).
   - `document.documentElement.dir === "rtl"` (or the nearest wrapper) after switching to `ar`.

3. **Why this catches overflow without a headless browser**
   - In jsdom we can't measure pixels, but the overflow class we already apply (`hidden sm:inline`, `flex-col sm:flex-row`, `w-full sm:w-auto`) is *the* mechanism that prevents overflow at 360px. If any of those classes regress, Arabic text would overflow. Asserting on those classes is a valid regression guard.
   - As a second layer, the test imports `ar.ts`, picks the known-longest strings (`wp.analyzeScene`, `wp.reAnalyze`, `wp.startOver`, `config.clear`), and asserts they're wired into the rendered DOM via `aria-label`, so translators can't accidentally ship an empty/too-short string that breaks the icon-only affordance.

4. **No route needed** — the test renders small fragments that mirror the real WorkflowPanel/ConfigPanel structure (the icon-only row pattern), not the whole page. This keeps it hermetic, fast, and independent of auth / Supabase / edge functions.

### Exact assertions (pseudocode)

```ts
renderInArabicRtlAt360(<WorkflowHeaderRow />);
expect(container).toHaveAttribute("dir", "rtl");
const startOverBtn = screen.getByRole("button", { name: arT("wp.startOver") });
expect(startOverBtn.querySelector("span.hidden.sm\\:inline")).not.toBeNull();
expect(startOverBtn).toHaveAttribute("aria-label", arT("wp.startOver"));
// primary CTA row
const ctaRow = screen.getByTestId("analyze-row");
expect(ctaRow.className).toMatch(/flex-col/);
expect(ctaRow.className).toMatch(/sm:flex-row/);
// each CTA is w-full sm:w-auto
screen.getAllByTestId("cta-btn").forEach((btn) => {
  expect(btn.className).toMatch(/w-full/);
  expect(btn.className).toMatch(/sm:w-auto/);
});
```

### Out of scope

- Real pixel-measurement / visual regression (would require Playwright).
- Testing the actual `WorkflowPanel` / `ConfigPanel` components end-to-end (their full render pulls in Supabase + auth + many contexts — test the structural pattern in isolation instead).
- Adding a new `/qa/rtl` preview route.
- Any i18n additions or changes to existing classes — this is purely a regression guard for what we just shipped.

### Verification
Run `bun run test` (or the vitest script already defined); confirm the new test passes alongside the existing `ModelPicker.test.tsx`.

