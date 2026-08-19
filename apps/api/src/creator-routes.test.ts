import type {
  CreatorProjectRecord,
  ProjectVersion,
  PublicTemplate,
} from "@movprompt/contracts";
import { describe, expect, it, vi } from "vitest";

import type { AuthGateway } from "./auth-gateway.js";
import { createApi } from "./app.js";
import type { CreatorRepository } from "./creator-repository.js";
import { loadApiConfig } from "./config.js";
import { ApiHttpError } from "./errors.js";
import type { GuestClaimService } from "./guest-claim-service.js";
import type { SourceScanner } from "./source-scanner.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const DRAFT_ID = "33333333-3333-4333-8333-333333333333";
const PROJECT_ID = "44444444-4444-4444-8444-444444444444";
const VERSION_ID = "55555555-5555-4555-8555-555555555555";
const TEMPLATE_VERSION_ID = "66666666-6666-4666-8666-666666666666";
const PENDING_GENERATION_ID = "77777777-7777-4777-8777-777777777777";

const config = loadApiConfig({
  APP_ENV: "test",
  API_PORT: "3001",
  FEATURE_AUTHENTICATION: "true",
  FEATURE_TEMPLATE_MODE: "true",
});

function auth(userId: string | null = USER_ID): AuthGateway {
  return {
    handle: vi.fn(async () => new Response("ok")),
    getSession: vi.fn(async () =>
      userId
        ? {
            user: {
              id: userId,
              email: "owner@example.test",
              emailVerified: true,
              name: "Owner",
              role: "user" as const,
            },
            session: { id: "session" },
          }
        : null,
    ),
  };
}

const version: ProjectVersion = {
  id: VERSION_ID,
  projectId: PROJECT_ID,
  parentVersionId: null,
  templateVersionId: TEMPLATE_VERSION_ID,
  mode: "template",
  versionNumber: 1,
  configuration: { generation: { prompt: "Create the campaign", references: [] } },
  productRecipe: {},
  campaignRecipe: { market: "KW" },
  changeReason: "Draft claimed",
  createdAt: "2026-08-12T08:00:00.000Z",
};

const project: CreatorProjectRecord = {
  id: PROJECT_ID,
  title: "Northfield campaign",
  mode: "template",
  status: "ready",
  currentWorkingVersionId: VERSION_ID,
  currentAcceptedVersionId: null,
  latestRenderRunId: null,
  latestRenderProjectVersionId: null,
  latestRenderRunStatus: null,
  deletedAt: null,
  createdAt: "2026-08-12T08:00:00.000Z",
  updatedAt: "2026-08-12T08:00:00.000Z",
  currentVersion: version,
  versionCount: 1,
  outputCount: 0,
};

const template: PublicTemplate = {
  id: "luxury-product-reveal",
  slug: "luxury-product-reveal",
  category: "retail",
  versionId: TEMPLATE_VERSION_ID,
  versionNumber: 1,
  name: { en: "Luxury product reveal", ar: "عرض منتج فاخر" },
  description: { en: "Premium product campaign", ar: "حملة منتج فاخرة" },
  outcome: "Make one product feel premium",
  verticals: ["retail", "ecommerce"],
  goals: ["launch"],
  durationSeconds: 8,
  supportedLanguages: ["en", "ar", "bilingual"],
  supportedRatios: ["9:16", "1:1", "4:5", "16:9"],
  supportedMarkets: ["KW"],
  requiredInputs: ["product_image"],
  starterRenderEligible: true,
  previewAvailable: false,
  posterAvailable: false,
  qualityStatus: "development",
  dialectPolicy: {
    arabicDialect: "kuwaiti",
    locale: "ar-KW",
    register: "conversational",
    crossDialectFallback: false,
  },
  qualityPolicy: {
    tier: "premium",
    acceptanceScore: 85,
    internalRetryLimit: 2,
    hardGates: ["valid_media", "kuwaiti_dialect_when_arabic"],
    scoredDimensions: ["technical", "product_identity", "dialect_fidelity"],
  },
  capabilityPolicy: ["video.product_fidelity", "video.cinematic"],
  tags: ["premium", "product"],
  scenes: [],
};

