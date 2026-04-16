

# Fix Library Page i18n — All Text Must Follow Language Selection

## Problem
The Library page has many hardcoded strings (both English and Arabic) that don't change when the language is toggled. Text should use `t()` translation keys consistently.

## Changes

### 1. Add missing translation keys

**`src/i18n/translations/en.ts`** — add:
- `library.singleFrame`: "Single Frame"
- `library.twoFrames`: "Two Frames"
- `library.multiShot`: "Multi-Shot"
- `library.justNow`: "just now"
- `library.minsAgo`: "m ago"
- `library.hrsAgo`: "h ago"
- `library.daysAgo`: "d ago"
- `library.shot`: "Shot"
- `library.copy`: "Copy"
- `library.copyAll`: "Copy All"
- `library.copied`: "Copied"

**`src/i18n/translations/ar.ts`** — add matching Arabic keys:
- `library.singleFrame`: "إطار واحد"
- `library.twoFrames`: "إطاران"
- `library.multiShot`: "متعدد اللقطات"
- `library.justNow`: "الآن"
- `library.minsAgo`: "د"
- `library.hrsAgo`: "س"
- `library.daysAgo`: "ي"
- `library.shot`: "لقطة"
- `library.copy`: "نسخ"
- `library.copyAll`: "نسخ-الكل"
- `library.copied`: "تم النسخ"

Also fix Arabic results keys (التوجيه → الامر):
- `results.title`: "الاوامر المُولّدة"
- `results.mainPrompt`: "الامر الرئيسي"
- `results.negativePrompt`: "الامر السلبي"
- `library.empty`: "لا توجد اوامر بعد. أنشئ أول امر سينمائي!"
- `library.generate`: "أنشئ أول امر"

### 2. Update `src/pages/Library.tsx`

- **`WORKFLOW_LABELS`**: Remove hardcoded labels, make it a function that takes `t` and returns translated labels.
- **`timeAgo`**: Accept `t` function, use translation keys instead of hardcoded strings.
- **`CopyButton`**: Accept `t` function, use `t("library.copy")` and `t("library.copied")` instead of hardcoded Arabic.
- **Line 140**: Use `t("library.copyAll")` instead of `"نسخ-الكل"`.
- **Line 145**: Use `t("library.shot")` instead of `"Shot"`.
- **`allText` builder** (lines 80-87): Use `t()` for "Shot", "Negative", "Camera", "Notes" labels.

### Technical Details
- `CopyButton` and `HistoryCard` will need `t` passed as a prop (HistoryCard already has it; CopyButton needs it added).
- `WORKFLOW_LABELS` becomes a function: `getWorkflowLabels(t)` returning the same structure but with `t("library.singleFrame")` etc.
- `timeAgo` becomes `timeAgo(dateStr, t)`.

