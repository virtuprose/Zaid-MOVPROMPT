## Remove 3 duplicate scene presets

In `src/lib/marketingStudio.ts`, delete these three entries from the `SETTINGS` array:

1. **`indoor-minimalist`** (lines 393–400)
2. **`outdoor-sunlit`** (lines 465–472)
3. **`penthouse`** (lines 499–506)

No other files reference these IDs (verified via ripgrep), so no follow-up cleanup is needed. The Scene picker will show 22 presets instead of 25.