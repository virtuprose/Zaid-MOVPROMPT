import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabase, type Database } from "../src/client";
import { createGenerationService } from "../src/generation-service";
import { GenerationDomainError } from "../src/generation-policy";
import {
  creatorProjects,
  creatorProjectVersions,
  creditAccounts,
  creditLedger,
  creditReservations,
  entitlements,
  outboxJobs,
  renderRuns,
  users,
} from "../src/schema";

const integrationUrl = process.env.MOVPROMPT_TEST_DATABASE_URL;
const describePostgres = integrationUrl ? describe.sequential : describe.skip;

describePostgres("generation service PostgreSQL transactions", () => {
  let database: ReturnType<typeof createDatabase>;
  let db: Database;

  beforeAll(() => {
    database = createDatabase({ url: integrationUrl!, maxConnections: 4, applicationName: "movprompt-generation-tests" });
    db = database.db;
  });

  afterAll(async () => {
    await database.close();
  });

  async function fixture(balance = 500, starter = false) {
    const userId = randomUUID();
    const projectId = randomUUID();
    const projectVersionId = randomUUID();
    await db.insert(users).values({ id: userId, name: "Generation Test", email: `${userId}@example.test` });
    await db.insert(creatorProjects).values({ id: projectId, userId, title: "Test campaign" });
    await db.insert(creatorProjectVersions).values({
      id: projectVersionId,
      projectId,
      userId,
      mode: "template",
      versionNumber: 1,
      configuration: { fixture: true },
    });
    await db.insert(creditAccounts).values({ userId, balance });
    if (starter) await db.insert(entitlements).values({ userId, type: "starter_template_render" });
    return { userId, projectId, projectVersionId };
  }

  it("binds a quote to its configuration and starts one idempotent run/outbox job", async () => {
    const service = createGenerationService(db);
    const ids = await fixture();
    const configuration = { duration: 8, ratio: "9:16", template: "luxury" };
    const quote = await service.createQuote({
      userId: ids.userId,
      capabilityAlias: "video.cinematic",
      credits: 144,
      entitlementEligible: false,
      breakdown: [{ label: "8 seconds", credits: 144 }],
      configuration,
      expiresAt: new Date(Date.now() + 60_000),
    });

    const input = {
      ...ids,
      quoteId: quote.id,
      idempotencyKey: `generation:${randomUUID()}`,
      capabilityAlias: "video.cinematic",
      configuration,
    };
    const first = await service.startRender(input);
    const second = await service.startRender(input);

    expect(second.id).toBe(first.id);
    const jobs = await db.select().from(outboxJobs).where(eq(outboxJobs.idempotencyKey, `render.start:${first.id}`));
    expect(jobs).toHaveLength(1);

    await expect(service.startRender({ ...input, configuration: { ...configuration, duration: 10 } })).rejects.toMatchObject({
      code: "quote_configuration_mismatch",
    } satisfies Partial<GenerationDomainError>);
  });

  it("rejects expired quotes and requires an authenticated owner-bound quote", async () => {
    const service = createGenerationService(db);
    const ids = await fixture();
    const configuration = { duration: 6, ratio: "4:5" };
    const quoteTime = new Date("2026-08-12T10:00:00.000Z");
    const expiredQuote = await service.createQuote({
      userId: ids.userId,
      capabilityAlias: "video.cinematic",
      credits: 108,
      entitlementEligible: false,
      breakdown: [{ label: "6 seconds", credits: 108 }],
      configuration,
      now: quoteTime,
      expiresAt: new Date("2026-08-12T10:01:00.000Z"),
    });
    const baseInput = {
      ...ids,
      idempotencyKey: `generation:${randomUUID()}`,
      capabilityAlias: expiredQuote.capabilityAlias,
      configuration,
    };
    await expect(
      service.startRender({
        ...baseInput,
        quoteId: expiredQuote.id,
        now: new Date("2026-08-12T10:02:00.000Z"),
      }),
    ).rejects.toMatchObject({ code: "quote_expired" } satisfies Partial<GenerationDomainError>);

    const guestQuote = await service.createQuote({
      capabilityAlias: "video.cinematic",
      credits: 108,
      entitlementEligible: false,
      breakdown: [{ label: "6 seconds", credits: 108 }],
      configuration,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(
      service.startRender({
        ...baseInput,
        quoteId: guestQuote.id,
        idempotencyKey: `generation:${randomUUID()}`,
      }),
    ).rejects.toMatchObject({ code: "quote_owner_mismatch" } satisfies Partial<GenerationDomainError>);
  });

  it("never silently charges credits when an eligible starter entitlement is unavailable", async () => {
    const service = createGenerationService(db);
    const ids = await fixture(500, false);
    const configuration = { duration: 5, ratio: "9:16" };
    const quote = await service.createQuote({
      userId: ids.userId,
      capabilityAlias: "video.cinematic",
      credits: 90,
      entitlementEligible: true,
      breakdown: [{ label: "5 seconds", credits: 90 }],
      configuration,
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      service.startRender({
        ...ids,
        quoteId: quote.id,
        idempotencyKey: `generation:${randomUUID()}`,
        capabilityAlias: quote.capabilityAlias,
        configuration,
      }),
    ).rejects.toMatchObject({
      code: "starter_entitlement_unavailable",
    } satisfies Partial<GenerationDomainError>);

    expect(await db.select().from(renderRuns).where(eq(renderRuns.userId, ids.userId))).toHaveLength(0);
    expect(await db.select().from(creditReservations).where(eq(creditReservations.userId, ids.userId))).toHaveLength(0);
  });

  it("charges and refunds credits exactly once", async () => {
    const service = createGenerationService(db);
    const ids = await fixture(200);
    const configuration = { duration: 5, ratio: "1:1" };
    const quote = await service.createQuote({
      userId: ids.userId,
      capabilityAlias: "video.cinematic",
      credits: 90,
      entitlementEligible: false,
      breakdown: [{ label: "5 seconds", credits: 90 }],
      configuration,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const run = await service.startRender({
      ...ids,
      quoteId: quote.id,
      idempotencyKey: `generation:${randomUUID()}`,
      capabilityAlias: quote.capabilityAlias,
      configuration,
    });

    expect((await db.select().from(creditAccounts).where(eq(creditAccounts.userId, ids.userId)))[0]?.balance).toBe(200);
    expect((await db.select().from(creditReservations).where(eq(creditReservations.renderRunId, run.id)))[0]?.status).toBe(
      "reserved",
    );

    const providerRequestId = `provider-${randomUUID()}`;
    await service.recordProviderSubmission({
      userId: ids.userId,
      runId: run.id,
      provider: "seedance-test",
      providerRequestId,
    });
    await service.recordProviderSubmission({
      userId: ids.userId,
      runId: run.id,
      provider: "seedance-test",
      providerRequestId,
    });
    await expect(
      service.recordProviderSubmission({
        userId: ids.userId,
        runId: run.id,
        provider: "seedance-test",
        providerRequestId: "conflicting-request",
      }),
    ).rejects.toMatchObject({ code: "idempotency_conflict" } satisfies Partial<GenerationDomainError>);
    expect((await db.select().from(creditAccounts).where(eq(creditAccounts.userId, ids.userId)))[0]?.balance).toBe(200);

    await service.finalizeProviderAccepted({
      userId: ids.userId,
      runId: run.id,
      provider: "seedance-test",
      providerRequestId,
    });
    await service.finalizeProviderAccepted({
      userId: ids.userId,
      runId: run.id,
      provider: "seedance-test",
      providerRequestId,
    });
    await expect(
      service.finalizeProviderAccepted({
        userId: ids.userId,
        runId: run.id,
        provider: "seedance-test",
        providerRequestId: "different-provider-request",
      }),
    ).rejects.toMatchObject({ code: "idempotency_conflict" } satisfies Partial<GenerationDomainError>);
    expect((await db.select().from(creditAccounts).where(eq(creditAccounts.userId, ids.userId)))[0]?.balance).toBe(110);
    expect((await db.select().from(creditReservations).where(eq(creditReservations.renderRunId, run.id)))[0]?.status).toBe(
      "charged",
    );

    await service.refundRender({ userId: ids.userId, runId: run.id, reason: "provider_failure" });
    await service.refundRender({ userId: ids.userId, runId: run.id, reason: "provider_failure_retry" });
    expect((await db.select().from(creditAccounts).where(eq(creditAccounts.userId, ids.userId)))[0]?.balance).toBe(200);
    expect((await db.select().from(creditReservations).where(eq(creditReservations.renderRunId, run.id)))[0]?.status).toBe(
      "refunded",
    );
    const ledger = await db.select().from(creditLedger).where(eq(creditLedger.userId, ids.userId));
    expect(ledger.map((entry) => entry.kind).sort()).toEqual(["charge", "refund"]);
  });

  it("prevents concurrent overspend and makes released credit available again", async () => {
    const service = createGenerationService(db);
    const ids = await fixture(100);
    const firstConfiguration = { duration: 4, variant: "first" };
    const secondConfiguration = { duration: 4, variant: "second" };
    const firstQuote = await service.createQuote({
      userId: ids.userId,
      capabilityAlias: "video.cinematic",
      credits: 70,
      entitlementEligible: false,
      breakdown: [{ label: "first", credits: 70 }],
      configuration: firstConfiguration,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const secondQuote = await service.createQuote({
      userId: ids.userId,
      capabilityAlias: "video.cinematic",
      credits: 70,
      entitlementEligible: false,
      breakdown: [{ label: "second", credits: 70 }],
      configuration: secondConfiguration,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const firstInput = {
      ...ids,
      quoteId: firstQuote.id,
      idempotencyKey: `generation:${randomUUID()}`,
      capabilityAlias: firstQuote.capabilityAlias,
      configuration: firstConfiguration,
    };
    const secondInput = {
      ...ids,
      quoteId: secondQuote.id,
      idempotencyKey: `generation:${randomUUID()}`,
      capabilityAlias: secondQuote.capabilityAlias,
      configuration: secondConfiguration,
    };

    const attempts = await Promise.allSettled([service.startRender(firstInput), service.startRender(secondInput)]);
    const successfulIndex = attempts.findIndex((attempt) => attempt.status === "fulfilled");
    const rejectedIndex = attempts.findIndex((attempt) => attempt.status === "rejected");
    expect(successfulIndex).toBeGreaterThanOrEqual(0);
    expect(rejectedIndex).toBeGreaterThanOrEqual(0);
    const successfulAttempt = attempts[successfulIndex];
    const rejectedAttempt = attempts[rejectedIndex];
    if (successfulAttempt?.status !== "fulfilled" || rejectedAttempt?.status !== "rejected") {
      throw new Error("expected exactly one reserved render and one rejected render");
    }
    expect(rejectedAttempt.reason).toMatchObject({
      code: "insufficient_credits",
    } satisfies Partial<GenerationDomainError>);
    const firstRun = successfulAttempt.value;
    const retryInput = successfulIndex === 0 ? secondInput : firstInput;

    await service.releaseRenderReservation({
      userId: ids.userId,
      runId: firstRun.id,
      reason: "provider_submission_failed",
    });
    const secondRun = await service.startRender(retryInput);
    expect(secondRun.id).not.toBe(firstRun.id);
    expect(
      (await db.select().from(creditReservations).where(eq(creditReservations.renderRunId, firstRun.id)))[0]?.status,
    ).toBe("released");
    expect((await db.select().from(creditAccounts).where(eq(creditAccounts.userId, ids.userId)))[0]?.balance).toBe(100);
  });

  it("reserves, consumes and restores the starter entitlement without ledger writes", async () => {
    const service = createGenerationService(db);
    const ids = await fixture(0, true);
    const configuration = { duration: 3, ratio: "9:16", template: "starter" };
    const quote = await service.createQuote({
      userId: ids.userId,
      capabilityAlias: "video.cinematic",
      credits: 54,
      entitlementEligible: true,
      breakdown: [{ label: "Starter render", credits: 54 }],
      configuration,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const run = await service.startRender({
      ...ids,
      quoteId: quote.id,
      idempotencyKey: `generation:${randomUUID()}`,
      capabilityAlias: quote.capabilityAlias,
      configuration,
    });
    expect(run.starterEntitlementUsed).toBe(true);
    await service.finalizeProviderAccepted({
      userId: ids.userId,
      runId: run.id,
      provider: "seedance-test",
      providerRequestId: `provider-${randomUUID()}`,
    });
    await service.refundRender({ userId: ids.userId, runId: run.id, reason: "provider_failure" });

    const [entitlement] = await db.select().from(entitlements).where(eq(entitlements.userId, ids.userId));
    expect(entitlement?.status).toBe("available");
    expect(await db.select().from(creditLedger).where(eq(creditLedger.userId, ids.userId))).toHaveLength(0);
  });

  it("database trigger keeps the credit ledger append-only", async () => {
    const service = createGenerationService(db);
    const ids = await fixture(100);
    const configuration = { duration: 3 };
    const quote = await service.createQuote({
      userId: ids.userId,
      capabilityAlias: "video.cinematic",
      credits: 10,
      entitlementEligible: false,
      breakdown: [{ label: "test", credits: 10 }],
      configuration,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const run = await service.startRender({
      ...ids,
      quoteId: quote.id,
      idempotencyKey: `generation:${randomUUID()}`,
      capabilityAlias: quote.capabilityAlias,
      configuration,
    });
    await service.finalizeProviderAccepted({
      userId: ids.userId,
      runId: run.id,
      provider: "seedance-test",
      providerRequestId: `provider-${randomUUID()}`,
    });

    let mutationError: unknown;
    try {
      await db.execute(sql`UPDATE credit_ledger SET reason = 'tampered' WHERE user_id = ${ids.userId}`);
    } catch (error) {
      mutationError = error;
    }
    expect(mutationError).toBeInstanceOf(Error);
    const cause = (mutationError as Error & { cause?: unknown }).cause;
    expect(`${(mutationError as Error).message} ${cause instanceof Error ? cause.message : String(cause ?? "")}`).toMatch(
      /append-only/,
    );
  });
});
