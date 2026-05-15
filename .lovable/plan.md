## Goal

Show the "Confirm rights" dialog (from the screenshot) every time the user kicks off a video render, before the existing approval/credit step runs. Cancel aborts the render; "I confirm" continues into the existing flow.

## Behavior

1. User clicks **Render with {model}** in `VideoOptionsDialog`.
2. New **ConfirmRightsDialog** opens (centered modal, dark card, info icon, "Confirm rights" headline, rights/responsibility body, **Cancel** + **I confirm** buttons — matching the attached screenshot).
3. On **I confirm** → existing approval flow runs (`requestApproval` → cost confirmation → `generateVideo`).
4. On **Cancel** or close (X) → no render, no approval prompt, dialog dismisses.
5. Optional small "Don't show again for this session" checkbox — defaults off, stored in `sessionStorage` so it re-appears next session (keeps the legal acknowledgement meaningful, while not nagging within one working session).

## Files

- **New:** `src/components/director/ConfirmRightsDialog.tsx` — controlled modal built on shadcn `Dialog`, styled to match the screenshot (rounded-2xl card, `bg-[hsl(240_5%_8%)]`, info icon chip, large display headline, muted body, rounded-full Cancel + solid "I confirm" buttons).
- **Edit:** `src/components/director/PromptResultCard.tsx` — between `VideoOptionsDialog.onConfirm` and the `requestApproval` call, stash the pending render args in state and open `ConfirmRightsDialog`. Move the `requestApproval(...)` call into the dialog's `onConfirm` handler.

## Technical notes

- Use existing `Dialog` from `@/components/ui/dialog` for overlay + a11y; override content classes to get the rounded dark card look.
- Icon: `Info` from lucide-react inside a small rounded square chip.
- Copy:
  - Title: "Confirm rights"
  - Body: "By continuing, you confirm you have rights to use this content and accept responsibility for any copyright or likeness claims tied to it."
  - Buttons: "Cancel" (ghost / outlined) and "I confirm" (solid light pill).
- Session-level skip key: `vidoprompt:rights-ack` in `sessionStorage`. If set, skip the dialog and go straight to `requestApproval`. (Distinct from the per-model `approval:video:*` always-allow key, which only skips the cost confirmation.)
- No backend, schema, or business-logic changes — purely a UI gate in the existing render flow.