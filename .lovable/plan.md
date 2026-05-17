# Close the empty gap in the composer row

The composer card is full container width, so the chip group on the left and the Generate button pushed to the right (`ml-auto`) leave a large dead zone in the middle on desktop.

## Fix

In `src/pages/MarketingStudio.tsx`:

1. Constrain the composer row width. Change the wrapper at line 557 from
   `flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch`
   to add `max-w-4xl mx-auto w-full` so the whole sidebar + composer block centers and never stretches past ~896px on wide screens.

2. Keep Generate as the trailing action (`ml-auto`) — with the narrower card, the gap between the settings icon and Generate becomes a comfortable breathing space instead of a void.

3. Same treatment for the "Renders as" summary line below — it inherits the new width automatically.

No changes to the gallery grid below, no behavior changes.
