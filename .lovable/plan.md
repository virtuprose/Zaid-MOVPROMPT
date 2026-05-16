## Change

Remove the visible border around the composer (the rounded card that wraps the textarea, attach button, model picker, and send button).

## File

`src/components/director/Composer.tsx`, line 224:

```diff
- className={`relative rounded-2xl border bg-card transition-colors ${
-   highlight ? "border-dashed border-accent bg-accent/5" : "border-border"
- }`}
+ className={`relative rounded-2xl bg-card transition-colors ${
+   highlight ? "ring-2 ring-dashed ring-accent bg-accent/5" : ""
+ }`}
```

The default 1px border is dropped. The drag-over "highlight" state is preserved using a ring so users still get clear feedback when dragging files onto the composer.

## Out of scope

No other borders are touched (question cards, suggestion rows, attachment thumbs, etc.).
