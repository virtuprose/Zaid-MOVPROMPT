

# Add to Home Screen (Installable Web App)

Since you want the app to feel like a native app when installed from mobile, we'll add a simple web app manifest — no service workers needed. This keeps things lightweight and avoids caching issues.

## What you'll get
- An "Add to Home Screen" install prompt on mobile browsers
- The app opens fullscreen (no browser chrome) with your branding
- A custom splash screen with your app icon

## Steps

### 1. Create app icons
Generate PWA icons (192×192 and 512×512) in the `public/` folder using the MovPrompt branding (dark background, cyan accent).

### 2. Create `public/manifest.json`
A web app manifest with:
- App name: "MovPrompt"
- Short name: "MovPrompt"
- Theme color: `#0a0a0f` (dark bg)
- Background color: `#0a0a0f`
- Display: `standalone`
- Icons referencing the generated files

### 3. Add meta tags to `index.html`
- Link to `manifest.json`
- Apple-specific meta tags (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon`)
- Theme color meta tag

### 4. Create an install prompt component
A small banner or button (visible only on mobile when the app isn't already installed) that triggers the browser's native "Add to Home Screen" prompt. It will appear at the bottom of the auth page and main page, styled to match the dark cinematic theme.

## Technical notes
- No `vite-plugin-pwa` or service workers — just a manifest for installability
- The install prompt uses the `beforeinstallprompt` browser event (Android/Chrome); on iOS Safari, we'll show instructions ("Tap Share → Add to Home Screen")
- PWA install only works on the published URL, not in the Lovable editor preview

