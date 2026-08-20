import { randomUUID } from "node:crypto";

import { CapabilityRegistry } from "@movprompt/providers";
import { describe, expect, it, vi } from "vitest";

import { createGenerationPricingFromEnvironment } from "./generation-pricing.js";
import type { GenerationRepository, OwnedRenderRun } from "./generation-repository.js";
import {
  createGenerationApiService,
  GenerationApplicationError,
} from "./generation-service.js";
import { hashGenerationConfiguration } from "@movprompt/db";

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
    findOwnedPresenterFootageAsset: vi.fn(async () => null),
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
      eligibility: {
        goals: ["launch"],
        supportedLanguages: ["en", "ar", "bilingual"],
        supportedRatios: ["9:16", "1:1", "4:5", "16:9"],
        supportedMarkets: ["KW"],
        requiredInputs: [],
        capabilityPolicy: ["video.cinematic"],
      },
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
        GENERATION_VIDEO_CINEMATIC_720P_CREDITS_PER_SECOND: "10",
      }),
      capabilities: new CapabilityRegistry({
        "video.product_fidelity": {
          enabled: true,
          adapterId: "vercel-ai-gateway",
          providerModelId: "bytedance/seedance-2.5",
        },
        "video.cinematic": {
          enabled: true,
          adapterId: "vercel-ai-gateway",
          providerModelId: "bytedance/seedance-2.5",
        },
      }),
      starterOnly: true,
      starterEligibilityRequiresEmailVerification: false,
    });

    const quote = await api.createQuote({
      templateVersionId,
      configuration: {
        prompt: "Create a product-faithful private-beta campaign.",
        durationSeconds: 8,
        aspectRatio: "9:16",
        resolution: "720p",
        audio: false,
        references: [],
        creativeBrief: {
          market: "KW",
          language: "en",
          goal: "launch",
          product: {
            name: "Confirmed product",
            callToAction: "Shop now",
          },
        },
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
    const createQuote = vi.fn(async () => ({
      id: "66666666-6666-4666-8666-666666666666",
      credits: 80,
      entitlementEligible: false,
      configurationHash: "a".repeat(64),
      expiresAt: new Date("2026-08-20T18:00:00.000Z"),
      breakdown: [{ label: "test", credits: 80 }],
    } as never));
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
      findOwnedPresenterFootageAsset: vi.fn(async () => null),
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

describe("template quote eligibility", () => {
  const templateVersionId = "11111111-1111-4111-8111-111111111111";

  function quoteConfiguration(goal = "launch") {
    return {
      prompt: "Create a faithful campaign for the confirmed product.",
      durationSeconds: 8,
      aspectRatio: "9:16" as const,
      resolution: "720p" as const,
      audio: true,
      references: [],
      creativeBrief: {
        market: "KW",
        language: "en",
        goal,
        product: {
          name: "Confirmed product",
          brand: "Confirmed brand",
          callToAction: "Shop now",
        },
      },
    };
  }

  function eligibleTemplate() {
    return {
      id: templateVersionId,
      durationSeconds: 8,
      starterRenderEligible: true,
      eligibility: {
        goals: ["launch"],
        supportedLanguages: ["en", "ar", "bilingual"],
        supportedRatios: ["9:16", "1:1", "4:5", "16:9"],
        supportedMarkets: ["KW"],
        requiredInputs: ["subject_name", "call_to_action"],
        capabilityPolicy: ["video.cinematic"],
      },
    };
  }

  function quoteApi(template = eligibleTemplate()) {
    const repo = repository(ownedRun());
    repo.findPublishedTemplateVersion = vi.fn(async () => template);
    return {
      repo,
      api: createGenerationApiService({
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
          GENERATION_VIDEO_CINEMATIC_720P_CREDITS_PER_SECOND: "10",
        }),
        capabilities: new CapabilityRegistry({
          "video.product_fidelity": {
            enabled: true,
            adapterId: "vercel-ai-gateway",
            providerModelId: "bytedance/seedance-2.5",
          },
          "video.cinematic": {
            enabled: true,
            adapterId: "vercel-ai-gateway",
            providerModelId: "bytedance/seedance-2.5",
          },
        }),
      }),
    };
  }

  it("returns a configuration-bound estimate only for a matching published template", async () => {
    const { api } = quoteApi();

    await expect(api.createQuote({
      capability: "video.product_fidelity",
      templateVersionId,
      configuration: quoteConfiguration(),
    }, null)).resolves.toMatchObject({
      quoteId: null,
      credits: 80,
      estimateOnly: true,
    });
  });

  it("chooses the published service-template capability for guest quotes instead of the browser preference", async () => {
    const { api } = quoteApi();

    await expect(api.createQuote({
      capability: "video.product_fidelity",
      templateVersionId,
      configuration: quoteConfiguration(),
    }, null)).resolves.toMatchObject({
      capability: "video.cinematic",
      estimateOnly: true,
    });
  });

  it("chooses product fidelity only when the immutable template requires a reference image", async () => {
    const productTemplate = {
      ...eligibleTemplate(),
      eligibility: {
        ...eligibleTemplate().eligibility!,
        requiredInputs: ["product_image", "subject_name", "call_to_action"],
        capabilityPolicy: ["video.cinematic", "video.product_fidelity"],
      },
    };
    const { api } = quoteApi(productTemplate);

    await expect(api.createQuote({
      templateVersionId,
      configuration: {
        ...quoteConfiguration(),
        references: [{ objectKey: "guest-reference", mimeType: "image/jpeg" }],
      },
    }, null)).resolves.toMatchObject({ capability: "video.product_fidelity" });
  });

  it("uses the stored template policy for authenticated project-version quotes", async () => {
    const projectId = randomUUID();
    const versionId = randomUUID();
    const repo = repository(ownedRun());
    const storedQuote = vi.fn(async () => ({
      id: randomUUID(),
      credits: 80,
      entitlementEligible: false,
      configurationHash: "a".repeat(64),
      expiresAt: new Date("2026-08-20T18:00:00.000Z"),
      breakdown: [{ label: "test", credits: 80 }],
    } as never));
    repo.findOwnedProjectVersion = vi.fn(async () => ({
      id: versionId,
      projectId,
      templateVersionId,
      configuration: { generation: quoteConfiguration() },
    }));
    repo.findPublishedTemplateVersion = vi.fn(async () => eligibleTemplate());
    const api = createGenerationApiService({
      repository: repo,
      generation: {
        createQuote: storedQuote,
        startRender: vi.fn(async () => ({} as never)),
        releaseRenderReservation: vi.fn(async () => ({} as never)),
      },
      pricing: createGenerationPricingFromEnvironment({
        GENERATION_PRICING_VERSION: "test-v1",
        GENERATION_QUOTE_TTL_SECONDS: "900",
        GENERATION_VIDEO_CINEMATIC_720P_CREDITS_PER_SECOND: "10",
      }),
      capabilities: new CapabilityRegistry({
        "video.cinematic": {
          enabled: true,
          adapterId: "vercel-ai-gateway",
          providerModelId: "bytedance/seedance-2.5",
        },
      }),
    });

    await expect(api.createQuote({ projectVersionId: versionId }, {
      user: { id: randomUUID(), email: "owner@example.test", emailVerified: true, name: "Owner", role: "user" },
      session: { id: "session" },
    })).resolves.toMatchObject({ capability: "video.cinematic", estimateOnly: false });
    expect(storedQuote).toHaveBeenCalledWith(expect.objectContaining({ capabilityAlias: "video.cinematic" }));
  });

  it("rejects a catalog-ineligible goal before returning an estimate or credits", async () => {
    const { api } = quoteApi();

    await expect(api.createQuote({
      capability: "video.product_fidelity",
      templateVersionId,
      configuration: quoteConfiguration("bookings"),
    }, null)).rejects.toMatchObject({
      code: "template_configuration_ineligible",
    } satisfies Partial<GenerationApplicationError>);
  });
});

describe("template quote rejection", () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  const projectId = "22222222-2222-4222-8222-222222222222";
  const versionId = "33333333-3333-4333-8333-333333333333";
  const templateVersionId = "44444444-4444-4444-8444-444444444444";

  const configuration = {
    prompt: "Create an eligible Kuwait campaign.",
    durationSeconds: 8,
    aspectRatio: "9:16" as const,
    resolution: "720p" as const,
    audio: false,
    references: [],
    creativeBrief: {
      market: "KW",
      language: "en",
      goal: "launch",
      product: { name: "Confirmed product", callToAction: "Shop now" },
    },
  };

  function publishedTemplate(overrides: Record<string, unknown> = {}) {
    return {
      id: templateVersionId,
      durationSeconds: 8,
      starterRenderEligible: false,
      eligibility: {
        goals: ["launch"],
        supportedLanguages: ["en"],
        supportedRatios: ["9:16"],
        supportedMarkets: ["KW"],
        requiredInputs: ["subject_name", "call_to_action"],
        capabilityPolicy: ["video.cinematic"],
        ...overrides,
      },
    };
  }

  function apiFor(template = publishedTemplate()) {
    const repo = repository(ownedRun());
    const createQuote = vi.fn(async () => ({
      id: randomUUID(),
      credits: 80,
      entitlementEligible: false,
      configurationHash: "a".repeat(64),
      expiresAt: new Date("2026-08-20T15:00:00.000Z"),
      breakdown: [{ label: "test", credits: 80 }],
    } as never));
    const startRender = vi.fn(async () => ownedRun({ projectId, projectVersionId: versionId }));
    repo.findPublishedTemplateVersion = vi.fn(async () => template);
    return {
      repo,
      createQuote,
      startRender,
      api: createGenerationApiService({
        repository: repo,
        generation: {
          createQuote,
          startRender,
          releaseRenderReservation: vi.fn(async () => ({} as never)),
        },
        pricing: createGenerationPricingFromEnvironment({
          GENERATION_PRICING_VERSION: "test-v1",
          GENERATION_QUOTE_TTL_SECONDS: "900",
          GENERATION_VIDEO_CINEMATIC_720P_CREDITS_PER_SECOND: "10",
        }),
        capabilities: new CapabilityRegistry({
          "video.cinematic": {
            enabled: true,
            adapterId: "vercel-ai-gateway",
            providerModelId: "bytedance/seedance-2.5",
          },
        }),
      }),
    };
  }

  const session = {
    user: { id: userId, email: "owner@example.test", emailVerified: true, name: "Owner", role: "user" as const },
    session: { id: "session" },
  };

  it("rejects a guest configuration that omits a catalog-required input without returning credits", async () => {
    const { api, createQuote } = apiFor(publishedTemplate({ requiredInputs: ["primary_reference"] }));

    await expect(api.createQuote({
      capability: "video.cinematic",
      templateVersionId,
      configuration,
    }, null)).rejects.toMatchObject({ code: "template_configuration_ineligible" });
    expect(createQuote).not.toHaveBeenCalled();
  });

  it("rejects WhatsApp-only booking templates for quote and submission", async () => {
    const bookingTemplate = publishedTemplate({
      goals: ["launch"],
      requiredInputs: ["subject_name", "booking_destination"],
    });
    const whatsappOnly = {
      ...configuration,
      templateQuoteContext: { bookingUrl: "", whatsapp: "+965 50000000" },
      creativeBrief: {
        ...configuration.creativeBrief,
        product: { ...configuration.creativeBrief.product, whatsapp: "+965 50000000" },
      },
    };
    const { api, createQuote, repo, startRender } = apiFor(bookingTemplate);

    await expect(api.createQuote({
      capability: "video.cinematic",
      templateVersionId,
      configuration: whatsappOnly,
    }, null)).rejects.toMatchObject({ code: "template_configuration_ineligible" });
    expect(createQuote).not.toHaveBeenCalled();

    const boundConfiguration = {
      capability: "video.cinematic",
      pricingVersion: "test-v1",
      templateVersionId,
      generation: whatsappOnly,
    };
    repo.findOwnedProjectVersion = vi.fn(async () => ({
      id: versionId,
      projectId,
      templateVersionId,
      configuration: { generation: whatsappOnly },
    }));
    repo.findOwnedQuote = vi.fn(async () => ({
      id: "55555555-5555-4555-8555-555555555555",
      templateVersionId,
      capabilityAlias: "video.cinematic",
      credits: 80,
      entitlementEligible: false,
      configurationHash: hashGenerationConfiguration(boundConfiguration),
      expiresAt: new Date("2026-08-20T18:00:00.000Z"),
    }));

    await expect(api.startRender({
      userId,
      projectId,
      projectVersionId: versionId,
      quoteId: "55555555-5555-4555-8555-555555555555",
      idempotencyKey: "booking-whatsapp-only",
    })).rejects.toMatchObject({ code: "template_configuration_ineligible" });
    expect(startRender).not.toHaveBeenCalled();
  });

  it("rejects an owned project configuration that contradicts the published language policy", async () => {
    const { api, createQuote, repo } = apiFor();
    repo.findOwnedProjectVersion = vi.fn(async () => ({
      id: versionId,
      projectId,
      templateVersionId,
      configuration: { generation: { ...configuration, creativeBrief: { ...configuration.creativeBrief, language: "ar" } } },
    }));

    await expect(api.createQuote({ capability: "video.cinematic", projectVersionId: versionId }, session))
      .rejects.toMatchObject({ code: "template_configuration_ineligible" });
    expect(createQuote).not.toHaveBeenCalled();
  });

  it("revalidates published template eligibility at render submission before reserving work", async () => {
    const template = publishedTemplate({ goals: ["bookings"] });
    const { api, repo, startRender } = apiFor(template);
    const boundConfiguration = {
      capability: "video.cinematic",
      pricingVersion: "test-v1",
      templateVersionId,
      generation: configuration,
    };
    repo.findOwnedProjectVersion = vi.fn(async () => ({
      id: versionId,
      projectId,
      templateVersionId,
      configuration: { generation: configuration },
    }));
    repo.findOwnedQuote = vi.fn(async () => ({
      id: "55555555-5555-4555-8555-555555555555",
      templateVersionId,
      capabilityAlias: "video.cinematic",
      credits: 80,
      entitlementEligible: false,
      configurationHash: hashGenerationConfiguration(boundConfiguration),
      expiresAt: new Date("2026-08-20T15:00:00.000Z"),
    }));

    await expect(api.startRender({
      userId,
      projectId,
      projectVersionId: versionId,
      quoteId: "55555555-5555-4555-8555-555555555555",
      idempotencyKey: "render-template-revalidate-1",
    })).rejects.toMatchObject({ code: "template_configuration_ineligible" });
    expect(startRender).not.toHaveBeenCalled();
  });

  for (const protectedInput of [
    "verified_clinic_identity",
    "confirmed_service",
    "approved_claims",
    "verified_qualification",
    "approved_transcript",
    "consented_before_video",
    "consented_after_video",
    "consented_customer_video",
    "consented_founder_reference",
    "consented_person_reference",
  ] as const) {
    it(`fails closed for protected ${protectedInput} on quote and render submission`, async () => {
      const template = publishedTemplate({ requiredInputs: [protectedInput] });
      const { api, createQuote, repo, startRender } = apiFor(template);

      await expect(api.createQuote({
        capability: "video.cinematic",
        templateVersionId,
        configuration,
      }, null)).rejects.toMatchObject({ code: "template_configuration_ineligible" });
      expect(createQuote).not.toHaveBeenCalled();

      const boundConfiguration = {
        capability: "video.cinematic",
        pricingVersion: "test-v1",
        templateVersionId,
        generation: configuration,
      };
      repo.findOwnedProjectVersion = vi.fn(async () => ({
        id: versionId,
        projectId,
        templateVersionId,
        configuration: { generation: configuration },
      }));
      repo.findOwnedQuote = vi.fn(async () => ({
        id: "55555555-5555-4555-8555-555555555555",
        templateVersionId,
        capabilityAlias: "video.cinematic",
        credits: 80,
        entitlementEligible: false,
        configurationHash: hashGenerationConfiguration(boundConfiguration),
        expiresAt: new Date("2026-08-20T18:00:00.000Z"),
      }));

      await expect(api.startRender({
        userId,
        projectId,
        projectVersionId: versionId,
        quoteId: "55555555-5555-4555-8555-555555555555",
        idempotencyKey: `protected-${protectedInput}`,
      })).rejects.toMatchObject({ code: "template_configuration_ineligible" });
      expect(startRender).not.toHaveBeenCalled();
    });
  }
});

