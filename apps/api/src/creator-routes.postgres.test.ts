import { randomUUID } from "node:crypto";

import { createDatabase, schema } from "@movprompt/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AuthGateway } from "./auth-gateway.js";
import { createApi } from "./app.js";
import { loadApiConfig } from "./config.js";
import { createDrizzleCreatorRepository } from "./creator-repository.js";
import { createGuestClaimRepository } from "./guest-claim-repository.js";
import { createGuestClaimService } from "./guest-claim-service.js";

const integrationUrl = process.env.MOVPROMPT_TEST_DATABASE_URL;
const describePostgres = integrationUrl ? describe.sequential : describe.skip;

describePostgres("portable creator HTTP ownership", () => {
  let database: ReturnType<typeof createDatabase>;
  const firstUserId = randomUUID();
  const secondUserId = randomUUID();
  const draftId = randomUUID();
  const pendingGenerationId = randomUUID();

  beforeAll(async () => {
    database = createDatabase({
      url: integrationUrl!,
      maxConnections: 3,
      applicationName: "movprompt-creator-http-test",
    });
    await database.db.insert(schema.users).values([
      {
        id: firstUserId,
        name: "First creator",
        email: `${firstUserId}@example.test`,
        emailVerified: true,
      },
      {
        id: secondUserId,
        name: "Second creator",
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
          name: "Test creator",
          role: "user",
        },
        session: { id: `session-${userId}` },
      };
    },
  };

  it("claims once, hides the project from another account, and prevents a second claim", async () => {
    const creatorRepository = createDrizzleCreatorRepository(database.db);
    const app = createApi({
      config: loadApiConfig({
        APP_ENV: "test",
        API_PORT: "3001",
        FEATURE_AUTHENTICATION: "true",
        FEATURE_TEMPLATE_MODE: "true",
      }),
      authGateway: auth,
      creatorRepository,
      guestClaimService: createGuestClaimService({
        repository: createGuestClaimRepository({ db: database.db }),
      }),
    });
    const body = JSON.stringify({
      draftId,
      pendingGenerationId,
      snapshotDigest: "a".repeat(64),
      assetManifest: [],
      title: "Private campaign",
      mode: "template",
      configuration: { generation: { prompt: "Create a Kuwait campaign", references: [] } },
      productRecipe: { name: "Private product" },
      campaignRecipe: { market: "KW", language: "bilingual" },
    });
    const first = await app.request("/api/v1/drafts/claim", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": pendingGenerationId,
        "x-test-user": firstUserId,
      },
      body,
    });
    expect(first.status).toBe(201);
    const firstProject = (await first.json()) as { claim: { project: { id: string } } };

    const repeated = await app.request("/api/v1/drafts/claim", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": pendingGenerationId,
        "x-test-user": firstUserId,
      },
      body,
    });
    expect(repeated.status).toBe(201);
    await expect(repeated.json()).resolves.toMatchObject({
      claim: { project: { id: firstProject.claim.project.id } },
    });

    const version = await app.request(`/api/v1/projects/${firstProject.claim.project.id}/versions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": `project-save:${randomUUID()}`,
        "x-test-user": firstUserId,
      },
      body: JSON.stringify({
        mode: "template",
        configuration: { generation: { prompt: "Updated Kuwait campaign", references: [] } },
        productRecipe: { name: "Private product" },
        campaignRecipe: { market: "KW", language: "bilingual" },
        changeReason: "Campaign draft updated",
      }),
    });
    expect(version.status).toBe(201);
    const createdVersion = (await version.json()) as { version: { id: string } };
    const currentProject = await app.request(`/api/v1/projects/${firstProject.claim.project.id}`, {
      headers: { "x-test-user": firstUserId },
    });
    await expect(currentProject.json()).resolves.toMatchObject({
      project: {
        currentWorkingVersionId: createdVersion.version.id,
        currentAcceptedVersionId: null,
        currentVersion: { id: createdVersion.version.id, versionNumber: 2 },
        latestRenderRunId: null,
        latestRenderProjectVersionId: null,
        latestRenderRunStatus: null,
      },
    });

    const crossUserRead = await app.request(`/api/v1/projects/${firstProject.claim.project.id}`, {
      headers: { "x-test-user": secondUserId },
    });
    expect(crossUserRead.status).toBe(404);

    const crossUserClaim = await app.request("/api/v1/drafts/claim", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": pendingGenerationId,
        "x-test-user": secondUserId,
      },
      body,
    });
    expect(crossUserClaim.status).toBe(409);

    const secondUserProjects = await app.request("/api/v1/projects", {
      headers: { "x-test-user": secondUserId },
    });
    await expect(secondUserProjects.json()).resolves.toMatchObject({ projects: [] });
  });

  it("replays concurrent source replacement once, preserves accepted history, and clears stale output", async () => {
    const localDraftId = randomUUID();
    const sourceAssetId = randomUUID();
    const sourceOperationKey = `source-change:${randomUUID()}`;
    const creatorRepository = createDrizzleCreatorRepository(database.db);
    const app = createApi({
      config: loadApiConfig({ APP_ENV: "test", API_PORT: "3001", FEATURE_AUTHENTICATION: "true", FEATURE_TEMPLATE_MODE: "true" }),
      authGateway: auth,
      creatorRepository,
      guestClaimService: createGuestClaimService({ repository: createGuestClaimRepository({ db: database.db }) }),
    });
    const claim = await app.request("/api/v1/drafts/claim", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": randomUUID(), "x-test-user": firstUserId },
      body: JSON.stringify({
        draftId: localDraftId,
        pendingGenerationId: randomUUID(),
        snapshotDigest: "d".repeat(64),
        assetManifest: [],
        title: "Coffee campaign",
        mode: "template",
        configuration: { creatorProject: { videoUrl: "https://old.example.test/output.mp4", renderRunId: "old-run", jobId: "old-job" } },
        productRecipe: { name: "Coffee" },
        campaignRecipe: { market: "KW", language: "en" },
      }),
    });
    const claimed = (await claim.json()) as { claim: { project: { id: string; currentVersion: { id: string } } } };
    const projectId = claimed.claim.project.id;
    const parentVersionId = claimed.claim.project.currentVersion.id;
    await database.db.insert(schema.creatorProjectAssets).values({
      id: sourceAssetId,
      projectId,
      userId: firstUserId,
      kind: "product",
      bucket: "private",
      objectKey: `users/${firstUserId}/projects/${projectId}/assets/product/${sourceAssetId}/coffee.png`,
      mimeType: "image/png",
      sizeBytes: 12,
      checksumSha256: "e".repeat(64),
    });
    await database.db.update(schema.creatorProjects).set({ currentAcceptedVersionId: parentVersionId }).where(eq(schema.creatorProjects.id, projectId));

    const body = JSON.stringify({
      parentVersionId,
      mode: "template",
      configuration: { creatorProject: { videoUrl: "https://old.example.test/output.mp4", renderRunId: "old-run", jobId: "old-job" } },
      productRecipe: { name: "Coffee", images: [{ assetId: sourceAssetId, checksum: "e".repeat(64) }] },
      campaignRecipe: { market: "KW", language: "en" },
      source: { type: "upload", name: "Coffee", description: "Gift set", price: "12.500", brand: "Northfield", assetIds: [sourceAssetId] },
    });
    const request = () => app.request(`/api/v1/projects/${projectId}/source`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": sourceOperationKey, "x-test-user": firstUserId },
      body,
    });
    const [first, replay] = await Promise.all([request(), request()]);
    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);
    const firstVersion = (await first.json()) as { version: { id: string; configuration: { creatorProject: { videoUrl: null; renderRunId: null; jobId: null } } }; sourceFingerprint: string };
    const replayVersion = (await replay.json()) as { version: { id: string } };
    expect(replayVersion.version.id).toBe(firstVersion.version.id);
    expect(firstVersion.sourceFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(firstVersion.version.configuration.creatorProject).toMatchObject({ videoUrl: null, renderRunId: null, jobId: null });

    const current = await app.request(`/api/v1/projects/${projectId}`, { headers: { "x-test-user": firstUserId } });
    await expect(current.json()).resolves.toMatchObject({
      project: { currentWorkingVersionId: firstVersion.version.id, currentAcceptedVersionId: parentVersionId },
    });
    const history = await app.request(`/api/v1/projects/${projectId}/versions`, { headers: { "x-test-user": firstUserId } });
    await expect(history.json()).resolves.toMatchObject({ versions: expect.arrayContaining([{ id: parentVersionId }, { id: firstVersion.version.id }]) });

    const crossOwner = await app.request(`/api/v1/projects/${projectId}/source`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": `source-change:${randomUUID()}`, "x-test-user": secondUserId },
      body,
    });
    expect(crossOwner.status).toBe(404);
  });
});
