export interface ModelOption {
  value: string;
  label: string;
  descriptionKey: string;
  /**
   * When set, this entry is hidden from the picker unless the model_id
   * matching `availabilityKey` is marked `available = true` in the
   * `model_availability` table. Lets us pre-wire new gateway models
   * (e.g. Gemini Omni Flash) and reveal them automatically when they land.
   */
  gated?: { availabilityKey: string };
}

export interface ModelGroup {
  label: string;
  models: ModelOption[];
}

export const MODEL_GROUPS: ModelGroup[] = [
  {
    label: "Kuaishou (Kling)",
    models: [
      { value: "kling-3.0", label: "Kling 3.0", descriptionKey: "models.desc.kling-3.0" },
      { value: "kling-3.0-omni", label: "Kling 3.0 Omni", descriptionKey: "models.desc.kling-3.0-omni" },
      { value: "kling-3.0-omni-edit", label: "Kling 3.0 Omni Edit", descriptionKey: "models.desc.kling-3.0-omni-edit" },
      { value: "kling-2.6", label: "Kling 2.6", descriptionKey: "models.desc.kling-2.6" },
      { value: "kling-2.5-turbo", label: "Kling 2.5 Turbo", descriptionKey: "models.desc.kling-2.5-turbo" },
      { value: "kling-o1-video", label: "Kling O1 Video", descriptionKey: "models.desc.kling-o1-video" },
      { value: "kling-o1-video-edit", label: "Kling O1 Video Edit", descriptionKey: "models.desc.kling-o1-video-edit" },
      { value: "kling-motion-control", label: "Kling Motion Control", descriptionKey: "models.desc.kling-motion-control" },
      { value: "kling-3.0-motion-control", label: "Kling 3.0 Motion Control", descriptionKey: "models.desc.kling-3.0-motion-control" },
    ],
  },
  {
    label: "Google",
    models: [
      { value: "veo-3.1-lite", label: "Veo 3.1 Lite", descriptionKey: "models.desc.veo-3.1-lite" },
      { value: "veo-3.1-fast", label: "Veo 3.1 Fast", descriptionKey: "models.desc.veo-3.1-fast" },
      { value: "veo-3.1", label: "Veo 3.1", descriptionKey: "models.desc.veo-3.1" },
      { value: "veo-3-fast", label: "Veo 3 Fast", descriptionKey: "models.desc.veo-3-fast" },
      { value: "veo-3", label: "Veo 3", descriptionKey: "models.desc.veo-3" },
      {
        value: "gemini-omni-flash",
        label: "Gemini Omni Flash",
        descriptionKey: "models.desc.gemini-omni-flash",
        gated: { availabilityKey: "google/gemini-omni-flash" },
      },
    ],
  },

  {
    label: "ByteDance (Seedance)",
    models: [
      { value: "seedance-2.0-fast", label: "Seedance 2.0 Fast", descriptionKey: "models.desc.seedance-2.0-fast" },
      { value: "seedance-2.0", label: "Seedance 2.0", descriptionKey: "models.desc.seedance-2.0" },
      { value: "seedance-1.5-pro", label: "Seedance 1.5 Pro", descriptionKey: "models.desc.seedance-1.5-pro" },
      { value: "seedance-pro", label: "Seedance Pro", descriptionKey: "models.desc.seedance-pro" },
      { value: "seedance-pro-fast", label: "Seedance Pro Fast", descriptionKey: "models.desc.seedance-pro-fast" },
    ],
  },
];

export function getModelLabel(value: string): string {
  if (value === "any") return "Any Model";
  for (const group of MODEL_GROUPS) {
    const m = group.models.find((m) => m.value === value);
    if (m) return m.label;
  }
  return value;
}
