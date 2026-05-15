// Single source of truth for video model capabilities.
// Used both to render the model picker UI and to score recommendations.

import type { VideoModel, VideoModelId } from "./videoModels";

export type ModelStrength =
  | "cinematic"
  | "photoreal"
  | "stylized"
  | "anime"
  | "portrait"
  | "product"
  | "landscape"
  | "action"
  | "complex_motion"
  | "stable_subject"
  | "long_take"
  | "film_grain"
  | "text_in_frame"
  | "dialogue";

export type ModelCapabilities = {
  id: VideoModelId;
  family: VideoModel["family"];
  label: string;
  note?: string;
  audio: boolean;
  maxDurationSec: number;
  maxResolution: "480p" | "720p" | "768p" | "1080p";
  aspects: string[];
  speed: "fast" | "balanced" | "slow";
  cost: "low" | "mid" | "high";
  strengths: ModelStrength[];
};

const STD = ["16:9", "9:16", "1:1"];
const SEEDANCE = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"];

export const MODEL_CATALOG: ModelCapabilities[] = [
  // Kling
  { id: "kling-v2.5-turbo-pro", family: "kling", label: "Kling 2.5 Turbo Pro", note: "Latest, fastest pro tier",
    audio: false, maxDurationSec: 10, maxResolution: "1080p", aspects: STD, speed: "fast", cost: "mid",
    strengths: ["photoreal", "complex_motion", "long_take", "action"] },
  { id: "kling-v2.1-master", family: "kling", label: "Kling 2.1 Master",
    audio: false, maxDurationSec: 10, maxResolution: "1080p", aspects: STD, speed: "balanced", cost: "high",
    strengths: ["cinematic", "photoreal", "complex_motion", "long_take"] },
  { id: "kling-v2-master", family: "kling", label: "Kling 2 Master",
    audio: false, maxDurationSec: 10, maxResolution: "1080p", aspects: STD, speed: "balanced", cost: "high",
    strengths: ["cinematic", "photoreal", "complex_motion"] },
  { id: "kling-v1.6-pro", family: "kling", label: "Kling 1.6 Pro",
    audio: false, maxDurationSec: 10, maxResolution: "1080p", aspects: STD, speed: "balanced", cost: "mid",
    strengths: ["photoreal", "stable_subject"] },
  { id: "kling-v1.6-standard", family: "kling", label: "Kling 1.6 Standard",
    audio: false, maxDurationSec: 10, maxResolution: "720p", aspects: STD, speed: "fast", cost: "low",
    strengths: ["photoreal", "stable_subject"] },
  { id: "kling-v1.5-pro", family: "kling", label: "Kling 1.5 Pro",
    audio: false, maxDurationSec: 10, maxResolution: "1080p", aspects: STD, speed: "balanced", cost: "mid",
    strengths: ["photoreal"] },
  { id: "kling-v1-pro", family: "kling", label: "Kling 1.0 Pro",
    audio: false, maxDurationSec: 10, maxResolution: "720p", aspects: STD, speed: "balanced", cost: "low",
    strengths: ["photoreal"] },
  { id: "kling-v1-standard", family: "kling", label: "Kling 1.0 Standard",
    audio: false, maxDurationSec: 10, maxResolution: "720p", aspects: STD, speed: "fast", cost: "low",
    strengths: ["photoreal"] },

  // Veo
  { id: "veo-3.1", family: "veo", label: "Veo 3.1", note: "Latest, native audio",
    audio: true, maxDurationSec: 8, maxResolution: "1080p", aspects: STD, speed: "slow", cost: "high",
    strengths: ["photoreal", "cinematic", "dialogue", "complex_motion", "text_in_frame"] },
  { id: "veo-3.1-fast", family: "veo", label: "Veo 3.1 Fast",
    audio: true, maxDurationSec: 8, maxResolution: "1080p", aspects: STD, speed: "fast", cost: "mid",
    strengths: ["photoreal", "dialogue", "complex_motion"] },
  { id: "veo-3.1-lite", family: "veo", label: "Veo 3.1 Lite", note: "Faster, lower cost",
    audio: true, maxDurationSec: 8, maxResolution: "1080p", aspects: ["16:9", "9:16"], speed: "fast", cost: "low",
    strengths: ["photoreal", "dialogue"] },
  { id: "veo-3", family: "veo", label: "Veo 3",
    audio: true, maxDurationSec: 8, maxResolution: "1080p", aspects: ["16:9", "9:16"], speed: "slow", cost: "high",
    strengths: ["photoreal", "cinematic", "dialogue"] },
  { id: "veo-3-fast", family: "veo", label: "Veo 3 Fast",
    audio: true, maxDurationSec: 8, maxResolution: "1080p", aspects: ["16:9", "9:16"], speed: "fast", cost: "mid",
    strengths: ["photoreal", "dialogue"] },
  { id: "veo-2", family: "veo", label: "Veo 2",
    audio: false, maxDurationSec: 8, maxResolution: "720p", aspects: ["16:9", "9:16"], speed: "balanced", cost: "mid",
    strengths: ["photoreal", "cinematic"] },

  // Seedance
  { id: "seedance-2.0", family: "seedance", label: "Seedance 2.0", note: "Cinematic, native audio",
    audio: true, maxDurationSec: 10, maxResolution: "1080p", aspects: SEEDANCE, speed: "balanced", cost: "mid",
    strengths: ["cinematic", "photoreal", "film_grain", "portrait", "dialogue"] },
  { id: "seedance-2.0-fast", family: "seedance", label: "Seedance 2.0 Fast",
    audio: true, maxDurationSec: 10, maxResolution: "1080p", aspects: SEEDANCE, speed: "fast", cost: "low",
    strengths: ["cinematic", "photoreal", "film_grain"] },
  { id: "seedance-v1-pro", family: "seedance", label: "Seedance 1 Pro",
    audio: false, maxDurationSec: 10, maxResolution: "1080p", aspects: SEEDANCE, speed: "balanced", cost: "mid",
    strengths: ["cinematic", "film_grain", "portrait"] },
  { id: "seedance-v1-lite", family: "seedance", label: "Seedance 1 Lite", note: "Faster, lower cost",
    audio: false, maxDurationSec: 10, maxResolution: "720p", aspects: SEEDANCE, speed: "fast", cost: "low",
    strengths: ["cinematic", "stylized"] },

  // Hailuo
  { id: "hailuo-02-pro", family: "hailuo", label: "Hailuo 02 Pro",
    audio: false, maxDurationSec: 10, maxResolution: "1080p", aspects: ["16:9"], speed: "balanced", cost: "mid",
    strengths: ["stylized", "portrait", "anime", "complex_motion"] },
  { id: "hailuo-02-standard", family: "hailuo", label: "Hailuo 02 Standard",
    audio: false, maxDurationSec: 6, maxResolution: "768p", aspects: ["16:9"], speed: "fast", cost: "low",
    strengths: ["stylized", "portrait", "anime"] },
  { id: "hailuo-01", family: "hailuo", label: "Hailuo 01",
    audio: false, maxDurationSec: 6, maxResolution: "768p", aspects: ["16:9"], speed: "fast", cost: "low",
    strengths: ["stylized", "anime"] },

  // Runway
  { id: "runway-gen3-turbo", family: "runway", label: "Runway Gen-3 Turbo",
    audio: false, maxDurationSec: 10, maxResolution: "720p", aspects: ["16:9", "9:16"], speed: "fast", cost: "mid",
    strengths: ["cinematic", "photoreal", "stylized"] },

  // LTX
  { id: "ltx-video-13b", family: "ltx", label: "LTX Video 13B Distilled",
    audio: false, maxDurationSec: 5, maxResolution: "720p", aspects: STD, speed: "fast", cost: "low",
    strengths: ["stylized", "stable_subject"] },
  { id: "ltx-video", family: "ltx", label: "LTX Video",
    audio: false, maxDurationSec: 5, maxResolution: "720p", aspects: STD, speed: "fast", cost: "low",
    strengths: ["stylized"] },

  // Wan
  { id: "wan-pro", family: "wan", label: "Wan Pro",
    audio: false, maxDurationSec: 10, maxResolution: "720p", aspects: STD, speed: "balanced", cost: "mid",
    strengths: ["photoreal", "stylized"] },
  { id: "wan-v2.2-a14b", family: "wan", label: "Wan 2.2 A14B",
    audio: false, maxDurationSec: 10, maxResolution: "720p", aspects: STD, speed: "balanced", cost: "low",
    strengths: ["stylized"] },
];

export const CATALOG_BY_ID: Record<string, ModelCapabilities> = Object.fromEntries(
  MODEL_CATALOG.map((m) => [m.id, m]),
);

export function getCapabilities(id: string): ModelCapabilities | undefined {
  return CATALOG_BY_ID[id];
}

/**
 * Compact one-line summary used by the LLM system prompt.
 */
export function catalogPromptLines(): string {
  return MODEL_CATALOG.map((m) => {
    const audio = m.audio ? "audio" : "no-audio";
    return `- ${m.id} — ${m.family}, max ${m.maxDurationSec}s, ${m.maxResolution}, ${audio}, ${m.speed}/${m.cost}, strengths: ${m.strengths.join("+")}`;
  }).join("\n");
}
