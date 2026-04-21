// Detects whether an @N mention in a description implies Move or Lock
// based on nearby English verbs. Returns null when no intent verb is near.

export const MOVE_VERBS = [
  "move", "moves", "moving", "moved",
  "walk", "walks", "walking", "walked",
  "run", "runs", "running", "ran",
  "fly", "flies", "flying", "flew", "flown",
  "rotate", "rotates", "rotating", "rotated",
  "shift", "shifts", "shifting", "shifted",
  "travel", "travels", "traveling", "travelled", "traveled",
  "sweep", "sweeps", "sweeping", "swept",
  "drift", "drifts", "drifting", "drifted",
  "pan", "pans", "panning", "panned",
  "zoom", "zooms", "zooming", "zoomed",
  "animate", "animates", "animating", "animated",
  "morph", "morphs", "morphing", "morphed",
  "transform", "transforms", "transforming", "transformed",
  "turn", "turns", "turning", "turned",
  "slide", "slides", "sliding", "slid",
  "dance", "dances", "dancing", "danced",
  "jump", "jumps", "jumping", "jumped",
];

export const LOCK_VERBS = [
  "keep", "keeps", "keeping", "kept",
  "lock", "locks", "locking", "locked",
  "freeze", "freezes", "freezing", "frozen", "froze",
  "hold", "holds", "holding", "held",
  "stay", "stays", "staying", "stayed",
  "fix", "fixes", "fixing", "fixed",
  "preserve", "preserves", "preserving", "preserved",
  "maintain", "maintains", "maintaining", "maintained",
  "unchanged",
  "still",
  "static",
  "same",
  "remain", "remains", "remaining", "remained",
];

const MOVE_SET = new Set(MOVE_VERBS.map((v) => v.toLowerCase()));
const LOCK_SET = new Set(LOCK_VERBS.map((v) => v.toLowerCase()));

const WINDOW = 6;

/**
 * Detect intent for a specific @N mention.
 * @param text Full description text.
 * @param mentionNumber The N in @N to locate.
 * @returns "lock" | "move" | null
 */
export function detectIntent(text: string, mentionNumber: number): "move" | "lock" | null {
  if (!text) return null;
  const token = `@${mentionNumber}`;
  // Tokenize keeping positions. Find the index of the target @N (first occurrence used).
  // Split on whitespace to get words with original punctuation; strip punctuation for lookup.
  const words = text.split(/\s+/).filter(Boolean);
  const stripped = words.map((w) => w.toLowerCase().replace(/[^a-z0-9@]+/g, ""));
  const targetIdx = stripped.findIndex((w) => w === token || w === token.toLowerCase());
  if (targetIdx === -1) return null;

  const start = Math.max(0, targetIdx - WINDOW);
  const end = Math.min(stripped.length, targetIdx + WINDOW + 1);
  const windowWords: string[] = [];
  for (let i = start; i < end; i++) {
    if (i === targetIdx) continue;
    // re-strip to bare alpha for verb matching
    windowWords.push(stripped[i].replace(/[^a-z]+/g, ""));
  }

  // Lock takes precedence when both appear in the window.
  for (const w of windowWords) {
    if (w && LOCK_SET.has(w)) return "lock";
  }
  for (const w of windowWords) {
    if (w && MOVE_SET.has(w)) return "move";
  }
  return null;
}
