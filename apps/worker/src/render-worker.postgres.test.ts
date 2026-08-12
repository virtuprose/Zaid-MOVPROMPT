import { randomUUID } from "node:crypto";
import type { GenerationJobPayload } from "@movprompt/contracts";
import {
  createDatabase,
  createGenerationService,
  creatorProjects,
  creatorProjectVersions,
  creditAccounts,
  creditLedger,
  eq,
  outboxJobs,
  renderRuns,
  users,
  type Database,
} from "@movprompt/db";
import {
  CapabilityRegistry,
  ProviderAdapterRegistry,
  type ProviderAdapter,
  type ProviderOperation,
} from "@movprompt/providers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { WorkerJobContext } from "./handlers.js";
import type { WorkerLogger } from "./logger.js";
import {
  createPostgresOutboxRepository,
  OutboxDispatcher,
  type GenerationQueue,
} from "./outbox-dispatcher.js";
import {
  createDatabaseGenerationBilling,
  createDatabaseRenderLifecycleStore,
  createGenerationLifecycleHandler,
} from "./render-lifecycle.js";

const integrationUrl = process.env.MOVPROMPT_TEST_DATABASE_URL;
const describePostgres = integrationUrl ? describe.sequential : describe.skip;
const logger: WorkerLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

describePostgres("render worker PostgreSQL lifecycle", () => {
  let database: ReturnType<typeof createDatabase>;
  let db: Database;

  beforeAll(() => {
    database = createDatabase({ url: integrationUrl!, applicationName: "movprompt-worker-tests" });
    db = database.db;
  });

  afterAll(async () => {
    await database.close();
  });

  async function fixture() {
    const userId = randomUUID();
    const projectId = randomUUID();
    const projectVersionId = randomUUID();
    await db.insert(users).values({ id: userId, name: "Worker Test", email: `${userId}@example.test` });
    await db.insert(creatorProjects).values({ id: projectId, userId, title: "Worker test" });
    await db.insert(creatorProjectVersions).values({
      id: projectVersionId,
      projectId,
      userId,
      mode: "advanced",
      versionNumber: 1,
      configuration: { prompt: "Premium perfume rotating under a soft rim light.", durationSeconds: 5 },
    });
    await db.insert(creditAccounts).values({ userId, balance: 100 });
    return { userId, projectId, projectVersionId };
  }

  function context(): WorkerJobContext {
    return {
      jobId: randomUUID(),
      jobName: "generation.render.v1",
      workerId: "worker-test",
      retryCount: 0,
      retryLimit: 5,
      signal: new AbortController().signal,
      logger,
    };
  }

  it("dispatches the transactional outbox through pg-boss boundary once", async () => {
    const service = createGenerationService(db);
    const ids = await fixture();
    const configuration = { prompt: "Premium perfume rotating under a soft rim light.", durationSeconds: 5 };
    const quote = await service.createQuote({
      userId: ids.userId,
      capabilityAlias: "video.cinematic",
      credits: 40,
      entitlementEligible: false,
      breakdown: [{ label: "5 second render", credits: 40 }],
      configuration,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const run = await service.startRender({
      ...ids,
      quoteId: quote.id,
      capabilityAlias: quote.capabilityAlias,
      idempotencyKey: `generation:${randomUUID()}`,
      configuration,
    });
    await db
      .update(outboxJobs)
      .set({ availableAt: new Date(Date.now() + 60_000) })
      .where(eq(outboxJobs.topic, "render.start"));
    await db
      .update(outboxJobs)
      .set({ availableAt: new Date(Date.now() - 1_000) })
      .where(eq(outboxJobs.idempotencyKey, `render.start:${run.id}`));
    const enqueueGeneration = vi.fn(async () => "pg-boss-job-id");
    const queue: GenerationQueue = { enqueueGeneration };
    const dispatcher = new OutboxDispatcher({
      repository: createPostgresOutboxRepository(db, {
        idempotencyKeyPrefix: `render.start:${run.id}`,
      }),
      queue,
      workerId: "dispatcher-test",
      logger,
    });

    expect(await dispatcher.dispatchOnce()).toBe(1);
    expect(enqueueGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ renderRunId: run.id, userId: ids.userId }),
      { singletonKey: `submit:${run.id}` },
    );
    const [outbox] = await db
      .select()
      .from(outboxJobs)
      .where(eq(outboxJobs.idempotencyKey, `render.start:${run.id}`));
    expect(outbox?.status).toBe("completed");
    expect(outbox?.attempts).toBe(1);
  });

  it("uses SKIP LOCKED so concurrent dispatchers never claim the same row", async () => {
    const marker = randomUUID();
    await db.insert(outboxJobs).values(
      Array.from({ length: 4 }, (_, index) => ({
        topic: "render.start",
        idempotencyKey: `concurrent:${marker}:${index}`,
        payload: {},
      })),
    );
    const repository = createPostgresOutboxRepository(db, {
      idempotencyKeyPrefix: `concurrent:${marker}:`,
    });
    const now = new Date();
    await db
      .update(outboxJobs)
      .set({ availableAt: new Date(now.getTime() + 60_000) })
      .where(eq(outboxJobs.topic, "render.start"));
    for (let index = 0; index < 4; index += 1) {
      await db
        .update(outboxJobs)
        .set({ availableAt: new Date(now.getTime() - 1_000) })
        .where(eq(outboxJobs.idempotencyKey, `concurrent:${marker}:${index}`));
    }
    const [first, second] = await Promise.all([
      repository.claimRenderStartJobs({ workerId: "worker-a", batchSize: 2, leaseMs: 60_000, now }),
      repository.claimRenderStartJobs({ workerId: "worker-b", batchSize: 2, leaseMs: 60_000, now }),
    ]);
    const ids = [...first, ...second].map((job) => job.id);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
  });

  it("charges only after acceptance, then records terminal failure and refunds once", async () => {
    const service = createGenerationService(db);
    const ids = await fixture();
    const configuration = { prompt: "Premium perfume rotating under a soft rim light.", durationSeconds: 5 };
    const quote = await service.createQuote({
      userId: ids.userId,
      capabilityAlias: "video.cinematic",
      credits: 40,
      entitlementEligible: false,
      breakdown: [{ label: "5 second render", credits: 40 }],
      configuration,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const run = await service.startRender({
      ...ids,
      quoteId: quote.id,
      capabilityAlias: quote.capabilityAlias,
      idempotencyKey: `generation:${randomUUID()}`,
      configuration,
    });
    const job: GenerationJobPayload = {
      renderRunId: run.id,
      userId: ids.userId,
      projectId: ids.projectId,
      projectVersionId: ids.projectVersionId,
      quoteId: quote.id,
      capability: "video.cinematic",
      idempotencyKey: `render.start:${run.id}`,
      requestId: randomUUID(),
    };

    let operation: ProviderOperation = { providerRequestId: "provider-request-1", status: "processing" };
    const provider: ProviderAdapter = {
      id: "test-provider",
      capability: "video.cinematic",
      submit: vi.fn(async () => ({
        providerRequestId: "provider-request-1",
        status: "queued",
        acceptedAt: new Date().toISOString(),
      })),
      getStatus: vi.fn(async () => operation),
      cancel: vi.fn(async () => ({ providerRequestId: "provider-request-1", status: "cancelled" })),
    };
    const capabilityRegistry = new CapabilityRegistry({
      "video.cinematic": {
        enabled: true,
        adapterId: provider.id,
        providerModelId: "server-private-model-id",
      },
    });
    const adapterRegistry = new ProviderAdapterRegistry();
    adapterRegistry.register(provider);
    const handler = createGenerationLifecycleHandler({
      store: createDatabaseRenderLifecycleStore(db),
      billing: createDatabaseGenerationBilling(db),
      capabilityRegistry,
      adapterRegistry,
      scheduleReconciliation: vi.fn(async () => undefined),
    });

    await handler.handle(job, context());
    expect((await db.select().from(creditAccounts).where(eq(creditAccounts.userId, ids.userId)))[0]?.balance).toBe(60);

    operation = {
      providerRequestId: "provider-request-1",
      status: "failed",
      errorCode: "invalid_provider_output",
    };
    await handler.handle(job, context());
    await handler.handle(job, context());

    const [settledRun] = await db.select().from(renderRuns).where(eq(renderRuns.id, run.id));
    expect(settledRun?.status).toBe("failed");
    expect(settledRun?.refundStatus).toBe("refunded");
    expect((await db.select().from(creditAccounts).where(eq(creditAccounts.userId, ids.userId)))[0]?.balance).toBe(100);
    expect(await db.select().from(creditLedger).where(eq(creditLedger.userId, ids.userId))).toHaveLength(2);
  });
});
