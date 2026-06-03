## Goal

Replace the dull, repetitive collapsed Tasks sidebar (56px rail) on `/director` with the cinematic "Signature rail" direction: per-task identity tiles, status pips, pin notch, amber active ring, no generic chat-icon repetition.

## File

`src/pages/Director.tsx` — only the `navCollapsed` branch of the `<aside>` (the `TooltipProvider` block around lines 188–245). Expanded sidebar, workspace, and dialogs stay untouched.

## Changes

1. **Rail container** — keep 56px width; add subtle inner styling (`bg-[hsl(240_6%_6%)]`, `border border-white/5`, `rounded-2xl`, `py-4`, vertical gap-5). Add a thin divider between the New-task button and the task stack, and one above any future bottom slot.

2. **New Task button** — swap the outline button for a 40×40 squircle with cyan token tint: `bg-primary/10 border border-primary/20 hover:border-primary/50`, soft cyan blur halo on hover, cyan `Plus` icon. Keeps existing `navigate("/director")` + tooltip.

3. **Task tile (new helper, local to file)** `TaskTile({ session, active })`:
   - 36×36 rounded-lg.
   - If `thumbnail` and not `blob:` → render image, `object-cover`.
   - Else → deterministic gradient fallback derived from a small hash of `session.id` picking from a curated palette set (indigo/purple, rose/orange, slate, teal/cyan, amber/zinc) + monogram (first 1–2 letters of title, uppercased; fallback "··"), font `text-[10px] font-bold tracking-tighter`.
   - Active state: `ring-2 ring-accent ring-offset-2 ring-offset-background` + soft amber `shadow-[0_0_15px_hsl(35_90%_55%/0.25)]`.
   - Status pip bottom-right (2.5×2.5, 2px bg-background border):
     - `completed` → emerald-500
     - `in_progress` → cyan primary + soft glow + `animate-pulse`
     - `draft` → no pip (keeps tile clean)
   - If `pinned` → tiny rotated amber pin glyph at top-right (`-top-1.5 -right-1.5`, `w-3 h-3 text-accent`).
   - Wrap in existing `Tooltip` showing `title || "Untitled brief"`.
   - Hover: `group-hover:scale-[1.04] transition-transform`.

4. **Scroll stack** — `flex-1 flex flex-col items-center gap-3 overflow-y-auto`, hide scrollbar via existing `scrollbar-none` / inline style; add subtle top/bottom fade masks (`mask-image` linear-gradient) so tiles fade at the edges.

5. **Cleanup** — remove the inline `MessageSquare` fallback from the collapsed branch (now handled by monogram). Expanded branch is unchanged.

## Design tokens

Use existing semantic tokens (`primary`, `accent`, `background`, `border`, `muted`) — no new colors hardcoded. Gradient palette set lives as a small local const array of token-friendly Tailwind class strings.

## Out of scope

- Expanded sidebar list, workspace toggle button, dialogs.
- No data model changes; `SessionRow` already exposes `status`, `pinned`, `thumbnail`, `title`.
- No new dependencies.

## Verification

- Visit `/director` collapsed: tiles show varied gradients + monograms, active task has amber ring + glow, in-progress pip pulses, pinned task shows amber pin notch.
- Toggle expand/collapse — expanded view unchanged.
- Tooltip still shows full task title on hover.
