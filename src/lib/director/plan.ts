// DirectorPlan: explicit, structured representation of the shot plan a
// Director session is building toward. Today it's read-only scaffolding for
// the orchestrator evolution (see .lovable/plan.md). Future stages will
// populate it from chat turns and use it to route per-shot model choices.

export type ShotStatus =
  | "draft" // not yet locked
  | "ready" // all required axes locked, awaiting render
  | "rendering"
  | "done"
  | "failed";

export type LockedAxes = {
  duration_seconds?: number;
  aspect_ratio?: string;
  audio?: "on" | "off" | "music_only" | "sfx_only";
  model?: string; // recommended/selected model id
  resolution?: string;
};

export type PlannedShot = {
  id: string;
  /** Short human label, e.g. "Opening wide" or "Cut to product close-up". */
  intent: string;
  locked: LockedAxes;
  /** Crafted, model-specific prompt once ready. */
  prompt?: string;
  status: ShotStatus;
  outputUrl?: string;
  error?: string;
};

export type PlanGlobals = {
  /** Project-wide defaults that apply unless a shot overrides. */
  aspect_ratio?: string;
  duration_seconds?: number;
  style_notes?: string;
  /** Routing budget for Stage 2's per-shot router. */
  budget?: "quality" | "balanced" | "cheap";
};

export type DirectorPlan = {
  shots: PlannedShot[];
  globals: PlanGlobals;
};

export const emptyPlan: DirectorPlan = { shots: [], globals: {} };

export function isPlan(value: unknown): value is DirectorPlan {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.shots) && typeof v.globals === "object" && v.globals !== null;
}

export function readPlan(raw: unknown): DirectorPlan {
  return isPlan(raw) ? raw : emptyPlan;
}

const STATUS_LABEL: Record<ShotStatus, string> = {
  draft: "Draft",
  ready: "Ready",
  rendering: "Rendering",
  done: "Done",
  failed: "Failed",
};

export function statusLabel(s: ShotStatus): string {
  return STATUS_LABEL[s];
}

/** Required axes per shot before it can leave `draft`. */
export function missingAxes(shot: PlannedShot): (keyof LockedAxes)[] {
  const need: (keyof LockedAxes)[] = ["duration_seconds", "aspect_ratio", "audio", "model"];
  return need.filter((k) => shot.locked[k] === undefined || shot.locked[k] === null);
}
