import {
  ExportJobPayloadSchema,
  GenerationJobPayloadSchema,
  HealthJobPayloadSchema,
  WORKER_JOB_NAMES,
  type ExportJobPayload,
  type GenerationJobPayload,
  type HealthJobPayload,
  type WorkerJobName,
} from "@movprompt/contracts";
import { PgBoss, type JobWithMetadata } from "pg-boss";
import type { z } from "zod";
import type { WorkerConfig } from "./config.js";
import type {
  ExportJobHandler,
  GenerationJobHandler,
  HealthJobHandler,
  WorkerHandlers,
  WorkerJobContext,
} from "./handlers.js";
import { jsonWorkerLogger, type WorkerLogger } from "./logger.js";

const ABANDONED_CLAIM_CLEANUP_JOB = "abandoned-claim-cleanup.v1";

const DEAD_LETTER_QUEUES = {
  generation: `${WORKER_JOB_NAMES.generation}.dead-letter`,
  export: `${WORKER_JOB_NAMES.export}.dead-letter`,
} as const;

type JobSchema<T extends object> = z.ZodType<T>;
type JobHandler<T extends object, TResult> = {
  handle(payload: T, context: WorkerJobContext): Promise<TResult>;
};

export type PgBossWorkerOptions = {
  config: WorkerConfig;
  handlers: WorkerHandlers;
  abandonedClaimCleanup?: {
    cleanOne(input: { jobId: string; workerId: string; requestId: string }): Promise<unknown>;
  };
  logger?: WorkerLogger;
  boss?: PgBoss;
};

export class PgBossWorker {
  readonly #config: WorkerConfig;
  readonly #handlers: WorkerHandlers;
  readonly #abandonedClaimCleanup: PgBossWorkerOptions["abandonedClaimCleanup"];
  readonly #logger: WorkerLogger;
  readonly #boss: PgBoss;
  #started = false;

  constructor(options: PgBossWorkerOptions) {
    this.#config = options.config;
    this.#handlers = options.handlers;
    this.#abandonedClaimCleanup = options.abandonedClaimCleanup;
    this.#logger = options.logger ?? jsonWorkerLogger;
    this.#boss =
      options.boss ??
      new PgBoss({
        connectionString: options.config.databaseUrl,
        schema: "pgboss",
        // The database migration creates and locks down the dedicated schema.
        // Keeping schema creation out of the runtime worker avoids granting the
        // worker broad CREATE permission on the application database.
        createSchema: false,
      });
    this.#boss.on("error", (error) => {
      this.#logger.error("pg_boss_error", {
        workerId: this.#config.workerId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  async start(): Promise<void> {
    if (this.#started) return;
    await this.#boss.start();
    await this.#ensureQueues();

    await this.#registerHandler(
      WORKER_JOB_NAMES.health,
      HealthJobPayloadSchema,
      this.#handlers.health,
    );

    if (this.#handlers.generation) {
      await this.#registerHandler(
        WORKER_JOB_NAMES.generation,
        GenerationJobPayloadSchema,
        this.#handlers.generation,
      );
    }

