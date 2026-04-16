

# Add Arabic Language Support (EN/AR Toggle)

## Approach
Create an i18n system with a React context + translation files, and add an EN/AR toggle button in the header. Arabic layout uses RTL direction automatically.

## Files to Create

### 1. `src/i18n/translations/en.ts`
All English strings extracted from the app — Index page, Auth page, WorkflowPanel, ConfigPanel, ResultsPanel, SceneBreakdown, guide steps, workflow labels, buttons, toasts, etc.

### 2. `src/i18n/translations/ar.ts`
Arabic translations for all the same keys.

### 3. `src/i18n/LanguageContext.tsx`
- React context providing `locale`, `setLocale`, and a `t(key)` function
- Persists chosen language in `localStorage`
- Wraps the app's `<html>` element with `dir="rtl"` and `lang="ar"` when Arabic is active

### 4. `src/components/LanguageToggle.tsx`
- Small button showing "EN | عربي" in the top bar
- Toggles between `en` and `ar`

## Files to Modify

### `src/main.tsx`
- Wrap app with `<LanguageProvider>`

### `src/pages/Index.tsx`
- Replace hardcoded English strings (hero title/subtitle, workflow labels, guide steps) with `t("key")` calls
- Add `<LanguageToggle />` next to the sign-in/avatar in the top bar

### `src/pages/Auth.tsx`
- Replace all English UI text with `t()` calls

### `src/components/WorkflowPanel.tsx`
- Replace button labels, toast messages, phase text with `t()` calls

### `src/components/ConfigPanel.tsx`
- Replace section labels with `t()` calls (preset group names and model labels stay in English since they're technical terms)

### `src/components/ResultsPanel.tsx`
- Replace labels like "Copy All", "Regenerate", field titles with `t()` calls

### `src/components/SceneBreakdown.tsx`
- Replace UI labels (Lock, Move, notes placeholder) with `t()` calls

### `src/components/InstallPrompt.tsx`, `src/components/AnnouncementBanner.tsx`
- Replace visible text with `t()` calls

### `src/index.css`
- Add RTL-aware utility tweaks if needed (Tailwind handles most RTL via logical properties)

## RTL Handling
- When Arabic is active, set `document.documentElement.dir = "rtl"` and `lang = "ar"`
- Tailwind CSS logical properties (`ps-`, `pe-`, `ms-`, `me-`) handle most layout flipping automatically
- A few manual adjustments for `left/right` positioning (ambient glow, chevron rotation)

## Scope
- ~10 files modified, 4 new files
- No backend changes needed
- Technical terms (model names, camera presets like "Dolly In") stay in English in both languages

