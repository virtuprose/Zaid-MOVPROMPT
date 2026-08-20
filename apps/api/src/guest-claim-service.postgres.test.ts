import { randomUUID } from "node:crypto";

import { createDatabase, schema } from "@movprompt/db";
import { CapabilityRegistry } from "@movprompt/providers";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AuthGateway } from "./auth-gateway.js";
import { createApi } from "./app.js";
import { loadApiConfig } from "./config.js";
import { createDrizzleCreatorRepository } from "./creator-repository.js";
import { createCampaignEligibilityService } from "./campaign-eligibility.js";
import { createDrizzleGenerationRepository } from "./generation-repository.js";
import { createGuestClaimRepository } from "./guest-claim-repository.js";
import { createGuestClaimService } from "./guest-claim-service.js";

const integrationUrl = process.env.MOVPROMPT_TEST_DATABASE_URL;
const describePostgres = integrationUrl ? describe.sequential : describe.skip;

describePostgres("guest claim service PostgreSQL boundary", () => {
  let database: ReturnType<typeof createDatabase>;
  const firstUserId = randomUUID();
  const secondUserId = randomUUID();
  const draftId = randomUUID();
  const pendingGenerationId = randomUUID();

  beforeAll(async () => {
    database = createDatabase({
      url: integrationUrl!,
      maxConnections: 3,
      applicationName: "movprompt-guest-claim-service-test",
    });
    await database.db.insert(schema.users).values([
      {
        id: firstUserId,
        name: "First claim owner",
        email: `${firstUserId}@example.test`,
        emailVerified: true,
      },
      {
        id: secondUserId,
        name: "Second claim owner",
        email: `${secondUserId}@example.test`,
        emailVerified: true,
      },
    ]);
  });

  afterAll(async () => {
    await database.close();
  });

  const auth: AuthGateway = {
    handle: async () => new Response("ok"),
    async getSession(headers) {
      const userId = headers.get("x-test-user");
      if (!userId) return null;
      return {
        user: {
          id: userId,
          email: `${userId}@example.test`,
          emailVerified: true,
          name: "Claim owner",
          role: "user",
        },
        session: { id: `session-${userId}` },
      };
    },
  };

  function app(presenterAvailable = true) {
    const creatorRepository = createDrizzleCreatorRepository(database.db);
    const claimRepository = createGuestClaimRepository({ db: database.db });
    const generationRepository = createDrizzleGenerationRepository(database.db);
    return createApi({
      config: loadApiConfig({
        APP_ENV: "test",
        API_PORT: "3001",
        FEATURE_AUTHENTICATION: "true",
        FEATURE_TEMPLATE_MODE: "true",
      }),
      authGateway: auth,
      creatorRepository,
      guestClaimService: createGuestClaimService({
        repository: claimRepository,
        campaignEligibility: createCampaignEligibilityService({
          templates: generationRepository,
          capabilities: new CapabilityRegistry({
            "presenter.ai_ugc": {
              enabled: presenterAvailable,
              adapterId: "test-presenter-adapter",
              providerModelId: "test-presenter-model",
            },
          }),
        }),
      }),
    });
  }

  const snapshot = {
    draftId,
    pendingGenerationId,
    snapshotDigest: "a".repeat(64),
    assetManifest: [],
    title: "Kuwait campaign",
    mode: "advanced",
    configuration: {
      sourceFacts: { businessName: "Northfield", price: "12.500 KWD", offer: "Summer offer" },
      campaign: {
        language: "bilingual",
        market: "KW",
        cta: "WhatsApp order",
        destination: "https://wa.me/96550000000",
        presenter: "none",
        ratio: "9:16",
        resolution: "720p",
        audio: "licensed",
        subtitles: true,
        rightsConfirmed: true,
        references: ["local-reference-1"],
      },
    },
    productRecipe: { name: "Summer collection", source: "user_confirmed" },
    campaignRecipe: { language: "bilingual", market: "KW", cta: "WhatsApp order" },
  };

  it("creates one immutable receipt for an exact asset-free replay", async () => {
    const first = await app().request("/api/v1/drafts/claim", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": pendingGenerationId,
        "x-test-user": firstUserId,
      },
      body: JSON.stringify(snapshot),
    });
    expect(first.status).toBe(201);
    const firstBody = (await first.json()) as {
      claim: { project: { id: string }; version: { id: string }; pendingGenerationId: string };
    };
    expect(firstBody.claim).toMatchObject({
      pendingGenerationId,
      snapshotDigest: snapshot.snapshotDigest,
      status: "ready",
      project: { mode: "advanced", status: "ready" },
      version: {
        mode: "advanced",
        configuration: snapshot.configuration,
        productRecipe: snapshot.productRecipe,
        campaignRecipe: snapshot.campaignRecipe,
      },
    });

    const replay = await app().request("/api/v1/drafts/claim", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": pendingGenerationId,
        "x-test-user": firstUserId,
      },
      body: JSON.stringify(snapshot),
    });
    expect(replay.status).toBe(201);
    await expect(replay.json()).resolves.toMatchObject({
      claim: {
        project: { id: firstBody.claim.project.id },
        version: { id: firstBody.claim.version.id },
      },
    });
  });

  it("rejects a mutated digest and another owner without creating or disclosing a claim", async () => {
    const changedDigest = await app().request("/api/v1/drafts/claim", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": pendingGenerationId,
        "x-test-user": firstUserId,
      },
      body: JSON.stringify({ ...snapshot, snapshotDigest: "b".repeat(64) }),
    });
    expect(changedDigest.status).toBe(409);
    await expect(changedDigest.json()).resolves.toMatchObject({
      error: { code: "guest_claim_conflict", requestId: expect.any(String) },
    });

    const otherOwner = await app().request("/api/v1/drafts/claim", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": pendingGenerationId,
        "x-test-user": secondUserId,
      },
      body: JSON.stringify(snapshot),
    });
    expect(otherOwner.status).toBe(409);
    const otherOwnerBody = (await otherOwner.json()) as { error: { message: string } };
    expect(otherOwnerBody.error.message).not.toContain("Kuwait campaign");
    expect(otherOwnerBody.error.message).not.toContain(firstUserId);
  });

  it("serializes a claim lifecycle and refuses finalization until every asset is verified", async () => {
    const lifecycleSnapshot = {
      ...snapshot,
      draftId: randomUUID(),
      pendingGenerationId: randomUUID(),
      snapshotDigest: "c".repeat(64),
      assetManifest: [{
        localAssetId: randomUUID(),
        ordinal: 0,
        kind: "product" as const,
        mimeType: "image/jpeg",
        sizeBytes: 128,
        checksumSha256: "d".repeat(64),
      }],
      configuration: {
        creatorProject: {
          source: { assetKeys: ["guest-local-product-id"] },
        },
      },
    };
    const service = createGuestClaimService({
      repository: createGuestClaimRepository({ db: database.db }),
    });

    const [first, replay] = await Promise.all([
      service.startClaim({ userId: firstUserId, snapshot: lifecycleSnapshot }),
      service.startClaim({ userId: firstUserId, snapshot: lifecycleSnapshot }),
    ]);
    expect(replay.id).toBe(first.id);
    expect(first.status).toBe("securing");

    await expect(service.finalizeClaim({ userId: firstUserId, pendingGenerationId: lifecycleSnapshot.pendingGenerationId }))
      .rejects.toMatchObject({ code: "assets_pending" });
    await service.markAssetVerified({
      userId: firstUserId,
      pendingGenerationId: lifecycleSnapshot.pendingGenerationId,
      localAssetId: lifecycleSnapshot.assetManifest[0]!.localAssetId,
      bucket: "movprompt-assets",
      objectKey: `users/${firstUserId}/projects/${first.projectId}/assets/product/${lifecycleSnapshot.assetManifest[0]!.localAssetId}/${"d".repeat(64)}`,
    });

    const receipt = await service.finalizeClaim({
      userId: firstUserId,
      pendingGenerationId: lifecycleSnapshot.pendingGenerationId,
    });
    expect(receipt).toMatchObject({
      status: "ready",
      pendingGenerationId: lifecycleSnapshot.pendingGenerationId,
      project: { id: first.projectId, status: "ready" },
    });
    expect(receipt.version.configuration).toMatchObject({
      creatorProject: {
        source: {
          assetKeys: [`users/${firstUserId}/projects/${first.projectId}/assets/product/${lifecycleSnapshot.assetManifest[0]!.localAssetId}/${"d".repeat(64)}`],
        },
      },
    });
  });

  it("keeps failed asset claims resumable without exposing a ready project", async () => {
    const lifecycleSnapshot = {
      ...snapshot,
      draftId: randomUUID(),
      pendingGenerationId: randomUUID(),
      snapshotDigest: "e".repeat(64),
      assetManifest: [{
        localAssetId: randomUUID(),
        ordinal: 0,
        kind: "reference" as const,
        mimeType: "image/png",
        sizeBytes: 256,
        checksumSha256: "f".repeat(64),
      }],
    };
    const service = createGuestClaimService({
      repository: createGuestClaimRepository({ db: database.db }),
    });
    const started = await service.startClaim({ userId: firstUserId, snapshot: lifecycleSnapshot });

    await service.markAssetFailed({
      userId: firstUserId,
      pendingGenerationId: lifecycleSnapshot.pendingGenerationId,
      localAssetId: lifecycleSnapshot.assetManifest[0]!.localAssetId,
      code: "checksum_mismatch",
    });
    await expect(service.finalizeClaim({ userId: firstUserId, pendingGenerationId: lifecycleSnapshot.pendingGenerationId }))
      .rejects.toMatchObject({ code: "assets_pending" });
    await expect(service.resumeClaim({ userId: firstUserId, pendingGenerationId: lifecycleSnapshot.pendingGenerationId }))
      .resolves.toMatchObject({ id: started.id, status: "failed", nextAsset: { status: "failed" } });
  });

  it("does not let a late retry reclaim an asset leased for abandoned-claim cleanup", async () => {
    const lifecycleSnapshot = {
      ...snapshot,
      draftId: randomUUID(),
      pendingGenerationId: randomUUID(),
      snapshotDigest: "1".repeat(64),
      assetManifest: [{
        localAssetId: randomUUID(),
        ordinal: 0,
        kind: "product" as const,
        mimeType: "image/jpeg",
        sizeBytes: 128,
        checksumSha256: "2".repeat(64),
      }],
    };
    const service = createGuestClaimService({
      repository: createGuestClaimRepository({ db: database.db }),
    });
    const started = await service.startClaim({ userId: firstUserId, snapshot: lifecycleSnapshot });
    await database.db.update(schema.guestClaimAssets).set({
      status: "securing",
      errorMetadata: { cleanup: { state: "leased", jobId: "cleanup-job" } },
    }).where(and(
      eq(schema.guestClaimAssets.claimOperationId, started.id),
      eq(schema.guestClaimAssets.localAssetId, lifecycleSnapshot.assetManifest[0]!.localAssetId),
    ));

    await expect(service.markAssetVerified({
      userId: firstUserId,
      pendingGenerationId: lifecycleSnapshot.pendingGenerationId,
      localAssetId: lifecycleSnapshot.assetManifest[0]!.localAssetId,
      bucket: "movprompt-assets",
      objectKey: `users/${firstUserId}/projects/${started.projectId}/assets/product/${lifecycleSnapshot.assetManifest[0]!.localAssetId}/${"2".repeat(64)}`,
    })).rejects.toMatchObject({ code: "assets_pending", retryable: true });

    const [asset] = await database.db.select().from(schema.guestClaimAssets).where(and(
      eq(schema.guestClaimAssets.claimOperationId, started.id),
      eq(schema.guestClaimAssets.localAssetId, lifecycleSnapshot.assetManifest[0]!.localAssetId),
    ));
    expect(asset).toMatchObject({ status: "securing", errorMetadata: { cleanup: { state: "leased" } } });
  });

  it("enforces presenter eligibility before project visibility", async () => {
    const footageAssetId = randomUUID();
    const base = {
      ...snapshot,
      draftId: randomUUID(),
      pendingGenerationId: randomUUID(),
      snapshotDigest: "f".repeat(64),
      templateVersionId: "10000000-0000-4000-8000-000000000101",
      campaignRecipe: {
        language: "en",
        presenter: {
          mode: "uploaded_spokesperson",
          assetId: footageAssetId,
          rights: {
            version: "person-media-rights-v1",
            assetId: footageAssetId,
            personMediaRightsAttested: true,
          },
        },
      },
      assetManifest: [{
        localAssetId: footageAssetId,
        ordinal: 0,
        kind: "footage" as const,
        mimeType: "video/mp4",
        sizeBytes: 4_096,
        checksumSha256: "a".repeat(64),
        durationMs: 10_000,
      }],
    };

    const valid = await app().request("/api/v1/drafts/claim/start", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": base.pendingGenerationId,
        "x-test-user": firstUserId,
      },
      body: JSON.stringify(base),
    });
    expect(valid.status).toBe(201);

    const invalidCases = [
      {
        ...base,
        draftId: randomUUID(),
        pendingGenerationId: randomUUID(),
        snapshotDigest: "b".repeat(64),
        campaignRecipe: {
          language: "en",
          presenter: {
            mode: "uploaded_spokesperson",
            assetId: footageAssetId,
            rights: {
              version: "person-media-rights-v1",
              assetId: randomUUID(),
              personMediaRightsAttested: true,
            },
          },
        },
      },
      {
        ...base,
        draftId: randomUUID(),
        pendingGenerationId: randomUUID(),
        snapshotDigest: "c".repeat(64),
        assetManifest: [{ ...base.assetManifest[0], kind: "product" as const, mimeType: "image/jpeg", durationMs: undefined }],
      },
      {
        ...base,
        draftId: randomUUID(),
        pendingGenerationId: randomUUID(),
        snapshotDigest: "d".repeat(64),
        campaignRecipe: { language: "en", presenter: { mode: "digital_twin" } },
      },
    ];

    for (const invalid of invalidCases) {
      const response = await app().request("/api/v1/drafts/claim/start", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": invalid.pendingGenerationId,
          "x-test-user": firstUserId,
        },
        body: JSON.stringify(invalid),
      });
      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: "presenter_configuration_ineligible" },
      });
      const [created] = await database.db.select({ id: schema.creatorProjects.id })
        .from(schema.creatorProjects)
        .where(eq(schema.creatorProjects.clientDraftId, invalid.draftId));
      expect(created).toBeUndefined();
    }

    const disabledAiUgc = {
      ...base,
      draftId: randomUUID(),
      pendingGenerationId: randomUUID(),
      snapshotDigest: "e".repeat(64),
      assetManifest: [],
      campaignRecipe: { language: "en", presenter: { mode: "ai_ugc" } },
    };
    const disabledResponse = await app(false).request("/api/v1/drafts/claim/start", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": disabledAiUgc.pendingGenerationId,
        "x-test-user": firstUserId,
      },
      body: JSON.stringify(disabledAiUgc),
    });
    expect(disabledResponse.status).toBe(409);
    await expect(disabledResponse.json()).resolves.toMatchObject({
      error: { code: "presenter_configuration_ineligible" },
    });
  });
});
