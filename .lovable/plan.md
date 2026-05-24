## Add "Nokhadha" preset to Marketing Studio

Add a new format preset in `src/lib/marketingStudio.ts` inside the `FORMATS` array, under the `avatar` category (since it adapts to a user-uploaded avatar/face).

### Entry

```ts
{
  id: "nokhadha",
  label: "Nokhadha",
  description: "Gulf Heritage Epic",
  category: "avatar",
  emoji: "⛵",
  fragment:
    "Cinematic historical realism, Gulf heritage epic, 9:16 vertical. Adapt only the avatar's face (and body if full-body reference) — keep the traditional Kuwaiti Nokhadha outfit and historical maritime atmosphere completely unaltered. A legendary Kuwaiti Nokhadha stands at the front of a massive traditional wooden dhow ship in the Arabian Gulf during golden sunset, strong facial features, sunburned skin from years at sea, traditional Gulf clothing moving aggressively with the wind, deep focused eyes toward the horizon, powerful calm leadership presence. Loyal crew works behind him preparing ropes and sails with disciplined teamwork. Cinematic waves crash, seagulls fly overhead. Sequence 1 [0–3s]: wide aerial cinematic shot of the dhow crossing the Arabian Gulf at sunset, huge realistic waves, dramatic sky, strong ocean wind, crew moving naturally, Nokhadha standing still like a fearless leader at the bow, drone slowly pushing forward. Sequence 2 [3–6s]: medium cinematic shots of the Nokhadha commanding his crew with confident hand gestures, crew pulling ropes, adjusting sails, rowing in sync, close-up of weathered hands gripping wooden ship controls, hyper-realistic cloth movement, strong diegetic sound of ropes, wind, waves and creaking wood. Sequence 3 [6–9s]: close-up hero shot of the Nokhadha's face, sweat and sea-salt texture, emotional determined eyes, camera slowly orbiting with sunlight raking one side of his face, crew watching with respect behind him. Sequence 4 [9–12s]: the dhow approaches a Kuwaiti coastal town at sunset, traditional mud houses and old Kuwaiti architecture in the distance, people gathering on the shore, children running excitedly, cinematic telephoto compression. Sequence 5 [12–15s]: epic final hero shot — the Nokhadha steps off the dhow onto the shore, crew follows carrying goods and pearl-diving equipment, townspeople watch with pride, slow-motion cinematic walk, warm sunset backlight, final frame holds briefly on the Nokhadha looking toward his town like a respected legendary leader. Camera: ARRI Alexa 65 look, anamorphic lens flares, 35mm + 85mm mix, handheld realism mixed with stabilized cinematic tracking, natural motion blur, shallow depth of field, cinematic contrast. Enhancement tags: cinematic realism, historical epic, arabian gulf heritage, ultra detailed, emotional storytelling, realistic water simulation, cinematic lighting, authentic kuwait heritage, filmic composition, dramatic atmosphere. Negative: modern buildings, modern boats, modern clothing, cartoon, low quality, blurry faces, extra fingers, AI glitches, oversaturated colors, futuristic elements, subtitles, watermark, text overlay, shaky camera, unrealistic ocean, fantasy armor, sci-fi elements, plastic skin, HDR look, bad anatomy, duplicated people.",
}
```

### Placement

Insert near the other `category: "avatar"` entries (around the `talking-avatar` block ~line 175 in `src/lib/marketingStudio.ts`). No other files change.

### Notes

- Uses `emoji: "⛵"` as the thumbnail fallback (no image/video asset yet — can be added later by dropping `/presets/nokhadha.mp4` into `public/presets/`).
- Aspect ratio (9:16) is encoded inside the fragment so it composes correctly with the existing prompt builder.
- Negative-prompt and enhancement tags are embedded inline since `StudioPreset` only exposes a single `fragment` field.
