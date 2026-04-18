
User wants to remove the duplicate "Reference image" upload zone for Seedance 2.0 / 2.0 Fast and keep only the "Elements" upload (which already supports up to 10 mixed media).

Looking at WorkflowPanel: it currently renders ImageUploadZone(s) AND ElementGrid for these models. Need to hide ImageUploadZone when `contract.supportsElementReferences` is true.

## Plan

For **Seedance 2.0 / 2.0 Fast**, hide the standard "Reference image" `ImageUploadZone` so only the "Elements" grid is shown.

### Change
**`src/components/WorkflowPanel.tsx`** — wrap the existing `ImageUploadZone` slot rendering in a check: skip rendering when `contract.supportsElementReferences` is true. The Elements grid stays as the sole upload surface.

### Notes
- Other models keep the standard reference image upload — unchanged.
- No backend changes, no payload changes (these models already send `elements[]`).
- No i18n changes.

### Files touched
- `src/components/WorkflowPanel.tsx`
