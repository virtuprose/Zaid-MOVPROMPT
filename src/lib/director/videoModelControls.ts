// Per-model render controls for the video generation dialog.
// Mirrors fal.ai input schemas — only fields the model actually accepts are
// surfaced in the UI and forwarded to the edge function.

export type VideoOptions = {
  aspect_ratio?: string;
  duration?: number;
  resolution?: string;
  audio?: boolean;
  cfg_scale?: number;
  prompt_optimizer?: boolean;
};

export type ModelControls = {
  aspectRatios?: string[];
  durations?: number[];
  resolutions?: string[];
  audio?: boolean;
  cfgScale?: boolean;
  promptOptimizer?: boolean;
  defaults: VideoOptions;
};

const STD_ASPECTS = ["16:9", "9:16", "1:1"];
const SEEDANCE_ASPECTS = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"];

const CONTROLS: Record<string, ModelControls> = {
  // Veo
  "veo-3.1": {
    aspectRatios: STD_ASPECTS,
    durations: [4, 6, 8],
    resolutions: ["720p", "1080p"],
    audio: true,
    defaults: { aspect_ratio: "16:9", duration: 8, resolution: "1080p", audio: true },
  },
  "veo-3.1-fast": {
    aspectRatios: STD_ASPECTS,
    durations: [4, 6, 8],
    resolutions: ["720p", "1080p"],
    audio: true,
    defaults: { aspect_ratio: "16:9", duration: 8, resolution: "1080p", audio: true },
  },
  "veo-3.1-lite": {
    aspectRatios: ["16:9", "9:16"],
    durations: [8],
    resolutions: ["720p", "1080p"],
    audio: true,
    defaults: { aspect_ratio: "16:9", duration: 8, resolution: "1080p", audio: true },
  },
  "veo-3": {
    aspectRatios: ["16:9", "9:16"],
    durations: [8],
    resolutions: ["720p", "1080p"],
    audio: true,
    defaults: { aspect_ratio: "16:9", duration: 8, resolution: "1080p", audio: true },
  },
  "veo-3-fast": {
    aspectRatios: ["16:9", "9:16"],
    durations: [8],
    resolutions: ["720p", "1080p"],
    audio: true,
    defaults: { aspect_ratio: "16:9", duration: 8, resolution: "1080p", audio: true },
  },
  "veo-2": {
    aspectRatios: ["16:9", "9:16"],
    durations: [5, 6, 7, 8],
    resolutions: ["720p"],
    defaults: { aspect_ratio: "16:9", duration: 5, resolution: "720p" },
  },

  // Kling — all share aspect/duration/cfg_scale
  ...Object.fromEntries(
    [
      "kling-v2.5-turbo-pro",
      "kling-v2.1-master",
      "kling-v2-master",
      "kling-v1.6-pro",
      "kling-v1.6-standard",
      "kling-v1.5-pro",
      "kling-v1-pro",
      "kling-v1-standard",
    ].map((id) => [
      id,
      {
        aspectRatios: STD_ASPECTS,
        durations: [5, 10],
        cfgScale: true,
        defaults: { aspect_ratio: "16:9", duration: 5, cfg_scale: 0.5 },
      } as ModelControls,
    ]),
  ),

  // Seedance
  "seedance-2.0": {
    aspectRatios: SEEDANCE_ASPECTS,
    durations: [5, 10],
    resolutions: ["480p", "720p", "1080p"],
    audio: true,
    defaults: { aspect_ratio: "16:9", duration: 5, resolution: "1080p", audio: true },
  },
  "seedance-2.0-fast": {
    aspectRatios: SEEDANCE_ASPECTS,
    durations: [5, 10],
    resolutions: ["480p", "720p", "1080p"],
    audio: true,
    defaults: { aspect_ratio: "16:9", duration: 5, resolution: "1080p", audio: true },
  },
  "seedance-v1-pro": {
    aspectRatios: SEEDANCE_ASPECTS,
    durations: [5, 10],
    resolutions: ["480p", "720p", "1080p"],
    defaults: { aspect_ratio: "16:9", duration: 5, resolution: "1080p" },
  },
  "seedance-v1-lite": {
    aspectRatios: SEEDANCE_ASPECTS,
    durations: [5, 10],
    resolutions: ["480p", "720p", "1080p"],
    defaults: { aspect_ratio: "16:9", duration: 5, resolution: "720p" },
  },

  // Hailuo
  "hailuo-02-pro": {
    aspectRatios: ["16:9"],
    durations: [6, 10],
    resolutions: ["768p", "1080p"],
    promptOptimizer: true,
    defaults: { aspect_ratio: "16:9", duration: 6, resolution: "1080p", prompt_optimizer: true },
  },
  "hailuo-02-standard": {
    aspectRatios: ["16:9"],
    durations: [6],
    resolutions: ["768p"],
    defaults: { aspect_ratio: "16:9", duration: 6, resolution: "768p" },
  },
  "hailuo-01": {
    aspectRatios: ["16:9"],
    durations: [6],
    defaults: { aspect_ratio: "16:9", duration: 6 },
  },

  // Runway
  "runway-gen3-turbo": {
    aspectRatios: ["16:9", "9:16"],
    durations: [5, 10],
    defaults: { aspect_ratio: "16:9", duration: 5 },
  },

  // LTX
  "ltx-video-13b": {
    aspectRatios: STD_ASPECTS,
    durations: [5],
    defaults: { aspect_ratio: "16:9", duration: 5 },
  },
  "ltx-video": {
    aspectRatios: STD_ASPECTS,
    durations: [5],
    defaults: { aspect_ratio: "16:9", duration: 5 },
  },

  // Wan
  "wan-pro": {
    aspectRatios: STD_ASPECTS,
    durations: [5, 10],
    resolutions: ["480p", "720p"],
    defaults: { aspect_ratio: "16:9", duration: 5, resolution: "720p" },
  },
  "wan-v2.2-a14b": {
    aspectRatios: STD_ASPECTS,
    durations: [5, 10],
    resolutions: ["480p", "720p"],
    defaults: { aspect_ratio: "16:9", duration: 5, resolution: "720p" },
  },
};

const FALLBACK: ModelControls = {
  aspectRatios: ["16:9"],
  defaults: { aspect_ratio: "16:9" },
};

export function getModelControls(modelId: string): ModelControls {
  return CONTROLS[modelId] ?? FALLBACK;
}