function repository(): CreatorRepository {
  return {
    listPublishedTemplates: vi.fn(async () => [template]),
    findPublishedTemplate: vi.fn(async () => template),
    claimDraft: vi.fn(async () => project),
    listProjects: vi.fn(async () => [project]),
    findOwnedProject: vi.fn(async (userId) => (userId === USER_ID ? project : null)),
    duplicateProject: vi.fn(async () => project),
    trashProject: vi.fn(async () => ({ ...project, status: "trashed", deletedAt: new Date().toISOString() })),
    restoreProject: vi.fn(async () => project),
    createVersion: vi.fn(async () => version),
    listVersions: vi.fn(async () => [version]),
    acceptVersion: vi.fn(async () => project),
    creditSummary: vi.fn(async () => ({
      balance: 20,
      reserved: 5,
      available: 15,
      starterRenderAvailable: true,
      ledger: [],
    })),
    findOwnedOutput: vi.fn(async () => null),
  };
}

function guestClaimService(): GuestClaimService {
  return {
    claimGuestDraft: vi.fn(async ({ snapshot }) => ({
      status: "ready",
      draftId: snapshot.draftId,
      pendingGenerationId: snapshot.pendingGenerationId,
      snapshotDigest: snapshot.snapshotDigest,
      project,
      version,
    })),
    startClaim: vi.fn(async ({ snapshot }) => ({
      id: "claim-1",
      projectId: PROJECT_ID,
      draftId: snapshot.draftId,
      pendingGenerationId: snapshot.pendingGenerationId,
      snapshotDigest: snapshot.snapshotDigest,
      status: "securing" as const,
      nextAsset: {
        id: "claim-asset-1",
        localAssetId: "88888888-8888-4888-8888-888888888888",
        ordinal: 0,
        status: "pending" as const,
      },
    })),
    resumeClaim: vi.fn(),
    markAssetVerified: vi.fn(),
    markAssetFailed: vi.fn(),
    finalizeClaim: vi.fn(),
  };
}