describe("presenter eligibility", () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  const projectId = "22222222-2222-4222-8222-222222222222";
  const versionId = "33333333-3333-4333-8333-333333333333";
  const templateVersionId = "44444444-4444-4444-8444-444444444444";
  const assetId = "55555555-5555-4555-8555-555555555555";
  const baseConfiguration = {
    generation: {
      prompt: "Create a consent-safe presenter campaign.",
      durationSeconds: 8,
      aspectRatio: "9:16" as const,
      resolution: "720p" as const,
      audio: true,
      references: [],
      templateQuoteContext: { market: "KW", language: "en", goal: "launch" },
      creativeBrief: { market: "KW", language: "en", goal: "launch", product: { name: "Confirmed item", callToAction: "Shop now" } },
    },
  };
  const template = {
    id: templateVersionId,
    durationSeconds: 8,
    starterRenderEligible: false,
    eligibility: {
      goals: ["launch"],
      supportedLanguages: ["en"],
      supportedRatios: ["9:16"],
      supportedMarkets: ["KW"],
      requiredInputs: ["subject_name", "call_to_action"],
      capabilityPolicy: ["video.cinematic"],
    },
    supportedLanguages: ["en"],
    presenterModes: ["none", "uploaded_spokesperson", "ai_ugc"] as const,
  };
  const session = {
    user: { id: userId, email: "owner@example.test", emailVerified: true, name: "Owner", role: "user" as const },
    session: { id: "session" },
  };

  function presenterApi(input: {
    presenter: unknown;
    footage?: { id: string; mimeType: string; sizeBytes: number; checksumSha256: string | null; durationMs: number | null } | null;
    aiUgcAvailable?: boolean;
  }) {
    const repo = repository(ownedRun());
    const createQuote = vi.fn(async () => ({
      id: "66666666-6666-4666-8666-666666666666",
      credits: 80,
      entitlementEligible: false,
      configurationHash: "a".repeat(64),
      expiresAt: new Date("2026-08-20T18:00:00.000Z"),
      breakdown: [{ label: "Seedance render", credits: 80 }],
    } as never));
    const startRender = vi.fn(async () => ({} as never));
    repo.findOwnedProjectVersion = vi.fn(async () => ({
      id: versionId,
      projectId,
      templateVersionId,
      configuration: baseConfiguration,
      campaignRecipe: { language: "en", presenter: input.presenter },
    }));
    repo.findPublishedTemplateVersion = vi.fn(async () => template);
    repo.findOwnedPresenterFootageAsset = vi.fn(async () => input.footage ?? null);
    const api = createGenerationApiService({
      repository: repo,
      generation: {
        createQuote,
        startRender,
        releaseRenderReservation: vi.fn(async () => ({} as never)),
      },
      pricing: createGenerationPricingFromEnvironment({
        GENERATION_PRICING_VERSION: "test-v1",
        GENERATION_QUOTE_TTL_SECONDS: "900",
        GENERATION_VIDEO_CINEMATIC_720P_CREDITS_PER_SECOND: "10",
      }),
      capabilities: new CapabilityRegistry({
        "video.cinematic": { enabled: true, adapterId: "vercel-ai-gateway", providerModelId: "bytedance/seedance-2.5" },
        "presenter.ai_ugc": { enabled: input.aiUgcAvailable === true, adapterId: "presenter-adapter", providerModelId: "presenter-model" },
      }),
    });
    return { api, repo, createQuote, startRender };
  }

  it("rejects missing or foreign-equivalent spokesperson footage before quote persistence", async () => {
    const { api, repo, createQuote } = presenterApi({
      presenter: {
        mode: "uploaded_spokesperson",
        assetId,
        rights: { version: "person-media-rights-v1", assetId, personMediaRightsAttested: true },
      },
      footage: null,
    });
    await expect(api.createQuote({ capability: "video.cinematic", projectVersionId: versionId }, session))
      .rejects.toMatchObject({ code: "presenter_configuration_ineligible" });
    expect(repo.findOwnedPresenterFootageAsset).toHaveBeenCalledWith(userId, projectId, assetId);
    expect(createQuote).not.toHaveBeenCalled();
  });

  it("rejects AI UGC even when a generic capability flag is configured, and rejects unsupported identity types", async () => {
    const ai = presenterApi({ presenter: { mode: "ai_ugc" }, aiUgcAvailable: true });
    await expect(ai.api.createQuote({ capability: "video.cinematic", projectVersionId: versionId }, session))
      .rejects.toMatchObject({ code: "presenter_configuration_ineligible" });
    expect(ai.createQuote).not.toHaveBeenCalled();

    const twin = presenterApi({ presenter: { mode: "digital_twin" } });
    await expect(twin.api.createQuote({ capability: "video.cinematic", projectVersionId: versionId }, session))
      .rejects.toMatchObject({ code: "presenter_configuration_ineligible" });
    expect(twin.createQuote).not.toHaveBeenCalled();
    expect(twin.startRender).not.toHaveBeenCalled();
  });

  it("rejects selected presenters before a quote or render reservation until a provider adapter can honor them", async () => {
    const unavailable = presenterApi({
      presenter: {
        mode: "uploaded_spokesperson",
        assetId,
        rights: { version: "person-media-rights-v1", assetId, personMediaRightsAttested: true },
      },
      footage: {
        id: assetId,
        mimeType: "video/mp4",
        sizeBytes: 4_096,
        checksumSha256: "a".repeat(64),
        durationMs: 10_000,
      },
    });
    await expect(unavailable.api.createQuote({ capability: "video.cinematic", projectVersionId: versionId }, session))
      .rejects.toMatchObject({ code: "presenter_configuration_ineligible" });
    expect(unavailable.createQuote).not.toHaveBeenCalled();

    unavailable.repo.findOwnedQuote = vi.fn(async () => ({
      id: "77777777-7777-4777-8777-777777777777",
      templateVersionId,
      capabilityAlias: "video.cinematic",
      credits: 80,
      entitlementEligible: false,
      configurationHash: "a".repeat(64),
      expiresAt: new Date("2026-08-20T18:00:00.000Z"),
    }));
    await expect(unavailable.api.startRender({
      userId,
      projectId,
      projectVersionId: versionId,
      quoteId: "77777777-7777-4777-8777-777777777777",
      idempotencyKey: "presenter-denied-start",
    })).rejects.toMatchObject({ code: "presenter_configuration_ineligible" });
    expect(unavailable.startRender).not.toHaveBeenCalled();
  });
});
