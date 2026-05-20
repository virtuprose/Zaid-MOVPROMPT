## Goal
Replace the white triangular logo mark shown inside the Director's circular avatar with the uploaded illustrated portrait. Nothing else changes — the app logo, favicon, wordmark, and brand mark stay as-is.

## Changes

1. **Copy the uploaded image into the project**
   - `code--copy user-uploads://Clean_Geometric_Shapes_Icon.png` → `src/assets/director-avatar.png`

2. **`src/components/director/AssistantAvatar.tsx`**
   - Replace the import `import logoMark from "@/assets/logo-mark-white.svg"` with `import directorAvatar from "@/assets/director-avatar.png"`.
   - Update the `<img src={logoMark} …>` to use `directorAvatar`.
   - Adjust the image classes so the portrait fills the circle cleanly: change `h-[60%] w-[60%] object-contain` to `h-full w-full object-cover rounded-full`, and drop the amber `drop-shadow` (it was tuned for the wedge silhouette and would look muddy on a photo-style portrait). Keep the breathing halo, ring, and all state animations exactly as they are.

## Scope guardrails
- Do NOT touch `AperturalLogo`, `public/logo-mark*.svg`, `src/assets/logo-mark*.svg`, the wordmark, favicon, PWA icons, or `TopNav`.
- Only the avatar shown by `AssistantAvatar` (used in `TypingIndicator` and the Director chat bubbles) changes.

## Verification
- Open `/director` and confirm the round avatar now shows the illustrated portrait, still framed by the amber halo + ring, and that thinking / scanning / success states still animate.
- Check the top-nav logo and browser tab favicon are unchanged.
