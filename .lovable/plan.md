## Goal

Credit numbers shown to the user (especially in the approval bar above the composer and inside the inline approval card) should display as clean integers — `5`, `10`, `150`, `200` — never `5.000` or `150.00`.

## Change

In `src/components/director/ApprovalRequest.tsx`:

- Replace both occurrences of `{request.cost.toFixed(3)}` (lines 73 and 158) with a small inline formatter that:
  - rounds to at most 2 decimals,
  - strips trailing zeros (and the trailing dot),
  - so `5 → "5"`, `150 → "150"`, `2.5 → "2.5"`, `0.75 → "0.75"`.

Implementation: `Number(request.cost.toFixed(2)).toString()` — or a tiny local helper `fmtCredits(n)` defined once at the top of the file and reused at both spots.

Everywhere else credit numbers already render as integers (CostChip, CreditBadge, WalletDrawer balance and delta), so no other files need changes.

## Out of scope

- Backend pricing values, credit ledger entries, currency formatting.
- Cost calculation logic.
