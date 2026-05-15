## Library page refresh — proposed scope

Your 12-item list mixes pure UI polish (do now), feature work that needs new backend fields (copy/edit counts, favorites, folders), and "test data" requests that don't apply to a real user-data app. Here's how I'd split it.

### Phase 1 — Ship now (UI only, no backend)

1. **Cinematic placeholder** for prompts without a reference image: brand-tinted gradient based on model family (Kling=violet, Seedance=emerald, Veo=blue, Sora=cyan→pink, Runway=red, Other=neutral), film-grain SVG overlay, large workflow icon centered at low opacity, optional first 3 keywords as faint typography.
2. **Prompt snippet on every card**: Geist Mono 12px, muted-foreground, 2-line clamp, between model tag and footer. (Currently we already show a 2-line preview in foreground/85 — switch to spec.)
3. **Grouped filter rows**: Row 1 Workflow, Row 2 Model family (Kling/Seedance/Veo/Sora/Runway/Other), Row 3 conditional Variant (specific model versions appear only when a family is selected). Friendly labels via `getModelLabel`. Amber filled = active, amber outlined = inactive.
4. **Page header**: H1 "Library" + subtitle "Every prompt you've generated, ready to use again." above the Prompts/Videos toggle.
5. **List view toggle** (Grid ⊟ / List ☰) on the right above the grid. List rows: workflow pill · model · ~200-char prompt · timestamp · actions.
6. **Better empty states**:
   - Filtered-but-empty: "No prompts match these filters." + Clear button.
   - Truly empty: "You haven't generated any prompts yet." + buttons to Studio and AI Director.
7. **Sort dropdown**: Newest, Oldest, Alphabetical (A→Z), By model, By workflow. (Most copied / Most edited deferred — see Phase 3.)
8. **Kebab menu expansion**: Edit (opens prompt in Studio), Duplicate (copies to clipboard for now), Star/Favorite (Phase 3, hidden until then), Move to folder (Phase 3, hidden until then), Delete (existing). Rename: prompts have no title field today — skipping unless you want me to add one.

### Phase 2 — Needs your call before I build

- **Item 7 (Select mode + bulk actions)**: Delete works today. Move/Duplicate need folders + a duplicate action. OK to ship just **Select + bulk Delete + Cancel** now and defer Move/Duplicate?
- **Item 10 (rename "Assets" in TopNav)**: I'd rename to **Library** (matches the page H1). Confirm or pick another.

### Phase 3 — Requires schema changes (separate migration)

These need new columns/tables. I'll do them in a follow-up so this PR stays reviewable:

- `prompt_history.copy_count` + `edit_count` + `last_edited_at` → enables "Most copied" / "Most edited" sort.
- `prompt_history.favorited` boolean → enables Star/Favorite.
- `prompt_history.title` text → enables Rename.
- `prompt_folders` table + `prompt_history.folder_id` → enables Move to folder.
- A third "References" tab inside Library would need a references table; today references live as `image_paths` on each prompt only.

### Items I'm not doing

- **#5 "Diversify the test data"** — Library reads each user's real `prompt_history`. I'm not going to insert fake rows into your production DB. If you want a Storybook-style preview with mock data, say the word and I'll build a `/library?demo=1` mode.

### Technical notes

- Model family detection: small helper `modelFamily(slug)` mapping `kling-*` → kling, `veo-*` → veo, `seedance-*` → seedance, plus sora/runway entries (need to be added to `src/lib/models.ts` if you want them as filter options — currently only Kling/Veo/Seedance exist).
- Variant pills: derived from `MODEL_GROUPS` filtered by selected family.
- List view: same `HistoryCard` data, new `HistoryRow` component; toggle stored in `localStorage` so it persists.
- All colors via Tailwind tokens / HSL — no hardcoded hex except the one Geist Mono color you specified (#A1A1AA = `text-muted-foreground`, will use the token).

**Confirm**: ship Phase 1 + your answers on Phase 2 questions, defer Phase 3 to a follow-up?