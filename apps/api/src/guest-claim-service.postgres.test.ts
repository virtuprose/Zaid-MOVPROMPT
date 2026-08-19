import { randomUUID } from "node:crypto";

import { createDatabase, schema } from "@movprompt/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AuthGateway } from "./auth-gateway.js";
import { createApi } from "./app.js";
import { loadApiConfig } from "./config.js";
import { createDrizzleCreatorRepository } from "./creator-repository.js";
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

  function app() {
    const creatorRepository = createDrizzleCreatorRepository(database.db);
    const claimRepository = createGuestClaimRepository({ creatorRepository });
    return createApi({
      config: loadApiConfig({
        APP_ENV: "test",
        API_PORT: "3001",
        FEATURE_AUTHENTICATION: "true",
        FEATURE_TEMPLATE_MODE: "true",
      }),
      authGateway: auth,
      creatorRepository,
      guestClaimService: createGuestClaimService({ repository: claimRepository }),
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
      objectKey: `users/${firstUserId}/projects/${first.projectId}/assets/product/claim-asset/${"d".repeat(64)}`,
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
});
