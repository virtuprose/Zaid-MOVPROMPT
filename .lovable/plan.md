## Remove the white page scrollbar

The bright vertical bar in the screenshot is the browser's default scrollbar track. Custom scrollbar styling exists for specific scrollers (`.model-picker-content`, `.custom-scrollbar`) but there's nothing global, so the page-level scrollbar falls back to the OS/browser default — a white track on the dark cinematic theme.

### Changes — `src/index.css`
Add a global dark scrollbar rule near the existing scrollbar block (~line 275):

```css
/* Global dark scrollbar — matches cinematic theme */
html { scrollbar-color: hsl(240 4% 22%) transparent; scrollbar-width: thin; }
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: hsl(240 4% 22%);
  border-radius: 8px;
  border: 2px solid transparent;
  background-clip: padding-box;
}
::-webkit-scrollbar-thumb:hover { background: hsl(240 4% 32%); background-clip: padding-box; border: 2px solid transparent; }
::-webkit-scrollbar-corner { background: transparent; }
```

This makes the page scrollbar transparent track + subtle dark thumb on every page (Chrome/Safari/Edge via `::-webkit-scrollbar`, Firefox via `scrollbar-color`), so the white strip disappears.

### Out of scope
- Existing custom scrollbars stay as-is (they already match).
- No light-mode override — current light mode is token-driven and the dark thumb still reads fine on light surfaces; can revisit if you want a lighter thumb in light mode.