    if (this.#handlers.export) {
      await this.#registerHandler(
        WORKER_JOB_NAMES.export,
        ExportJobPayloadSchema,
        this.#handlers.export,
      );
    }

    if (this.#abandonedClaimCleanup) {
      await this.#ensureQueue(ABANDONED_CLAIM_CLEANUP_JOB, {
        retryLimit: 5,
        retryDelay: 60,
        retryBackoff: true,
        retryDelayMax: 60 * 60,
        expireInSeconds: 15 * 60,
        notify: true,
      });
      await this.#boss.schedule(
        ABANDONED_CLAIM_CLEANUP_JOB,
        "*/15 * * * *",
        { requestId: "scheduled" },
        { key: ABANDONED_CLAIM_CLEANUP_JOB, singletonKey: ABANDONED_CLAIM_CLEANUP_JOB },
      );
      await this.#boss.work<{ requestId?: string }, unknown>(
        ABANDONED_CLAIM_CLEANUP_JOB,
        { batchSize: 1, includeMetadata: true },
        async (jobs) => {
          const job = jobs[0] as JobWithMetadata<{ requestId?: string }> | undefined;
          if (!job) throw new Error("pg_boss_returned_empty_batch");
          return this.#abandonedClaimCleanup!.cleanOne({
            jobId: job.id,
            workerId: this.#config.workerId,
            requestId: job.data.requestId ?? job.id,
          });
        },
      );
    }

    this.#started = true;
    this.#logger.info("worker_started", {
      workerId: this.#config.workerId,
      generationHandler: Boolean(this.#handlers.generation),
      exportHandler: Boolean(this.#handlers.export),
      abandonedClaimCleanup: Boolean(this.#abandonedClaimCleanup),
    });
  }

  async stop(): Promise<void> {
    if (!this.#started) return;
    await this.#boss.stop({ graceful: true, timeout: 30_000 });
    this.#started = false;
    this.#logger.info("worker_stopped", { workerId: this.#config.workerId });
  }

  async enqueueHealthCheck(requestId: string): Promise<string> {
    const payload: HealthJobPayload = {
      requestedAt: new Date().toISOString(),
      requestId,
    };
    const jobId = await this.#boss.send(WORKER_JOB_NAMES.health, payload);
    if (!jobId) throw new Error("worker_health_job_not_enqueued");
    return jobId;
  }

  async enqueueGeneration(
    payload: GenerationJobPayload,
    options: { singletonKey?: string; delaySeconds?: number; singletonNextSlot?: boolean } = {},
  ): Promise<string | null> {
    const validated = GenerationJobPayloadSchema.parse(payload);
    return this.#boss.send(WORKER_JOB_NAMES.generation, validated, {
      ...(options.singletonKey === undefined ? {} : { singletonKey: options.singletonKey }),
      ...(options.singletonNextSlot === undefined
        ? {}
        : { singletonNextSlot: options.singletonNextSlot }),
      ...(options.delaySeconds === undefined
        ? {}
        : { startAfter: new Date(Date.now() + options.delaySeconds * 1_000) }),
    });
  }

  async #ensureQueues(): Promise<void> {
    await this.#ensureQueue(DEAD_LETTER_QUEUES.generation, {
      retryLimit: 0,
      deleteAfterSeconds: 30 * 24 * 60 * 60,
    });
    await this.#ensureQueue(DEAD_LETTER_QUEUES.export, {
      retryLimit: 0,
      deleteAfterSeconds: 30 * 24 * 60 * 60,
    });
    await this.#ensureQueue(WORKER_JOB_NAMES.health, {
      retryLimit: 0,
      expireInSeconds: 60,
      deleteAfterSeconds: 24 * 60 * 60,
      notify: true,
    });
    await this.#ensureQueue(WORKER_JOB_NAMES.generation, {
      retryLimit: 5,
      retryDelay: 30,
      retryBackoff: true,
      retryDelayMax: 15 * 60,
      expireInSeconds: 2 * 60 * 60,
      heartbeatSeconds: 60,
      deadLetter: DEAD_LETTER_QUEUES.generation,
      notify: true,
    });
    await this.#ensureQueue(WORKER_JOB_NAMES.export, {
      retryLimit: 3,
      retryDelay: 20,
      retryBackoff: true,
      retryDelayMax: 10 * 60,
      expireInSeconds: 60 * 60,
      heartbeatSeconds: 60,
      deadLetter: DEAD_LETTER_QUEUES.export,
      notify: true,
    });
  }

  async #ensureQueue(
    name: string,
    options: Parameters<PgBoss["createQueue"]>[1],
  ): Promise<void> {
    if (!(await this.#boss.getQueue(name))) {
      await this.#boss.createQueue(name, options);
    }
  }

  async #registerHandler<T extends object, TResult>(
    name: WorkerJobName,
    schema: JobSchema<T>,
    handler: JobHandler<T, TResult>,
  ): Promise<void> {
    await this.#boss.work<T, TResult>(name, { batchSize: 1, includeMetadata: true }, async (jobs) => {
      // includeMetadata is locked to true above; pg-boss's batch overload does
      // not currently preserve that refinement in its callback inference.
      const job = jobs[0] as JobWithMetadata<T> | undefined;
      if (!job) throw new Error("pg_boss_returned_empty_batch");
      const payload = schema.parse(job.data);
      return handler.handle(payload, this.#contextFor(name, job));
    });
  }

  #contextFor<T extends object>(name: WorkerJobName, job: JobWithMetadata<T>): WorkerJobContext {
    return {
      jobId: job.id,
      jobName: name,
      workerId: this.#config.workerId,
      retryCount: job.retryCount,
      retryLimit: job.retryLimit,
      signal: job.signal,
      logger: this.#logger,
    };
  }
}

// These compile-time assignments keep handler contracts explicit at the queue boundary.
type _GenerationHandlerContract = GenerationJobHandler extends JobHandler<
  GenerationJobPayload,
  infer _GenerationResult
>
  ? true
  : never;
type _ExportHandlerContract = ExportJobHandler extends JobHandler<ExportJobPayload, infer _ExportResult>
  ? true
  : never;
type _HealthHandlerContract = HealthJobHandler extends JobHandler<HealthJobPayload, infer _HealthResult>
  ? true
  : never;

export type WorkerHandlerContractAssertions = [
  _GenerationHandlerContract,
  _ExportHandlerContract,
  _HealthHandlerContract,
];
