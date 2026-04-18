

User is asking a clarifying question about how the Kling agent handles its many variants (3.0, 3.0 Omni, 3.0 Omni Edit, 2.6, O1 Video, O1 Video Edit, Motion Control, 3.0 Motion Control). This is a research/Q&A question, not an implementation request — but they may also want me to improve the agent. Let me explain current behavior, gaps, and offer an upgrade path.

Current state from `kling.ts`:
- `matches: (model) => model.startsWith("kling")` — catches ALL kling variants with ONE agent
- The docSummary mentions all variants exist
- The systemAddendum has conditional instructions: "For Motion Control variants...", "For Edit variants..."
- BUT: the AI only sees the active `targetModel` in the user message ("Target Model: Kling O1 Video Edit") — it must infer variant behavior from that label alone
- No per-variant routing, no per-variant prompt tuning beyond what Gemini infers

Gaps:
1. Edit variants (Omni Edit, O1 Video Edit) need transformation-only prompts — currently relies on Gemini reading addendum carefully
2. Motion Control variants need waypoint syntax + locked/moving subject tags — same issue
3. O1 vs 3.0 vs 2.6 have different strengths (O1 = newer reasoning, 2.6 = legacy stable) — no differentiation
4. Audio rule (Kling = silent) applies to all — that's correctly universal

The plan: explain how it works today + propose a tightened variant-aware upgrade.

