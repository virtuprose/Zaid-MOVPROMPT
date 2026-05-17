## Goal

On the MovPrompt home page, surface "Pick your target AI model" first, then the reference upload section — so users choose the model before uploading.

## Change

In `src/components/WorkflowPanel.tsx`, inside the `leftPanel` JSX (around lines 1213–1216), swap the order of two blocks:

Before:
```
<div className="pt-2">{uploadBlock}</div>
{modelBlock}
```

After:
```
{modelBlock}
<div className="pt-2">{uploadBlock}</div>
```

That's it — both blocks already exist as variables, no logic, state, or styling changes. The collapsed/expanded model strip, audio toggle, and upload behavior are unaffected; only their vertical order in the left column changes.

## Out of scope

- No change to the breakdown/generate phases (they don't render `uploadBlock`).
- No copy changes, no new headings, no analytics changes.
- Marketing Studio / Director pages untouched.
