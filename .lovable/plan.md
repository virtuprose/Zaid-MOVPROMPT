

## Full new-user journey QA in the live preview

End-to-end manual test of MovPrompt as a brand-new user, driven through the browser tool. I'll create a fresh email-based account, walk every primary flow, and report what works, what's broken, and what's confusing — with screenshots at each milestone.

### Scope

The journey, in order:

1. **Landing (logged out)** — `/` loads, hero renders, language toggle works, Sign In button visible.
2. **Sign up** — `/auth` → Sign Up tab → create account with a throwaway email (`qa+<timestamp>@movprompt.test`) and a strong password. Verify success state and whether email confirmation is required.
3. **First login** — if confirmation is on, switch to Sign In tab and log in; otherwise confirm auto-redirect to `/`.
4. **Welcome popup** — verify it appears once, closes, and doesn't re-appear after reload.
5. **Top bar** — Language toggle (EN ↔ AR, including RTL flip), Notification bell opens, Library button navigates, avatar dropdown shows email + Sign out.
6. **Workflow — Single frame**
   - Upload one image (use a small generated test image written from the browser).
   - Wait for scene analysis → Scene Breakdown renders elements with `@N` chips.
   - Type a description (≥ 10 chars).
   - **Enhance my vision** button — click, verify diff dialog opens with original vs enhanced, Apply replaces text, Undo toast restores it.
   - Toggle a Move/Lock badge → verify manual override persists.
   - Clear the Describe textarea → verify the **confirmation dialog** appears (since auto-assigned badges exist), confirm reset, then verify the **Undo badges** affordance restores them.
   - Pick a target model in ModelPicker.
   - Click Generate → verify Results panel renders prompt, copy button works.
7. **Workflow — Two frames** — upload start + end frame, verify two-frame mode UI, generate.
8. **Workflow — Multi-shot** — switch mode, verify storyboard UI shows.
9. **Library** — navigate to `/library`, verify the just-generated prompt appears, open detail, copy.
10. **Sign out** — from avatar dropdown, verify redirect to `/auth` or `/` logged-out state.
11. **Re-login** — sign back in with the same credentials, verify Library still shows prior generation (persistence check).
12. **Negative checks** along the way: invalid email, weak password, empty description Generate, oversized upload (if quick to test).

### What I will NOT do

- Not delete the test account (no self-serve delete in UI; would need DB access).
- Not test admin routes (`/admin`) — out of scope for "new user".
- Not test password reset email delivery (DNS-dependent, slow). I will trigger "Forgot password" and verify only the request UI + toast.
- Not test payments, OAuth (Google/Apple) — OAuth pops external windows the browser tool can't drive reliably; I'll note it's available and skip.
- Not run destructive admin actions.

### Method

- Use `browser--navigate_to_sandbox` against the preview URL, viewport 1143×891 (matches user's current view) plus one mobile pass at 390×844 for the hero + top bar + dialog responsiveness.
- `observe` → `act` per interaction; screenshots after each milestone (signup success, scene breakdown, enhance dialog, results, library).
- For the image upload I'll generate a tiny PNG in `/tmp` and feed it to the file input via the file-upload action.
- Console + network checks after Generate and after Enhance to catch silent edge-function errors (`enhance-description`, `analyze-scene`, `generate-prompt`).
- One throwaway account per run; credentials reported back to you so you can clean up if you want.

### Deliverable

A single summary message with:

- ✅ / ⚠️ / ❌ per step above.
- Screenshots of: signup success, scene breakdown, enhance diff dialog, generated result, library entry, RTL hero.
- Any console or network errors with the failing function name + status code.
- A short "first-impression friction" list (copy that confused, buttons that looked dead, slow steps).

If a step fails hard (e.g. signup blocked by email confirmation with no inbox access), I'll stop, report, and ask how you want to proceed (e.g. enable auto-confirm in Cloud, or provide an existing account).

