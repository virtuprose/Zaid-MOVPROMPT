import { randomUUID } from "node:crypto";

import { CapabilityRegistry } from "@movprompt/providers";
import { describe, expect, it, vi } from "vitest";

import { createGenerationPricingFromEnvironment } from "./generation-pricing.js";
import type { GenerationRepository, OwnedRenderRun } from "./generation-repository.js";
import {
  createGenerationApiService,
  GenerationApplicationError,
} from "./generation-service.js";

function ownedRun(overrides: Partial<OwnedRenderRun> = {}): OwnedRenderRun {
  const now = new Date("2026-08-14T12:00:00.000Z");
  return {
    id: randomUUID(),
    projectId: randomUUID(),
    projectVersionId: randomUUID(),
    capabilityAlias: "video.product_fidelity",
    quoteId: randomUUID(),
    quotedCredits: 80,
    chargedCredits: 0,
    starterEntitlementUsed: true,
    status: "submitting",
    processingStage: "preparing",
    provider: null,
    providerRequestId: null,
    outputBucket: null,
    outputObjectKey: null,
    errorCode: null,
    errorMessage: null,
    chargedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function repository(run: OwnedRenderRun): GenerationRepository {
  return {
    findOwnedProjectVersion: vi.fn(async () => null),
    findOwnedReferenceAssets: vi.fn(async () => []),
    findPublishedTemplateVersion: vi.fn(async () => null),
    hasAvailableStarterEntitlement: vi.fn(async () => false),
    findOwnedQuote: vi.fn(async () => null),
    findOwnedRun: vi.fn(async () => run),
    listOwnedRuns: vi.fn(async () => [run]),
    requestOutputRecovery: vi.fn(async () => run),
    requestProviderCancellation: vi.fn(async () => null),
  };
}

function service(run: OwnedRenderRun) {
  const releaseRenderReservation = vi.fn(async () => {
    run.status = "cancelled";
    return {} as never;
  });
  return {
    api: createGenerationApiService({
      repository: repository(run),
      generation: {
        createQuote: vi.fn(async () => ({} as never)),
        startRender: vi.fn(async () => ({} as never)),
        releaseRenderReservation,
      },
      pricing: createGenerationPricingFromEnvironment({
        GENERATION_PRICING_VERSION: "test-v1",
        GENERATION_QUOTE_TTL_SECONDS: "900",
        GENERATION_VIDEO_PRODUCT_FIDELITY_720P_CREDITS_PER_SECOND: "10",
      }),
      capabilities: new CapabilityRegistry({
        "video.product_fidelity": {
          enabled: true,
          adapterId: "vercel-ai-gateway",
          providerModelId: "bytedance/seedance-2.5",
        },
      }),
    }),
    releaseRenderReservation,
  };
}

describe("generation cancellation safety", () => {
  it("does not release a submitting render after the worker records a provider start marker", async () => {
    const userId = randomUUID();
    const run = ownedRun({ provider: "vercel-ai-gateway" });
    const { api, releaseRenderReservation } = service(run);

    await expect(api.cancelRender(userId, run.id, "cancel:run-1")).rejects.toMatchObject({
      code: "provider_acceptance_in_progress",
    } satisfies Partial<GenerationApplicationError>);
    expect(releaseRenderReservation).not.toHaveBeenCalled();
  });

  it("releases a submitting render only when no provider start can be in flight", async () => {
    const userId = randomUUID();
    const run = ownedRun();
    const { api, releaseRenderReservation } = service(run);

    await expect(api.cancelRender(userId, run.id, "cancel:run-2")).resolves.toMatchObject({
      status: "cancelled",
    });
    expect(releaseRenderReservation).toHaveBeenCalledOnce();
  });

  it("does not claim a Gateway render was cancelled when the provider exposes no cancel operation", async () => {
    const userId = randomUUID();
    const run = ownedRun({
      status: "processing",
      provider: "vercel-ai-gateway",
      providerRequestId: "vgw4.operation",
      chargedAt: new Date("2026-08-14T12:00:10.000Z"),
    });
    const { api, releaseRenderReservation } = service(run);

    await expect(api.cancelRender(userId, run.id, "cancel:run-3")).rejects.toMatchObject({
      code: "render_not_cancellable",
      message: expect.stringContaining("does not currently expose"),
    } satisfies Partial<GenerationApplicationError>);
    expect(releaseRenderReservation).not.toHaveBeenCalled();
  });
});

describe("existing provider output recovery", () => {
  it("requeues only the accepted provider operation and never starts a new render", async () => {
    const userId = randomUUID();
    const run = ownedRun({
      status: "failed",
      processingStage: "failed",
      provider: "vercel-ai-gateway",
      providerRequestId: "vgw4.existing-operation",
      chargedAt: new Date("2026-08-14T12:00:10.000Z"),
      errorCode: "provider_output_host_not_allowed",
      errorMessage: "provider_output_host_not_allowed:ark-acg.example",
    });
    const repo = repository(run);
    repo.requestOutputRecovery = vi.fn(async () => ({
      ...run,
      status: "processing",
      processingStage: "securing_output",
      errorCode: null,
      errorMessage: null,
    }));
    const startRender = vi.fn(async () => ({} as never));
    const api = createGenerationApiService({
      repository: repo,
      generation: {
        createQuote: vi.fn(async () => ({} as never)),
        startRender,
        releaseRenderReservation: vi.fn(async () => ({} as never)),
      },
      pricing: createGenerationPricingFromEnvironment({
        GENERATION_PRICING_VERSION: "test-v1",
        GENERATION_QUOTE_TTL_SECONDS: "900",
        GENERATION_VIDEO_PRODUCT_FIDELITY_720P_CREDITS_PER_SECOND: "10",
      }),
      capabilities: new CapabilityRegistry({
        "video.product_fidelity": {
          enabled: true,
          adapterId: "vercel-ai-gateway",
          providerModelId: "bytedance/seedance-2.5",
        },
      }),
    });

    await expect(api.retryRenderOutput(userId, run.id, "recover-existing-operation")).resolves.toMatchObject({
      id: run.id,
      status: "processing",
      processingStage: "securing_output",
    });
    expect(repo.requestOutputRecovery).toHaveBeenCalledOnce();
    expect(startRender).not.toHaveBeenCalled();
  });
});

describe("starter-only private beta", () => {
  it("allows an unverified private-beta account to use its provisioned starter render", async () => {
    const userId = randomUUID();
    const templateVersionId = randomUUID();
    const repo = repository(ownedRun());
    repo.findPublishedTemplateVersion = vi.fn(async () => ({
      id: templateVersionId,
      durationSeconds: 8,
      starterRenderEligible: true,
    }));
    repo.hasAvailableStarterEntitlement = vi.fn(async () => true);
    const api = createGenerationApiService({
      repository: repo,
      generation: {
        createQuote: vi.fn(async () => ({} as never)),
        startRender: vi.fn(async () => ({} as never)),
        releaseRenderReservation: vi.fn(async () => ({} as never)),
      },
      pricing: createGenerationPricingFromEnvironment({
        GENERATION_PRICING_VERSION: "test-v1",
        GENERATION_QUOTE_TTL_SECONDS: "900",
        GENERATION_VIDEO_PRODUCT_FIDELITY_720P_CREDITS_PER_SECOND: "10",
      }),
      capabilities: new CapabilityRegistry({
        "video.product_fidelity": {
          enabled: true,
          adapterId: "vercel-ai-gateway",
          providerModelId: "bytedance/seedance-2.5",
        },
      }),
      starterOnly: true,
      starterEligibilityRequiresEmailVerification: false,
    });

    const quote = await api.createQuote({
      capability: "video.product_fidelity",
      templateVersionId,
      configuration: {
        prompt: "Create a product-faithful private-beta campaign.",
        durationSeconds: 8,
        resolution: "720p",
        audio: false,
        references: [],
      },
    }, {
      user: {
        id: userId,
        email: "private-beta@example.test",
        emailVerified: false,
        name: "Private Beta",
      },
      session: { id: "private-beta-session" },
    });

    expect(quote.entitlementEligible).toBe(true);
    expect(repo.hasAvailableStarterEntitlement).toHaveBeenCalledWith(userId);
  });

  it("rejects a paid-credit quote before submitting any provider work", async () => {
    const userId = randomUUID();
    const projectId = randomUUID();
    const versionId = randomUUID();
    const quoteId = randomUUID();
    const startRender = vi.fn(async () => ({} as never));
    const repo = repository(ownedRun());
    repo.findOwnedProjectVersion = vi.fn(async () => ({
      id: versionId,
      projectId,
      templateVersionId: null,
      configuration: {},
    }));
    repo.findOwnedQuote = vi.fn(async () => ({
      id: quoteId,
      templateVersionId: null,
      capabilityAlias: "video.product_fidelity",
      credits: 80,
      entitlementEligible: false,
      configurationHash: "not-read-after-starter-check",
      expiresAt: new Date("2026-08-15T13:00:00.000Z"),
    }));
    const api = createGenerationApiService({
      repository: repo,
      generation: {
        createQuote: vi.fn(async () => ({} as never)),
        startRender,
        releaseRenderReservation: vi.fn(async () => ({} as never)),
      },
      pricing: createGenerationPricingFromEnvironment({
        GENERATION_PRICING_VERSION: "test-v1",
        GENERATION_QUOTE_TTL_SECONDS: "900",
        GENERATION_VIDEO_PRODUCT_FIDELITY_720P_CREDITS_PER_SECOND: "10",
      }),
      capabilities: new CapabilityRegistry({
        "video.product_fidelity": {
          enabled: true,
          adapterId: "vercel-ai-gateway",
          providerModelId: "bytedance/seedance-2.5",
        },
      }),
      starterOnly: true,
    });

    await expect(api.startRender({
      userId,
      projectId,
      projectVersionId: versionId,
      quoteId,
      idempotencyKey: `render:${randomUUID()}`,
    })).rejects.toMatchObject({ code: "starter_entitlement_unavailable" });
    expect(startRender).not.toHaveBeenCalled();
  });
});

describe("generation reference ownership", () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  const projectId = "22222222-2222-4222-8222-222222222222";
  const versionId = "33333333-3333-4333-8333-333333333333";
  const checksum = "a".repeat(64);
  const ownedKey = `users/${userId}/projects/${projectId}/assets/product/44444444-4444-4444-8444-444444444444/${checksum}`;

  function quoteService(objectKey: string, configuredMime: string, persistedMime = configuredMime) {
    const createQuote = vi.fn(async () => ({} as never));
    const repo: GenerationRepository = {
      findOwnedProjectVersion: vi.fn(async () => ({
        id: versionId,
        projectId,
        templateVersionId: null,
        configuration: {
          generation: {
            prompt: "Create a faithful product campaign.",
            durationSeconds: 8,
            references: [{ objectKey, mimeType: configuredMime }],
          },
        },
      })),
      findOwnedReferenceAssets: vi.fn(async () => [{
        objectKey,
        bucket: "creator-assets",
        mimeType: persistedMime,
        sizeBytes: 2048,
        checksumSha256: checksum,
      }]),
      findPublishedTemplateVersion: vi.fn(async () => null),
      hasAvailableStarterEntitlement: vi.fn(async () => false),
      findOwnedQuote: vi.fn(async () => null),
      findOwnedRun: vi.fn(async () => null),
      listOwnedRuns: vi.fn(async () => []),
      requestOutputRecovery: vi.fn(async () => null),
      requestProviderCancellation: vi.fn(async () => null),
    };
    return {
      createQuote,
      repo,
      api: createGenerationApiService({
        repository: repo,
        generation: {
          createQuote,
          startRender: vi.fn(async () => ({} as never)),
          releaseRenderReservation: vi.fn(async () => ({} as never)),
        },
        pricing: createGenerationPricingFromEnvironment({
          GENERATION_PRICING_VERSION: "test-v1",
          GENERATION_QUOTE_TTL_SECONDS: "900",
          GENERATION_VIDEO_PRODUCT_FIDELITY_720P_CREDITS_PER_SECOND: "10",
        }),
        capabilities: new CapabilityRegistry({
          "video.product_fidelity": {
            enabled: true,
            adapterId: "vercel-ai-gateway",
            providerModelId: "bytedance/seedance-2.5",
          },
        }),
      }),
    };
  }

  const session = {
    user: {
      id: userId,
      email: "owner@example.test",
      emailVerified: true,
      name: "Owner",
      role: "user" as const,
    },
    session: { id: "session" },
  };

  it("rejects a reference outside the owned project namespace before pricing is persisted", async () => {
    const foreignKey = `users/${"99999999-9999-4999-8999-999999999999"}/projects/${projectId}/assets/product/44444444-4444-4444-8444-444444444444/${checksum}`;
    const { api, createQuote, repo } = quoteService(foreignKey, "image/jpeg");

    await expect(api.createQuote({
      capability: "video.product_fidelity",
      projectVersionId: versionId,
    }, session)).rejects.toMatchObject({ code: "invalid_generation_reference" });
    expect(repo.findOwnedReferenceAssets).not.toHaveBeenCalled();
    expect(createQuote).not.toHaveBeenCalled();
  });

  it("rejects client MIME that does not match the authoritative owned asset row", async () => {
    const { api, createQuote } = quoteService(ownedKey, "image/jpeg", "image/webp");

    await expect(api.createQuote({
      capability: "video.product_fidelity",
      projectVersionId: versionId,
    }, session)).rejects.toMatchObject({ code: "invalid_generation_reference" });
    expect(createQuote).not.toHaveBeenCalled();
  });
});
