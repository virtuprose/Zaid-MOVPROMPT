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
  "drive", "drives", "driving", "drove",
  "glide", "glides", "gliding", "glided",
  "sway", "sways", "swaying", "swayed",
  "spin", "spins", "spinning", "spun",
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
  "idle",
  "motionless",
  "stationary",
];

const MOVE_SET = new Set(MOVE_VERBS.map((v) => v.toLowerCase()));
const LOCK_SET = new Set(LOCK_VERBS.map((v) => v.toLowerCase()));
const NEGATORS = new Set(["not", "no", "dont", "doesnt", "didnt", "wont", "never", "without"]);

// Look farther ahead (after the mention) than behind — descriptions typically
// read "@N ... verb", and stop at the next @M so mentions don't steal each other's verbs.
const WINDOW_BEFORE = 4;
const WINDOW_AFTER = 12;

/**
 * Detect intent for a specific @N mention.
 * Negation within 2 words before a verb flips the intent (e.g. "not moving" → lock).
 * @param text Full description text.
 * @param mentionNumber The N in @N to locate.
 * @returns "lock" | "move" | null
 */
export function detectIntent(text: string, mentionNumber: number): "move" | "lock" | null {
  if (!text) return null;
  const token = `@${mentionNumber}`;
  const rawWords = text.split(/\s+/).filter(Boolean);
  // For each word keep an @-prefix variant (for mention detection) and a bare alpha variant (for verb lookup)
  const mentionForm = rawWords.map((w) => w.toLowerCase().replace(/[^a-z0-9@]+/g, ""));
  const plainForm = rawWords.map((w) => w.toLowerCase().replace(/[^a-z]+/g, ""));

  const targetIdx = mentionForm.findIndex((w) => w === token.toLowerCase());
  if (targetIdx === -1) return null;

  // Determine segment bounds — stop at the nearest other @M on either side.
  let segStart = Math.max(0, targetIdx - WINDOW_BEFORE);
  for (let i = targetIdx - 1; i >= segStart; i--) {
    if (/^@\d+$/.test(mentionForm[i])) { segStart = i + 1; break; }
  }
  let segEnd = Math.min(rawWords.length, targetIdx + WINDOW_AFTER + 1);
  for (let i = targetIdx + 1; i < segEnd; i++) {
    if (/^@\d+$/.test(mentionForm[i])) { segEnd = i; break; }
  }

  const findVerb = (): { kind: "move" | "lock"; idx: number } | null => {
    for (let i = segStart; i < segEnd; i++) {
      if (i === targetIdx) continue;
      const w = plainForm[i];
      if (!w) continue;
      if (LOCK_SET.has(w)) return { kind: "lock", idx: i };
      if (MOVE_SET.has(w)) return { kind: "move", idx: i };
    }
    return null;
  };

  const hit = findVerb();
  if (!hit) return null;

  // Check for a negator within the 2 words before the verb → flip
  let negated = false;
  for (let j = Math.max(segStart, hit.idx - 2); j < hit.idx; j++) {
    if (NEGATORS.has(plainForm[j])) { negated = true; break; }
  }

  if (hit.kind === "move") return negated ? "lock" : "move";
  return negated ? "move" : "lock";
}
