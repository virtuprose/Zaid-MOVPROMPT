# Hide "Ads" tool on the live site only

Keep the Ads (Marketing Studio) entry visible in the preview/test environment, but hide it from end users on the published site.

## How environments are detected

Lovable serves the project on three host patterns:
- **Preview (test)**: `id-preview--*.lovable.app` and `*.sandbox.lovable.dev`
- **Published**: `movprompt.lovable.app`
- **Custom domain (live)**: `movprompt.com`, `www.movprompt.com`

We treat anything that isn't a preview host as "live".

## Change

Edit `src/components/TopNav.tsx`:

1. Add a small helper:
   ```ts
   const isPreviewHost = () => {
     if (typeof window === "undefined") return false;
     const h = window.location.hostname;
     return h.includes("id-preview--") || h.endsWith(".sandbox.lovable.dev") || h === "localhost";
   };
   ```
2. Filter the `NAV_ITEMS` array (used by both desktop and mobile nav) so the `{ to: "/marketing", label: "Ads" }` entry is dropped when `!isPreviewHost()`.

The `/marketing` route in `App.tsx` stays intact — direct visits still work, but nothing in the UI links to it on the live site.

## Out of scope

- No backend/auth changes.
- Route is not removed, so it can be re-enabled instantly by deleting the filter.
