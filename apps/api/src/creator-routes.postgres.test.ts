import { randomUUID } from "node:crypto";

import { createDatabase, schema } from "@movprompt/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AuthGateway } from "./auth-gateway.js";
import { createApi } from "./app.js";
import { loadApiConfig } from "./config.js";
import { createDrizzleCreatorRepository } from "./creator-repository.js";

const integrationUrl = process.env.MOVPROMPT_TEST_DATABASE_URL;
const describePostgres = integrationUrl ? describe.sequential : describe.skip;

describePostgres("portable creator HTTP ownership", () => {
  let database: ReturnType<typeof createDatabase>;
  const firstUserId = randomUUID();
  const secondUserId = randomUUID();
  const draftId = randomUUID();

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
    const app = createApi({
      config: loadApiConfig({
        APP_ENV: "test",
        API_PORT: "3001",
        FEATURE_AUTHENTICATION: "true",
        FEATURE_TEMPLATE_MODE: "true",
      }),
      authGateway: auth,
      creatorRepository: createDrizzleCreatorRepository(database.db),
    });
    const body = JSON.stringify({
      draftId,
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
        "idempotency-key": draftId,
        "x-test-user": firstUserId,
      },
      body,
    });
    expect(first.status).toBe(201);
    const firstProject = (await first.json()) as { project: { id: string } };

    const repeated = await app.request("/api/v1/drafts/claim", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": draftId,
        "x-test-user": firstUserId,
      },
      body,
    });
    expect(repeated.status).toBe(201);
    await expect(repeated.json()).resolves.toMatchObject({
      project: { id: firstProject.project.id },
    });

    const version = await app.request(`/api/v1/projects/${firstProject.project.id}/versions`, {
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
    const currentProject = await app.request(`/api/v1/projects/${firstProject.project.id}`, {
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

    const crossUserRead = await app.request(`/api/v1/projects/${firstProject.project.id}`, {
      headers: { "x-test-user": secondUserId },
    });
    expect(crossUserRead.status).toBe(404);

    const crossUserClaim = await app.request("/api/v1/drafts/claim", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": draftId,
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
});
