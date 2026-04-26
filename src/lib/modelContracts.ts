// Per-model input contracts: defines slot count, labels, and hints for each AI model.

export type WorkflowType = "single" | "twoframe" | "multishot";

export interface ModelContract {
  /** Number of upload slots required (default 1). For Seedance toggle, this is the default. */
  slots: 1 | 2;
  /** Labels for each slot (translation keys). */
  slotLabels: string[];
  /** Optional extras hint translation key. */
  extrasHintKey?: string;
  /** Whether this model supports a 1↔2 frame toggle (Seedance non-Fast). */
  supportsTwoFrameToggle?: boolean;
  /** Whether this model supports a Single ↔ Multi-shot toggle (Seedance Pro / Pro Fast). */
  supportsMultiShotToggle?: boolean;
  /** Number of shots to generate when multi-shot mode is active. */
  multiShotCount?: number;
  /** Workflow type to send to backend. */
  workflowType: WorkflowType;
  /** Short description of the model variant (translation key). */
  variantDescKey?: string;
  /** Whether this model supports an audio on/off toggle. */
  supportsAudio?: boolean;
  /** Whether this model uses the @Element multi-reference grid (Seedance 2.0 / 2.0 Fast). */
  supportsElementReferences?: boolean;
  /** Maximum number of @Element references (default 10). */
  maxElements?: number;
}

const STD: ModelContract = {
  slots: 1,
  slotLabels: ["contract.slot.reference"],
  workflowType: "single",
};

const EDIT: ModelContract = {
  slots: 1,
  slotLabels: ["contract.slot.source"],
  extrasHintKey: "contract.hint.edit",
  workflowType: "single",
  variantDescKey: "contract.variant.edit",
};

export function getContract(model: string): ModelContract {
  // Any Model (Universal Prompt) — full 3-way workflow toggle
  if (model === "any") {
    return {
      slots: 1,
      slotLabels: ["contract.slot.reference"],
      supportsTwoFrameToggle: true,
      supportsMultiShotToggle: true,
      multiShotCount: 10,
      extrasHintKey: "contract.hint.anyModel",
      workflowType: "single",
    };
  }

  // Kling variants
  if (model.startsWith("kling")) {
    if (model.includes("motion-control")) {
      return {
        slots: 1,
        slotLabels: ["contract.slot.subject"],
        extrasHintKey: "contract.hint.motionControl",
        workflowType: "single",
        variantDescKey: "contract.variant.motionControl",
      };
    }
    if (model.includes("edit")) return EDIT;
    if (model.includes("o1")) return STD;
    // Kling 3.0 (base, not Omni/Edit/Motion) — also supports Multi-shot (10) for stitched sequences.
    if (model === "kling-3.0") {
      return {
        slots: 1,
        slotLabels: ["contract.slot.reference"],
        supportsTwoFrameToggle: true,
        supportsAudio: true,
        supportsMultiShotToggle: true,
        multiShotCount: 10,
        extrasHintKey: "contract.hint.klingMultiShot",
        workflowType: "single",
      };
    }
    // Standard Kling variants (3.0 Omni, 2.6) support 1↔2 frame toggle + audio
    return {
      slots: 1,
      slotLabels: ["contract.slot.reference"],
      supportsTwoFrameToggle: true,
      supportsAudio: true,
      workflowType: "single",
    };
  }

  // Seedance Pro / Pro Fast — Single ↔ Multi-shot (3 shots stitched into one video)
  if (model === "seedance-pro" || model === "seedance-pro-fast") {
    return {
      slots: 1,
      slotLabels: ["contract.slot.reference"],
      supportsMultiShotToggle: true,
      multiShotCount: 5,
      extrasHintKey: "contract.hint.seedanceMultiShot",
      workflowType: "single",
    };
  }

  // Seedance — non-Fast and non-2.0 variants support 1↔2 frame toggle
  if (model.startsWith("seedance")) {
    // Seedance 2.0 / 2.0 Fast: @Element references + Single ↔ Multi-shot toggle (default 9 shots)
    if (model === "seedance-2.0" || model === "seedance-2.0-fast") {
      return {
        slots: 1,
        slotLabels: ["contract.slot.reference"],
        extrasHintKey: "contract.hint.seedanceElements",
        supportsAudio: true,
        supportsElementReferences: true,
        maxElements: 10,
        supportsMultiShotToggle: true,
        multiShotCount: 9,
        workflowType: "single",
      };
    }
    if (model.includes("fast")) return STD;
    return {
      slots: 1,
      slotLabels: ["contract.slot.reference"],
      supportsTwoFrameToggle: true,
      workflowType: "single",
    };
  }

  // Veo 3.1 family — native synced audio
  if (model.startsWith("veo-3.1")) {
    return {
      slots: 1,
      slotLabels: ["contract.slot.reference"],
      extrasHintKey: "contract.hint.veoAudio",
      supportsAudio: true,
      workflowType: "single",
    };
  }

  // Grok Edit
  if (model === "grok-imagine-edit") return EDIT;

  // Default: single reference frame
  return STD;
}

/** Derive workflow type from contract + current slot count (for the Seedance toggle). */
export function deriveWorkflowType(
  model: string,
  activeSlotCount: number,
  multiShotMode = false,
): WorkflowType {
  if (multiShotMode) return "multishot";
  if (activeSlotCount === 2) return "twoframe";
  return getContract(model).workflowType;
}
