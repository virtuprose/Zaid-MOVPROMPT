import { describe, expect, it } from "vitest";
import {
  ApiErrorEnvelopeSchema,
  CreateAssetUploadRequestSchema,
  CapabilityAliasSchema,
  ExportJobPayloadSchema,
  GenerationJobPayloadSchema,
  CreateGenerationQuoteRequestSchema,
  StartRenderRunRequestSchema,
} from "./index.js";

describe("public contracts", () => {
  it("accepts only approved capability aliases", () => {
    expect(CapabilityAliasSchema.parse("video.seedance.latest")).toBe("video.seedance.latest");
    expect(() => CapabilityAliasSchema.parse("fal-ai/kling-video/v2.1/master")).toThrow();
    expect(() => CapabilityAliasSchema.parse("seedance-2.0-ref")).toThrow();
  });

  it("rejects extra generation fields so raw provider settings cannot pass through", () => {
    const payload = {
      renderRunId: "run-1",
      userId: "user-1",
      projectId: "project-1",
      projectVersionId: "version-1",
      quoteId: "quote-1",
      capability: "video.seedance.latest",
      idempotencyKey: "generation:run-1",
      requestId: "request-1",
      providerModelId: "seedance-2.0-ref",
    };

    expect(() => GenerationJobPayloadSchema.parse(payload)).toThrow();
  });

  it("validates deterministic export job fields", () => {
    const result = ExportJobPayloadSchema.parse({
      exportId: "export-1",
      userId: "user-1",
      projectId: "project-1",
      projectVersionId: "version-1",
      sourceObjectKey: "user-1/project-1/source.mp4",
      outputObjectKey: "user-1/project-1/export-1.mp4",
      aspectRatio: "4:5",
      resolution: "1080p",
      idempotencyKey: "export:export-1",
      requestId: "request-1",
    });

    expect(result.aspectRatio).toBe("4:5");
  });

  it("uses one stable API error envelope", () => {
    expect(
      ApiErrorEnvelopeSchema.parse({
        error: {
          code: "validation_failed",
          message: "The request is invalid.",
          retryable: false,
          requestId: "request-1",
        },
      }),
    ).toEqual({
      error: {
        code: "validation_failed",
        message: "The request is invalid.",
        retryable: false,
        requestId: "request-1",
      },
    });
  });

  it("rejects client-controlled ownership fields from asset upload requests", () => {
    expect(() =>
      CreateAssetUploadRequestSchema.parse({
        kind: "product",
        userId: "attacker-controlled-user",
        metadata: {
          mimeType: "image/jpeg",
          sizeBytes: 1_024,
          checksumSha256: "a".repeat(64),
        },
      }),
    ).toThrow();
  });

  it("keeps provider IDs and entitlement decisions out of quote requests", () => {
    expect(() =>
      CreateGenerationQuoteRequestSchema.parse({
        capability: "video.seedance.latest",
        providerModelId: "private-provider-model",
        entitlementEligible: true,
        configuration: { prompt: "A product reveal" },
      }),
    ).toThrow();
  });

  it("requires render ownership to come from authentication rather than the request", () => {
    expect(() =>
      StartRenderRunRequestSchema.parse({
        userId: "11111111-1111-4111-8111-111111111111",
        projectId: "22222222-2222-4222-8222-222222222222",
        projectVersionId: "33333333-3333-4333-8333-333333333333",
        quoteId: "44444444-4444-4444-8444-444444444444",
        rightsAttested: true,
      }),
    ).toThrow();
  });
});
