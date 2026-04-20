export interface ModelOption {
  value: string;
  label: string;
}

export interface ModelGroup {
  label: string;
  models: ModelOption[];
}

export const MODEL_GROUPS: ModelGroup[] = [
  {
    label: "Kuaishou (Kling)",
    models: [
      { value: "kling-3.0", label: "Kling 3.0" },
      { value: "kling-3.0-omni", label: "Kling 3.0 Omni" },
      { value: "kling-3.0-omni-edit", label: "Kling 3.0 Omni Edit" },
      { value: "kling-2.6", label: "Kling 2.6" },
      { value: "kling-2.6-turbo", label: "Kling 2.6 Turbo" },
      { value: "kling-o1-video", label: "Kling O1 Video" },
      { value: "kling-o1-video-edit", label: "Kling O1 Video Edit" },
      { value: "kling-motion-control", label: "Kling Motion Control" },
      { value: "kling-3.0-motion-control", label: "Kling 3.0 Motion Control" },
    ],
  },
  {
    label: "Google",
    models: [
      { value: "veo-3.1-lite", label: "Veo 3.1 Lite" },
      { value: "veo-3.1-fast", label: "Veo 3.1 Fast" },
      { value: "veo-3.1", label: "Veo 3.1" },
      { value: "veo-3-fast", label: "Veo 3 Fast" },
      { value: "veo-3", label: "Veo 3" },
    ],
  },
  {
    label: "ByteDance (Seedance)",
    models: [
      { value: "seedance-2.0-fast", label: "Seedance 2.0 Fast" },
      { value: "seedance-2.0", label: "Seedance 2.0" },
      { value: "seedance-1.5-pro", label: "Seedance 1.5 Pro" },
      { value: "seedance-pro", label: "Seedance Pro" },
      { value: "seedance-pro-fast", label: "Seedance Pro Fast" },
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
