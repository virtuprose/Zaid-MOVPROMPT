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
    label: "Minimax Hailuo",
    models: [
      { value: "hailuo-2.3-fast", label: "Hailuo 2.3 Fast" },
      { value: "hailuo-2.3", label: "Hailuo 2.3" },
      { value: "hailuo-02-fast", label: "Hailuo 02 Fast" },
      { value: "hailuo-02", label: "Hailuo 02" },
    ],
  },
  {
    label: "Kuaishou (Kling)",
    models: [
      { value: "kling-3.0", label: "Kling 3.0" },
      { value: "kling-3.0-omni", label: "Kling 3.0 Omni" },
      { value: "kling-3.0-omni-edit", label: "Kling 3.0 Omni Edit" },
      { value: "kling-2.6", label: "Kling 2.6" },
      { value: "kling-o1-video", label: "Kling O1 Video" },
      { value: "kling-o1-video-edit", label: "Kling O1 Video Edit" },
      { value: "kling-motion-control", label: "Kling Motion Control" },
      { value: "kling-3.0-motion-control", label: "Kling 3.0 Motion Control" },
    ],
  },
  {
    label: "OpenAI",
    models: [
      { value: "sora-2", label: "Sora 2" },
      { value: "sora-2-pro", label: "Sora 2 Pro" },
      { value: "sora-2-max", label: "Sora 2 Max" },
      { value: "sora-2-pro-max", label: "Sora 2 Pro Max" },
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
    label: "Higgsfield",
    models: [
      { value: "higgsfield-lite", label: "Higgsfield Lite" },
      { value: "higgsfield-standard", label: "Higgsfield Standard" },
      { value: "higgsfield-turbo", label: "Higgsfield Turbo" },
    ],
  },
  {
    label: "Alibaba (Wan)",
    models: [
      { value: "wan-2.7", label: "Wan 2.7" },
      { value: "wan-2.6", label: "Wan 2.6" },
      { value: "wan-2.5", label: "Wan 2.5" },
      { value: "wan-2.5-fast", label: "Wan 2.5 Fast" },
      { value: "wan-2.2", label: "Wan 2.2" },
      { value: "wan-2.2-fast", label: "Wan 2.2 Fast" },
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
  {
    label: "xAI (Grok)",
    models: [
      { value: "grok-imagine", label: "Grok Imagine" },
      { value: "grok-imagine-edit", label: "Grok Imagine Edit" },
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
