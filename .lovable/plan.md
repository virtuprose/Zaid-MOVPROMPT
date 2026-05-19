## Goal

Show only one approval action — the sticky "Needs approval to run …" bar above the composer. Remove the duplicate inline "Character sheet — Use N credits?" card (and its Generate button) that currently appears in the chat stream right above the "Awaiting your approval" pill.

## Change

In `src/components/director/DirectorChat.tsx` (around lines 1762–1767):

- Drop the `<InlineApprovalCard request={pendingApproval} />` render.
- Keep `<AwaitingApprovalPill />` as the in-chat indicator.
- Keep the existing `<BottomApprovalBar request={pendingApproval} />` (line 1771) — this is the remaining single Generate button.
- Remove `InlineApprovalCard` from the import list on line 45 since it is no longer used.

## Out of scope

- `InlineApprovalCard` itself stays defined in `ApprovalRequest.tsx` (no other consumers, but harmless and keeps the file stable).
- No changes to approval logic, credit cost, or the bottom bar.
