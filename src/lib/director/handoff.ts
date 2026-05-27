// Cross-tool handoff payload: MovPrompt → AI Director, Marketing Studio → AI Director.
// Stored briefly in sessionStorage so the receiving page can seed its state.

import type { Attachment } from "./ingest";

export const HANDOFF_KEY = "director_handoff_v1";

export type HandoffSource = "movprompt" | "marketing";

export type DirectorHandoff = {
  source: HandoffSource;
  /** Prefilled user prompt that lands in the composer. */
  prompt: string;
  /** Short banner copy shown as the Director's first message. */
  banner?: string;
  /** Image / video / audio references to preload as composer attachments. */
  attachments?: Attachment[];
  /** Suggested render settings — the Director uses these as defaults. */
  settings?: {
    model?: string;
    aspect?: string;
    duration?: number | "auto";
  };
  /** Optional context lookup IDs for Marketing handoffs. */
  brandKitId?: string;
  characterKitId?: string;
  /** Created at (ms) — handoffs older than 5 min are ignored. */
  createdAt: number;
};

const MAX_AGE_MS = 5 * 60 * 1000;

export function writeHandoff(payload: Omit<DirectorHandoff, "createdAt">) {
  try {
    const full: DirectorHandoff = { ...payload, createdAt: Date.now() };
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(full));
  } catch {
    /* ignore quota / privacy errors */
  }
}

export function readHandoff(): DirectorHandoff | null {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DirectorHandoff;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.createdAt || Date.now() - parsed.createdAt > MAX_AGE_MS) {
      sessionStorage.removeItem(HANDOFF_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearHandoff() {
  try {
    sessionStorage.removeItem(HANDOFF_KEY);
  } catch {
    /* ignore */
  }
}