describe("portable creator API", () => {
  it("serves the public published template catalog without authentication", async () => {
    const app = createApi({ config, creatorRepository: repository(), authGateway: auth(null) });
    const response = await app.request("/api/v1/templates?vertical=retail&language=ar", {
      headers: { "x-request-id": "request-template-list" },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      templates: [{ slug: "luxury-product-reveal", qualityStatus: "development" }],
      requestId: "request-template-list",
    });
  });

  it("retries one transient source-scan failure through the complete scanner boundary", async () => {
    const scanner: SourceScanner = {
      scan: vi
        .fn()
        .mockRejectedValueOnce(new ApiHttpError({
          code: "source_scan_failed",
          message: "Temporary upstream failure.",
          status: 422,
          retryable: true,
        }))
        .mockResolvedValueOnce({
          kind: "product",
          canonicalUrl: "https://www.apple.com/airpods-max/",
          facts: [{ field: "name", value: "AirPods Max 2", provenance: "imported" }],
          imageCandidates: ["https://www.apple.com/airpods-max.jpg"],
          warnings: ["Review and confirm every imported fact before generation."],
          scannedAt: "2026-08-14T19:00:00.000Z",
          requestId: "request-source-retry",
        }),
    };
    const app = createApi({
      config,
      creatorRepository: repository(),
      authGateway: auth(null),
      sourceScanner: scanner,
    });
    const response = await app.request("/api/v1/product-scans", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": "request-source-retry",
      },
      body: JSON.stringify({ url: "https://www.apple.com/airpods-max/" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      facts: [{ field: "name", value: "AirPods Max 2" }],
    });
    expect(scanner.scan).toHaveBeenCalledTimes(2);
    expect(scanner.scan).toHaveBeenNthCalledWith(2, {
      url: "https://www.apple.com/airpods-max/",
      kind: "product",
      requestId: "request-source-retry",
    });
  });

  it("never retries a non-retryable source security rejection", async () => {
    const scanner: SourceScanner = {
      scan: vi.fn(async () => {
        throw new ApiHttpError({
          code: "source_url_blocked",
          message: "Private address blocked.",
          status: 400,
          retryable: false,
        });
      }),
    };
    const app = createApi({
      config,
      creatorRepository: repository(),
      authGateway: auth(null),
      sourceScanner: scanner,
    });
    const response = await app.request("/api/v1/product-scans", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "http://127.0.0.1/private" }),
    });

    expect(response.status).toBe(400);
    expect(scanner.scan).toHaveBeenCalledTimes(1);
  });

  it("claims a draft only when its stable idempotency key matches", async () => {
    const repo = repository();
    const claims = guestClaimService();
    const app = createApi({
      config,
      creatorRepository: repo,
      authGateway: auth(),
      guestClaimService: claims,
    });
    const response = await app.request("/api/v1/drafts/claim", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": PENDING_GENERATION_ID,
      },
      body: JSON.stringify({
        draftId: DRAFT_ID,
        pendingGenerationId: PENDING_GENERATION_ID,
        snapshotDigest: "a".repeat(64),
        assetManifest: [],
        title: "Northfield campaign",
        mode: "template",
        templateVersionId: TEMPLATE_VERSION_ID,
        configuration: { generation: { prompt: "Create the campaign", references: [] } },
        productRecipe: {},
        campaignRecipe: { market: "KW" },
      }),
    });
    expect(response.status).toBe(201);
    expect(claims.claimGuestDraft).toHaveBeenCalledTimes(1);
  });

  it("rejects a mismatched claim key before writing", async () => {
    const repo = repository();
    const claims = guestClaimService();
    const app = createApi({
      config,
      creatorRepository: repo,
      authGateway: auth(),
      guestClaimService: claims,
    });
    const response = await app.request("/api/v1/drafts/claim", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "another-operation-key" },
      body: JSON.stringify({
        draftId: DRAFT_ID,
        pendingGenerationId: PENDING_GENERATION_ID,
        snapshotDigest: "a".repeat(64),
        assetManifest: [],
        title: "Northfield campaign",
        mode: "template",
        configuration: {},
        productRecipe: {},
        campaignRecipe: {},
      }),
    });
    expect(response.status).toBe(409);
    expect(claims.claimGuestDraft).not.toHaveBeenCalled();
  });

  it("starts a resumable asset claim with the immutable browser manifest", async () => {
    const claims = guestClaimService();
    const app = createApi({
      config,
      creatorRepository: repository(),
      authGateway: auth(),
      guestClaimService: claims,
    });
    const snapshot = {
      draftId: DRAFT_ID,
      pendingGenerationId: PENDING_GENERATION_ID,
      snapshotDigest: "a".repeat(64),
      assetManifest: [{
        localAssetId: "88888888-8888-4888-8888-888888888888",
        ordinal: 0,
        kind: "product",
        mimeType: "image/jpeg",
        sizeBytes: 1_024,
        checksumSha256: "b".repeat(64),
      }],
      title: "Northfield campaign",
      mode: "template",
      configuration: {},
      productRecipe: {},
      campaignRecipe: {},
    };

    const response = await app.request("/api/v1/drafts/claim/start", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": PENDING_GENERATION_ID,
      },
      body: JSON.stringify(snapshot),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      operation: {
        projectId: PROJECT_ID,
        pendingGenerationId: PENDING_GENERATION_ID,
        nextAsset: { localAssetId: snapshot.assetManifest[0]!.localAssetId },
      },
    });
    expect(claims.startClaim).toHaveBeenCalledWith({ userId: USER_ID, snapshot });
  });

  it("never lets a session select another user's project", async () => {
    const repo = repository();
    const app = createApi({ config, creatorRepository: repo, authGateway: auth(OTHER_ID) });
    const response = await app.request(`/api/v1/projects/${PROJECT_ID}`);
    expect(response.status).toBe(404);
    expect(repo.findOwnedProject).toHaveBeenCalledWith(OTHER_ID, PROJECT_ID);
  });

  it("returns authoritative available credits after active reservations", async () => {
    const app = createApi({ config, creatorRepository: repository(), authGateway: auth() });
    const response = await app.request("/api/v1/credits");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      balance: 20,
      reserved: 5,
      available: 15,
      starterRenderAvailable: true,
    });
  });
});
