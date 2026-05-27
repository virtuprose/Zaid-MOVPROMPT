## Change

In `src/pages/MarketingStudio.tsx` line 1222–1223, drop the model name from the cost tooltip's meta line.

Before:
```
{renderSettings.duration}s · {renderSettings.resolution} · {location.imagePath ? "Seedance 2.0 (with reference)" : "Seedance v1 Pro"}
```

After:
```
{renderSettings.duration}s · {renderSettings.resolution}
```

Everything else in the tooltip (estimated cost, wallet balance, final-cost disclaimer) stays as-is. No other files affected.