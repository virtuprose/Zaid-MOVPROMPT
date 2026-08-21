import { randomUUID } from "node:crypto";

import { createDatabase, schema } from "@movprompt/db";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { createApi } from "./app.js";
import { loadApiConfig } from "./config.js";
import { createDrizzleCreatorRepository } from "./creator-repository.js";
import { createGuestClaimRepository } from "./guest-claim-repository.js";
import { createGuestClaimService } from "./guest-claim-service.js";
import {
  createTestAuthProviderStubs,
  TEST_SOCIAL_AUTH_USERS,
  testCallbackState,
} from "./test/auth-provider-stubs.js";

const integrationUrl = process.env.MOVPROMPT_TEST_DATABASE_URL;
const describePostgres = integrationUrl ? describe.sequential : describe.skip;

describe("test auth provider stub boundary", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("fails closed if a production runtime attempts to load it", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => createTestAuthProviderStubs()).toThrow(/not_available_in_production/);
  });
});

function snapshot() {
  return {
    draftId: randomUUID(),
    pendingGenerationId: randomUUID(),
    snapshotDigest: "a".repeat(64),
    assetManifest: [],
    title: "Exact Kuwait campaign",
    // This callback fixture exercises identity/idempotency recovery, not the
    // Template Mode contract. Keep it explicitly Advanced so it remains a
    // legitimate legacy-style snapshot without an immutable template ID.
    mode: "advanced" as const,
    configuration: { campaign: { market: "KW", language: "bilingual" } },
    productRecipe: { name: "Campaign product" },
    campaignRecipe: { market: "KW", language: "bilingual" },
  };
}

describePostgres("deterministic social callback recovery", () => {
  let database: ReturnType<typeof createDatabase>;

  beforeAll(async () => {
    database = createDatabase({
      url: integrationUrl!,
      maxConnections: 3,
      applicationName: "movprompt-auth-provider-stubs-test",
    });
    await database.db.insert(schema.users).values([
      {
        id: TEST_SOCIAL_AUTH_USERS.google,
        name: "Google callback owner",
        email: "google.callback@movprompt.test",
        emailVerified: true,
      },
      {
        id: TEST_SOCIAL_AUTH_USERS.apple,
        name: "Apple callback owner",
        email: "apple.callback@movprompt.test",
        emailVerified: true,
      },
    ]).onConflictDoNothing();
  });

  afterAll(async () => {
    await database.close();
  });

  function appWithStubs() {
    const auth = createTestAuthProviderStubs();
    const app = createApi({
      config: loadApiConfig({
        APP_ENV: "test",
        API_PORT: "3001",
        FEATURE_AUTHENTICATION: "true",
        FEATURE_TEMPLATE_MODE: "true",
      }),
      authGateway: auth,
      creatorRepository: createDrizzleCreatorRepository(database.db),
      guestClaimService: createGuestClaimService({
        repository: createGuestClaimRepository({ db: database.db }),
      }),
    });
    return { app, auth };
  }

  it.each(["google", "apple"] as const)(
    "%s callback preserves the exact pending campaign and returns one replayable claim",
    async (provider) => {
      const { app, auth } = appWithStubs();
      const campaign = snapshot();
      const callback = await app.request(auth.callbackRequest({
        provider,
        state: testCallbackState(provider),
        next: `/create?draft=${campaign.draftId}`,
      }));

      expect(callback.status).toBe(200);
      const sessionCookie = callback.headers.get("set-cookie");
      expect(sessionCookie).toBeTruthy();

      const claimRequest = () => app.request("/api/v1/drafts/claim", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": campaign.pendingGenerationId,
          cookie: sessionCookie!,
        },
        body: JSON.stringify(campaign),
      });
      const [first, replay] = await Promise.all([claimRequest(), claimRequest()]);
      expect(first.status).toBe(201);
      expect(replay.status).toBe(201);
      const firstReceipt = await first.json() as { claim: { project: { id: string }; version: { id: string } } };
      const replayReceipt = await replay.json() as { claim: { project: { id: string }; version: { id: string } } };
      expect(replayReceipt.claim.project.id).toBe(firstReceipt.claim.project.id);
      expect(replayReceipt.claim.version.id).toBe(firstReceipt.claim.version.id);
    },
  );

  it("rejects invalid, cancelled and hostile callbacks without creating a claim", async () => {
    const { app, auth } = appWithStubs();
    const campaign = snapshot();
    const before = await database.db.select({ id: schema.guestClaimOperations.id }).from(schema.guestClaimOperations);
    const invalid = await app.request(auth.callbackRequest({
      provider: "google",
      state: "invalid-state",
      next: "//evil.example/claim",
    }));
    const cancelled = await app.request(auth.callbackRequest({
      provider: "apple",
      state: testCallbackState("apple"),
      next: "/create",
      cancelled: true,
    }));

    expect(invalid.status).toBe(400);
    expect(cancelled.status).toBe(302);
    expect(cancelled.headers.get("location")).toBe("/create");
    await expect(database.db.select({ id: schema.guestClaimOperations.id }).from(schema.guestClaimOperations))
      .resolves.toEqual(before);
  });

  it("rejects a changed snapshot and other provider account without disclosure", async () => {
    const { app, auth } = appWithStubs();
    const campaign = snapshot();
    const firstCallback = await app.request(auth.callbackRequest({
      provider: "google",
      state: testCallbackState("google"),
      next: "/create",
    }));
    const firstCookie = firstCallback.headers.get("set-cookie")!;
    const first = await app.request("/api/v1/drafts/claim", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": campaign.pendingGenerationId, cookie: firstCookie },
      body: JSON.stringify(campaign),
    });
    expect(first.status).toBe(201);
    const secondCallback = await app.request(auth.callbackRequest({
      provider: "apple",
      state: testCallbackState("apple"),
      next: "/create",
    }));
    const changed = await app.request("/api/v1/drafts/claim", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": campaign.pendingGenerationId, cookie: secondCallback.headers.get("set-cookie")! },
      body: JSON.stringify({ ...campaign, snapshotDigest: "b".repeat(64) }),
    });

    expect(changed.status).toBe(409);
    const body = await changed.text();
    expect(body).not.toContain(campaign.title);
    expect(body).not.toContain(firstCookie);
  });
});
