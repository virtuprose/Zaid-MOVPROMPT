

## Disable email verification on signup

Right now, after sign-up the app shows a "Check your email" toast and Supabase requires email confirmation before the user can sign in. You want signup to log users in immediately — no email check required.

### Changes

**1. Auth setting (Lovable Cloud)**
- Enable **auto-confirm signups** so new users get a session immediately and don't receive a confirmation email.

**2. `src/pages/Auth.tsx` — `handleEmailSignUp`**
- Remove the `else` branch that toasts `toast.checkEmail` / `toast.verificationSent`.
- Always show the `accountCreated` / `welcomeAboard` toast on success (a session is now guaranteed).
- Keep the existing `welcome` transactional email send (that's the in-app welcome, not a verification).
- Keep the `first_signup_pending` flag so the WelcomePopup + tour still chain correctly.

**3. No other files need changes**
- `useAuth.ts` already handles the immediate `SIGNED_IN` event and welcome email for OAuth — unaffected.
- Auth email templates (`signup.tsx`) stay in place but won't be triggered anymore. Leaving them doesn't hurt.

### Out of scope
- Password reset emails — still active (different flow, you didn't ask to remove).
- OAuth flows — unchanged.
- Removing the `signup` email template file — keeping it in case you re-enable confirmation later.

### Verification
1. Sign up with email + password → no "check your email" toast, user is signed in and redirected to `/`.
2. WelcomePopup appears on first load, then tour starts.
3. No confirmation email lands in inbox.
4. Existing accounts unaffected; sign-in still works.

