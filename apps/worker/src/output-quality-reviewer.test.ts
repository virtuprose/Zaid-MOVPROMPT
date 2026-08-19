import type { QualityDimension } from "@movprompt/creative-engine";
import { describe, expect, it, vi } from "vitest";

import { createComposedOutputQualityReviewer, type OutputQualityAnalyzer } from "./output-quality-reviewer.js";

const dimensions: QualityDimension[] = [
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
];

function analyzer(id: string, selected: QualityDimension[], score = 96): OutputQualityAnalyzer {
  return {
    id,
    dimensions: selected,
    analyze: vi.fn(async () => selected.map((dimension) => ({ dimension, score }))),
  };
}

const input = {
  runId: "run",
  userId: "user",
  projectId: "project",
  projectVersionId: "version",
  bucket: "creator-outputs",
  objectKey: "user/project/version/candidate.mp4",
  attemptNumber: 0,
  configuration: { prompt: "Premium product campaign" },
};

describe("composed output quality reviewer", () => {
  it("accepts only when every premium quality dimension is supplied and passes", async () => {
    const reviewer = createComposedOutputQualityReviewer([
      analyzer("technical", ["technical"]),
      analyzer("visual", dimensions.slice(1, 9)),
      analyzer("compliance", ["compliance"]),
    ]);
    await expect(reviewer.review(input)).resolves.toMatchObject({ status: "accepted", score: 96 });
  });

  it("fails closed to a targeted retry when dialect evidence is missing", async () => {
    const reviewer = createComposedOutputQualityReviewer([
      analyzer("technical", ["technical"]),
      analyzer("visual", dimensions.filter((dimension) => dimension !== "technical" && dimension !== "dialect_fidelity")),
    ]);
    await expect(reviewer.review(input)).resolves.toMatchObject({
      status: "retry",
      failedDimensions: expect.arrayContaining(["dialect_fidelity"]),
    });
  });
});
