## Fix
Make the model picker dropdown match the trigger card width.

In `src/components/ModelPicker.tsx` line 265, replace the fixed `w-[min(32rem,...)] sm:w-[32rem]` on `<SelectContent>` with Radix's trigger-width CSS var so the popover always equals the trigger's width:

```
className="model-picker-content w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-1.5rem)] overscroll-contain p-0 relative"
```

That's the only change. No other props or styles touched.
