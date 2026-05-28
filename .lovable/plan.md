## Why it still appears

The "Try an example" row is rendered by `OnboardingExamples` inside `WorkflowPanel.tsx` (line 1398). Its only gating condition (line 1345) is:

- user has never generated before
- current phase is `upload`
- contract doesn't support element references
- no images uploaded yet

There is **no viewport/breakpoint check**, so it shows on every screen size — phone, iPad, and desktop. That's why it's still there on mobile/tablet.

## Fix

Restrict the examples row to desktop only.

**`src/components/WorkflowPanel.tsx` (line 1398)**

Wrap the render with a `hidden lg:block` container so it only appears at the `lg` breakpoint and above (≥1024px), which excludes phones and iPads in portrait:

```tsx
{showOnboarding && (
  <div className="hidden lg:block">
    <OnboardingExamples onPick={handlePickExample} />
  </div>
)}
```

No other files change. Logic, data, and the desktop experience stay identical — the row simply doesn't render on phone or iPad.

If you'd prefer the cutoff at the tablet breakpoint instead (show on iPad landscape, hide only on phones), swap `lg:block` for `md:block`. Tell me which you want and I'll apply it.
