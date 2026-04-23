

## Replace "frame-to-film-whisperer" with "MOV" in system emails

System emails currently show `frame-to-film-whisperer` (the old project slug) in the sender name and URLs. Replace with `MOV`.

### Changes

**1. `supabase/functions/auth-email-hook/index.ts`**
- `SITE_NAME = "frame-to-film-whisperer"` → `SITE_NAME = "MOV"`
- `SAMPLE_PROJECT_URL = "https://frame-to-film-whisperer.lovable.app"` → `"https://movprompt.com"`

**2. `supabase/functions/send-transactional-email/index.ts`**
- `SITE_NAME = "frame-to-film-whisperer"` → `SITE_NAME = "MOV"`

**3. `supabase/functions/_shared/transactional-email-templates/welcome.tsx`**
- `SITE_URL = "https://frame-to-film-whisperer.lovable.app"` → `"https://movprompt.com"`
- (Leaves `SITE_NAME = "MovPrompt"` as-is since the welcome email already shows the proper brand name.)

**4. Redeploy edge functions** — `auth-email-hook` and `send-transactional-email` so the changes take effect.

### Out of scope
- Email branding/styling — unchanged.
- The `MovPrompt` brand name in the welcome email body — already correct.

### Verification
1. Trigger a password reset or signup → "From" name shows `MOV`, not `frame-to-film-whisperer`.
2. Welcome email CTA link points to `movprompt.com`.

