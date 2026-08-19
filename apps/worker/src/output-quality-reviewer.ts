import {
  CreativeBriefSchema,
  evaluateAcceptedOutput,
  type QualityDimension,
  type QualityObservation,
  type TemplateQualityPolicy,
} from "@movprompt/creative-engine";
import type { JsonObject } from "@movprompt/db";

import type { RenderOutputQualityReviewer } from "./render-lifecycle.js";

export type StoredCandidate = {
  bucket: string;
  objectKey: string;
  runId: string;
  projectId: string;
  projectVersionId: string;
};

export interface OutputQualityAnalyzer {
  readonly id: string;
  readonly dimensions: readonly QualityDimension[];
  analyze(input: {
    candidate: StoredCandidate;
    configuration: JsonObject;
    attemptNumber: number;
  }): Promise<QualityObservation[]>;
}

const DEFAULT_PREMIUM_POLICY: TemplateQualityPolicy = {
  tier: "premium",
  acceptanceScore: 85,
  internalRetryLimit: 2,
  hardGates: ["valid_media", "confirmed_facts_only", "safe_content"],
  scoredDimensions: [
    "technical",
    "product_identity",
    "prompt_adherence",
    "motion_realism",
    "visual_artifacts",
    "brand_safety",
    "dialect_fidelity",
    "speech_sync",
    "safe_zones",
    "compliance",
  ],
};

function generationConfiguration(configuration: JsonObject): JsonObject {
  const nested = configuration.generation;
  return nested && typeof nested === "object" && !Array.isArray(nested)
    ? nested as JsonObject
    : configuration;
}

function qualityPolicy(configuration: JsonObject): TemplateQualityPolicy {
  const creativeBrief = generationConfiguration(configuration).creativeBrief;
  const parsed = CreativeBriefSchema.safeParse(creativeBrief);
  return parsed.success ? parsed.data.qualityPolicy : DEFAULT_PREMIUM_POLICY;
}

/**
 * Combines independent technical, visual/identity and speech/dialect analyzers.
 * Missing dimensions score zero, so an incomplete analyzer setup can never
 * silently approve a production candidate.
 */
export function createComposedOutputQualityReviewer(
  analyzers: readonly OutputQualityAnalyzer[],
): RenderOutputQualityReviewer {
  if (!analyzers.length) throw new Error("quality_analyzers_required");
  const ids = analyzers.map((analyzer) => analyzer.id.trim());
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
    throw new Error("quality_analyzer_ids_must_be_unique");
  }

  return {
    async review(input) {
      const candidate: StoredCandidate = {
        bucket: input.bucket,
        objectKey: input.objectKey,
        runId: input.runId,
        projectId: input.projectId,
        projectVersionId: input.projectVersionId,
      };
      const observations = (
        await Promise.all(
          analyzers.map((analyzer) => analyzer.analyze({
            candidate,
            configuration: input.configuration,
            attemptNumber: input.attemptNumber,
          })),
        )
      ).flat();
      const dimensions = new Set<QualityDimension>();
      for (const observation of observations) {
        if (dimensions.has(observation.dimension)) {
          throw new Error(`duplicate_quality_dimension:${observation.dimension}`);
        }
        dimensions.add(observation.dimension);
      }
      return evaluateAcceptedOutput({
        observations,
        policy: qualityPolicy(input.configuration),
        attempt: input.attemptNumber,
      });
    },
  };
}
