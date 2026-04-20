

## Plan — Move "Preset Previews" out of Marketing into its own tab

Currently `PresetPreviewsSection` lives inside the **Marketing** tab alongside notifications, announcements, welcome popup, and email tracker. It doesn't belong there conceptually — it's content/asset management, not marketing outreach.

### Change

In `src/pages/Analytics.tsx`:

1. Add a new top-level tab **"Previews"** (icon: `Film` from lucide-react) to the `TabsList`, placed between **Marketing** and **Agents**.
2. Remove `<PresetPreviewsSection />` from the Marketing tab's content stack.
3. Add a new `<TabsContent value="previews">` that renders `<PresetPreviewsSection />` on its own.

Final tab order: **Analytics · Users · Marketing · Previews · Agents**.

No other files change. No backend, no behavior change inside the section itself — just relocating it to its own tab so it's easier to find and Marketing stays focused on outreach.

### Verification
- Open `/admin` → see 5 tabs in the new order.
- Click **Previews** → the preset upload grid renders by itself.
- Marketing tab no longer shows the Preset Previews card.
- Layout works in RTL (Arabic).

