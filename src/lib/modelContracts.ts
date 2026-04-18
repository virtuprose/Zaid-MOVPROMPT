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
  /** Workflow type to send to backend. */
  workflowType: WorkflowType;
  /** Short description of the model variant (translation key). */
  variantDescKey?: string;
  /** Whether this model supports an audio on/off toggle. */
  supportsAudio?: boolean;
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
    // Standard Kling variants (3.0, 3.0 Omni, 2.6) support 1↔2 frame toggle
    return {
      slots: 1,
      slotLabels: ["contract.slot.reference"],
      supportsTwoFrameToggle: true,
      workflowType: "single",
    };
  }

  // Seedance — non-Fast and non-2.0 variants support 1↔2 frame toggle
  if (model.startsWith("seedance")) {
    if (model.includes("fast")) return STD;
    if (model === "seedance-2.0") {
      return {
        slots: 1,
        slotLabels: ["contract.slot.reference"],
        extrasHintKey: "contract.hint.seedanceAudio",
        supportsAudio: true,
        workflowType: "single",
      };
    }
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
export function deriveWorkflowType(model: string, activeSlotCount: number): WorkflowType {
  if (activeSlotCount === 2) return "twoframe";
  return getContract(model).workflowType;
}
