

# i18n: Add Missing Translation Keys for All Pages

## Problem
Several pages still have hardcoded English strings that don't respond to the language toggle: NotFound, ResetPassword, AdminLogin, and ResultsPanel (copy-all text builder).

## Changes

### 1. Add translation keys to `src/i18n/translations/en.ts`

```
// NotFound
"notFound.title": "Oops! Page not found"
"notFound.home": "Return to Home"

// ResetPassword
"reset.passwordsMismatch": "Passwords don't match"
"reset.minLength": "Password must be at least 6 characters"
"reset.failed": "Reset failed"
"reset.success": "Password updated!"
"reset.successDesc": "You can now sign in with your new password."
"reset.invalidLink": "Invalid or expired reset link."
"reset.goSignIn": "Go to Sign In"
"reset.backToApp": "Back to app"
"reset.setNew": "Set your new password"
"reset.newPassword": "New Password"
"reset.confirmPassword": "Confirm Password"
"reset.updatePassword": "Update Password"

// AdminLogin (admin-only, but for consistency)
"admin.accessDenied": "Access denied"
"admin.noPrivileges": "This account does not have admin privileges."
"admin.signOutTry": "Sign out and try another account"
"admin.title": "Admin Access"
"admin.signedInAs": "Signed in as"
"admin.signInFailed": "Sign in failed"

// ResultsPanel
"results.failedCopy": "Failed to copy"
```

### 2. Add matching Arabic keys to `src/i18n/translations/ar.ts`

All keys above with Arabic translations.

### 3. Update components

- **`src/pages/NotFound.tsx`**: Import `useLanguage`, use `t()` for both strings.
- **`src/pages/ResetPassword.tsx`**: Import `useLanguage`, replace all hardcoded strings with `t()`.
- **`src/pages/AdminLogin.tsx`**: Import `useLanguage`, replace all hardcoded strings with `t()`. Reuse existing keys like `auth.email`, `auth.password`, `auth.signIn`, `auth.forgotPassword` where applicable.
- **`src/components/ResultsPanel.tsx`**: Replace `"Failed to copy"` with `t("results.failedCopy")`. Replace hardcoded labels in `handleCopyAll` text builder (`"Main Prompt:\n"` etc.) with translated versions using existing keys.

### Technical Notes
- AdminLogin already uses `auth.email`/`auth.password` keys — we'll reuse those instead of duplicating.
- The `handleCopyAll` text builder in ResultsPanel will use `t("results.mainPrompt")`, `t("results.negativePrompt")`, etc. (already exist).
- `Shot` label in ResultsPanel display (line 92) will use `t("library.shot")` (already exists).

