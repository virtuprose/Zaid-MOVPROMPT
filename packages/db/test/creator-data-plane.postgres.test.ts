import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabase } from "../src/client.js";
import { schema } from "../src/schema.js";
import { withUserTransaction } from "../src/user-transaction.js";

const integrationUrl = process.env.MOVPROMPT_TEST_DATABASE_URL;
const describePostgres = integrationUrl ? describe.sequential : describe.skip;

describePostgres("creator data plane PostgreSQL boundaries", () => {
  let database: ReturnType<typeof createDatabase>;

  beforeAll(() => {
    database = createDatabase({
      url: integrationUrl!,
      maxConnections: 3,
      applicationName: "movprompt-creator-data-plane-test",
    });
  });

  afterAll(async () => {
    await database.close();
  });

  it("ships fifty versioned Kuwait campaign recipes", async () => {
    const templates = await database.db
      .select({
        slug: schema.videoTemplates.slug,
        versionId: schema.videoTemplates.currentPublishedVersionId,
        state: schema.videoTemplates.publishingState,
      })
      .from(schema.videoTemplates)
      .where(eq(schema.videoTemplates.publishingState, "published"));
    expect(templates).toHaveLength(50);
    expect(templates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: "luxury-product-reveal", versionId: expect.any(String) }),
        expect.objectContaining({ slug: "salon-booking-offer", versionId: expect.any(String) }),
      ]),
    );
    const recipes = await database.db
      .select({ recipe: schema.videoTemplateVersions.recipe })
      .from(schema.videoTemplateVersions)
      .where(eq(schema.videoTemplateVersions.id, templates[0]!.versionId!));
    expect(recipes[0]?.recipe).toMatchObject({
      dialectPolicy: { arabicDialect: "kuwaiti", locale: "ar-KW", crossDialectFallback: false },
      qualityPolicy: { tier: "premium", acceptanceScore: 85, internalRetryLimit: 2 },
    });
  });

  it("sets the authenticated owner only for the lifetime of a transaction", async () => {
    const userId = randomUUID();
    const projectId = randomUUID();
    await database.db.insert(schema.users).values({
      id: userId,
      name: "Scoped creator",
      email: `${userId}@example.test`,
    });
    await withUserTransaction(database.db, userId, async (transaction) => {
      const setting = await transaction.execute<{ owner: string }>(
        // Use the same current_setting expression as every ownership policy.
        // The wrapper itself is responsible for setting it transaction-locally.
        sql`select current_setting('movprompt.user_id', true) as owner`,
      );
      expect(setting[0]?.owner).toBe(userId);
      await transaction.insert(schema.creatorProjects).values({
        id: projectId,
        userId,
        title: "Scoped project",
      });
    });
    const after = await database.db.execute<{ owner: string | null }>(
      sql`select nullif(current_setting('movprompt.user_id', true), '') as owner`,
    );
    expect(after[0]?.owner ?? null).toBeNull();
  });

  it("rejects a second account claiming an already-claimed browser draft", async () => {
    const userId = randomUUID();
    const otherUserId = randomUUID();
    const draftId = randomUUID();
    await database.db.insert(schema.users).values([
      {
        id: userId,
        name: "Draft owner",
        email: `${userId}@example.test`,
      },
      {
        id: otherUserId,
        name: "Other creator",
        email: `${otherUserId}@example.test`,
      },
    ]);
    await database.db.insert(schema.creatorProjects).values({ userId, clientDraftId: draftId });
    await expect(
      database.db.insert(schema.creatorProjects).values({ userId: otherUserId, clientDraftId: draftId }),
    ).rejects.toMatchObject({ cause: { code: "23505", constraint_name: "creator_projects_client_draft_unique" } });
  });
});
