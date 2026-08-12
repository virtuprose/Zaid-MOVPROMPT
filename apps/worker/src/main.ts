import { randomUUID } from "node:crypto";
import { createDatabase } from "@movprompt/db";
import {
  createCapabilityRegistryFromEnvironment,
  ProviderAdapterRegistry,
} from "@movprompt/providers";
import { loadWorkerConfig } from "./config.js";
import { createHealthJobHandler } from "./handlers.js";
import { jsonWorkerLogger } from "./logger.js";
import { createPostgresOutboxRepository, OutboxDispatcher } from "./outbox-dispatcher.js";
import { PgBossWorker } from "./pg-boss-worker.js";
import {
  createDatabaseGenerationBilling,
  createDatabaseRenderLifecycleStore,
  createGenerationLifecycleHandler,
} from "./render-lifecycle.js";

const config = loadWorkerConfig();
const database = createDatabase({
  url: config.databaseUrl,
  applicationName: `${config.serviceName}-outbox`,
  ssl: process.env.DATABASE_SSL === "require" ? "require" : false,
});
const capabilityRegistry = createCapabilityRegistryFromEnvironment(process.env);
// Concrete provider packages register their adapters at this server-only
// composition boundary. An empty registry deliberately fails closed.
const adapterRegistry = new ProviderAdapterRegistry();

let resolveWorker: (worker: PgBossWorker) => void = () => undefined;
const workerReady = new Promise<PgBossWorker>((resolve) => {
  resolveWorker = resolve;
});
const generationHandler = createGenerationLifecycleHandler({
  store: createDatabaseRenderLifecycleStore(database.db),
  billing: createDatabaseGenerationBilling(database.db),
  capabilityRegistry,
  adapterRegistry,
  reconciliationDelaySeconds: config.renderReconciliationDelaySeconds,
  scheduleReconciliation: async (payload, delaySeconds) => {
    const worker = await workerReady;
    await worker.enqueueGeneration(payload, {
      singletonKey: `reconcile:${payload.renderRunId}`,
      singletonNextSlot: true,
      delaySeconds,
    });
  },
});

const worker = new PgBossWorker({
  config,
  logger: jsonWorkerLogger,
  handlers: {
    health: createHealthJobHandler(),
    generation: generationHandler,
  },
});
resolveWorker(worker);

const dispatcher = new OutboxDispatcher({
  repository: createPostgresOutboxRepository(database.db),
  queue: worker,
  workerId: config.workerId,
  logger: jsonWorkerLogger,
  batchSize: config.outboxBatchSize,
  leaseMs: config.outboxLeaseMs,
  pollIntervalMs: config.outboxPollIntervalMs,
});

await worker.start();
dispatcher.start();

if (config.smokeTestOnStart) {
  const jobId = await worker.enqueueHealthCheck(randomUUID());
  jsonWorkerLogger.info("worker_health_job_enqueued", { jobId, workerId: config.workerId });
}

let stopping = false;
async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  jsonWorkerLogger.info("worker_stopping", { signal, workerId: config.workerId });
  try {
    await dispatcher.stop();
    await worker.stop();
    await database.close();
  } catch (error) {
    jsonWorkerLogger.error("worker_stop_failed", {
      workerId: config.workerId,
      error: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  }
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
