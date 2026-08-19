import { randomUUID } from "node:crypto";

import { createDatabase, eq, schema } from "@movprompt/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabaseAssetReferenceVerifier } from "./reference-frame-preparer.js";

const integrationUrl = process.env.MOVPROMPT_TEST_DATABASE_URL;
const describePostgres = integrationUrl ? describe.sequential : describe.skip;

describePostgres("Gateway reference asset PostgreSQL ownership", () => {
  let database: ReturnType<typeof createDatabase>;
  const userId = randomUUID();
  const otherUserId = randomUUID();
  const projectId = randomUUID();
  const assetId = randomUUID();
  const checksumSha256 = "a".repeat(64);
  const objectKey = `users/${userId}/projects/${projectId}/assets/product/${assetId}/${checksumSha256}`;

  beforeAll(async () => {
    database = createDatabase({
      url: integrationUrl!,
      maxConnections: 2,
      applicationName: "movprompt-reference-asset-test",
    });
    await database.db.insert(schema.users).values([
      { id: userId, name: "Reference owner", email: `${userId}@example.test` },
      { id: otherUserId, name: "Reference attacker", email: `${otherUserId}@example.test` },
    ]);
    await database.db.insert(schema.creatorProjects).values({ id: projectId, userId, title: "Reference project" });
    await database.db.insert(schema.creatorProjectAssets).values({
      id: assetId,
      projectId,
      userId,
      kind: "product",
      bucket: "creator-assets",
      objectKey,
      mimeType: "image/png",
      sizeBytes: 128,
      checksumSha256,
    });
  });

  afterAll(async () => {
    await database.db.delete(schema.users).where(eq(schema.users.id, userId));
    await database.db.delete(schema.users).where(eq(schema.users.id, otherUserId));
    await database.close();
  });

  it("returns only the exact owner-scoped canonical asset row", async () => {
    const verify = createDatabaseAssetReferenceVerifier(database.db, "creator-assets");
    await expect(verify(
      { objectKey, mimeType: "image/jpeg" },
      {
        operationId: "run-owner",
        userId,
        projectId,
        capability: "video.product_fidelity",
        prompt: "Preserve the product.",
        references: [],
        idempotencyKey: "submit:run-owner",
      },
    )).resolves.toMatchObject({
      assetId,
      bucket: "creator-assets",
      objectKey,
      mimeType: "image/png",
      sizeBytes: 128,
      checksumSha256,
    });
  });

  it("rejects another owner and an unrecorded object key before storage access", async () => {
    const verify = createDatabaseAssetReferenceVerifier(database.db, "creator-assets");
    await expect(verify(
      { objectKey, mimeType: "image/png" },
      {
        operationId: "run-attacker",
        userId: otherUserId,
        projectId,
        capability: "video.product_fidelity",
        prompt: "Preserve the product.",
        references: [],
        idempotencyKey: "submit:run-attacker",
      },
    )).rejects.toThrow("gateway_reference_not_owned");

    const unknownAssetId = randomUUID();
    const unknownKey = `users/${userId}/projects/${projectId}/assets/product/${unknownAssetId}/${checksumSha256}`;
    await expect(verify(
      { objectKey: unknownKey, mimeType: "image/png" },
      {
        operationId: "run-unrecorded",
        userId,
        projectId,
        capability: "video.product_fidelity",
        prompt: "Preserve the product.",
        references: [],
        idempotencyKey: "submit:run-unrecorded",
      },
    )).rejects.toThrow("gateway_reference_not_available");
  });

  it("rejects assets whose project has been trashed", async () => {
    const verify = createDatabaseAssetReferenceVerifier(database.db, "creator-assets");
    await database.db.update(schema.creatorProjects)
      .set({ status: "trashed", deletedAt: new Date() })
      .where(eq(schema.creatorProjects.id, projectId));
    await expect(verify(
      { objectKey, mimeType: "image/png" },
      {
        operationId: "run-trashed",
        userId,
        projectId,
        capability: "video.product_fidelity",
        prompt: "Preserve the product.",
        references: [],
        idempotencyKey: "submit:run-trashed",
      },
    )).rejects.toThrow("gateway_reference_not_available");
  });
});
