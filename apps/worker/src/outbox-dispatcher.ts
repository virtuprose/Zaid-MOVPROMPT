import { CapabilityAliasSchema, WORKER_JOB_NAMES, type GenerationJobPayload } from "@movprompt/contracts";
import { sql, type Database } from "@movprompt/db";
import { z } from "zod";

import type { WorkerLogger } from "./logger.js";

const RenderStartOutboxPayloadSchema = z
  .object({
    runId: z.uuid(),
    userId: z.uuid(),
    projectId: z.uuid(),
    projectVersionId: z.uuid(),
    quoteId: z.uuid(),
    capabilityAlias: CapabilityAliasSchema,
    configurationHash: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

type ClaimedOutboxJob = {
  id: string;
  topic: string;
  payload: unknown;
  attempts: number;
  maxAttempts: number;
};

export interface GenerationQueue {
  enqueueGeneration(
    payload: GenerationJobPayload,
    options?: { singletonKey?: string; delaySeconds?: number; singletonNextSlot?: boolean },
  ): Promise<string | null>;
}

export interface OutboxRepository {
  claimRenderStartJobs(input: {
    workerId: string;
    batchSize: number;
    leaseMs: number;
    now: Date;
  }): Promise<ClaimedOutboxJob[]>;
  complete(jobId: string, workerId: string, now: Date): Promise<boolean>;
  fail(input: {
    job: ClaimedOutboxJob;
    workerId: string;
    error: string;
    permanent: boolean;
    retryAt: Date;
    now: Date;
  }): Promise<boolean>;
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${label}_must_be_positive`);
  return value;
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 2_000);
}

function retryDelayMs(attempt: number): number {
  return Math.min(15 * 60_000, 5_000 * 2 ** Math.min(8, Math.max(0, attempt - 1)));
}

export type PostgresOutboxRepositoryOptions = {
  idempotencyKeyPrefix?: string;
};

export function createPostgresOutboxRepository(
  db: Database,
  options: PostgresOutboxRepositoryOptions = {},
): OutboxRepository {
  const idempotencyFilter = options.idempotencyKeyPrefix
    ? sql`AND idempotency_key LIKE ${`${options.idempotencyKeyPrefix}%`}`
    : sql``;

  return {
    async claimRenderStartJobs(input) {
      positiveInteger(input.batchSize, "outbox_batch_size");
      positiveInteger(input.leaseMs, "outbox_lease_ms");
      const now = input.now.toISOString();
      const leaseExpiredAt = new Date(input.now.getTime() - input.leaseMs).toISOString();

      // Make abandoned, exhausted leases visible as dead instead of leaving
      // them permanently stuck in processing after a worker crash.
      await db.execute(sql`
        UPDATE outbox_jobs
        SET status = 'dead',
            locked_at = NULL,
            locked_by = NULL,
            last_error = coalesce(last_error, 'outbox_lease_exhausted'),
            updated_at = ${now}::timestamptz
        WHERE topic = 'render.start'
          ${idempotencyFilter}
          AND status = 'processing'
          AND locked_at < ${leaseExpiredAt}::timestamptz
          AND attempts >= max_attempts
      `);

      const rows = await db.execute<ClaimedOutboxJob>(sql`
        WITH claimable AS (
          SELECT id
          FROM outbox_jobs
          WHERE topic = 'render.start'
            ${idempotencyFilter}
            AND attempts < max_attempts
            AND (
              (status IN ('pending', 'failed') AND available_at <= ${now}::timestamptz)
              OR (status = 'processing' AND locked_at < ${leaseExpiredAt}::timestamptz)
            )
          ORDER BY available_at ASC, created_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT ${input.batchSize}
        )
        UPDATE outbox_jobs AS jobs
        SET status = 'processing',
            attempts = jobs.attempts + 1,
            locked_at = ${now}::timestamptz,
            locked_by = ${input.workerId},
            last_error = NULL,
            updated_at = ${now}::timestamptz
        FROM claimable
        WHERE jobs.id = claimable.id
        RETURNING jobs.id,
                  jobs.topic,
                  jobs.payload,
                  jobs.attempts,
                  jobs.max_attempts AS "maxAttempts"
      `);
      return Array.from(rows);
    },

    async complete(jobId, workerId, now) {
      const completedAt = now.toISOString();
      const rows = await db.execute<{ id: string }>(sql`
        UPDATE outbox_jobs
        SET status = 'completed',
            locked_at = NULL,
            locked_by = NULL,
            updated_at = ${completedAt}::timestamptz
        WHERE id = ${jobId}
          AND status = 'processing'
          AND locked_by = ${workerId}
        RETURNING id
      `);
      return rows.length === 1;
    },

    async fail(input) {
      const dead = input.permanent || input.job.attempts >= input.job.maxAttempts;
      const retryAt = input.retryAt.toISOString();
      const failedAt = input.now.toISOString();
      const rows = await db.execute<{ id: string }>(sql`
        UPDATE outbox_jobs
        SET status = ${dead ? "dead" : "failed"}::outbox_status,
            available_at = ${retryAt}::timestamptz,
            locked_at = NULL,
            locked_by = NULL,
            last_error = ${input.error},
            updated_at = ${failedAt}::timestamptz
        WHERE id = ${input.job.id}
          AND status = 'processing'
          AND locked_by = ${input.workerId}
        RETURNING id
      `);
      return rows.length === 1;
    },
  };
}

export type OutboxDispatcherOptions = {
  repository: OutboxRepository;
  queue: GenerationQueue;
  workerId: string;
  logger: WorkerLogger;
  batchSize?: number;
  leaseMs?: number;
  pollIntervalMs?: number;
  now?: () => Date;
};

export class OutboxDispatcher {
  readonly #repository: OutboxRepository;
  readonly #queue: GenerationQueue;
  readonly #workerId: string;
  readonly #logger: WorkerLogger;
  readonly #batchSize: number;
  readonly #leaseMs: number;
  readonly #pollIntervalMs: number;
  readonly #now: () => Date;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #inFlight: Promise<void> | undefined;
  #running = false;

  constructor(options: OutboxDispatcherOptions) {
    this.#repository = options.repository;
    this.#queue = options.queue;
    this.#workerId = options.workerId;
    this.#logger = options.logger;
    this.#batchSize = positiveInteger(options.batchSize ?? 20, "outbox_batch_size");
    this.#leaseMs = positiveInteger(options.leaseMs ?? 60_000, "outbox_lease_ms");
    this.#pollIntervalMs = positiveInteger(options.pollIntervalMs ?? 1_000, "outbox_poll_interval_ms");
    this.#now = options.now ?? (() => new Date());
  }

  start(): void {
    if (this.#running) return;
    this.#running = true;
    this.#schedule(0);
  }

  async stop(): Promise<void> {
    this.#running = false;
    if (this.#timer) clearTimeout(this.#timer);
    await this.#inFlight;
  }

  async dispatchOnce(): Promise<number> {
    const claimed = await this.#repository.claimRenderStartJobs({
      workerId: this.#workerId,
      batchSize: this.#batchSize,
      leaseMs: this.#leaseMs,
      now: this.#now(),
    });

    for (const job of claimed) await this.#dispatch(job);
    return claimed.length;
  }

  #schedule(delayMs: number): void {
    this.#timer = setTimeout(() => {
      this.#inFlight = this.dispatchOnce()
        .then((count) => {
          if (count > 0) this.#logger.info("render_outbox_dispatched", { count, workerId: this.#workerId });
        })
        .catch((error) => {
          this.#logger.error("render_outbox_poll_failed", {
            workerId: this.#workerId,
            error: errorMessage(error),
          });
        })
        .finally(() => {
          this.#inFlight = undefined;
          if (this.#running) this.#schedule(this.#pollIntervalMs);
        });
    }, delayMs);
  }

  async #dispatch(job: ClaimedOutboxJob): Promise<void> {
    const parsed = RenderStartOutboxPayloadSchema.safeParse(job.payload);
    if (!parsed.success) {
      await this.#repository.fail({
        job,
        workerId: this.#workerId,
        error: `invalid_render_start_payload:${z.prettifyError(parsed.error)}`.slice(0, 2_000),
        permanent: true,
        retryAt: this.#now(),
        now: this.#now(),
      });
      return;
    }

    const payload: GenerationJobPayload = {
      renderRunId: parsed.data.runId,
      userId: parsed.data.userId,
      projectId: parsed.data.projectId,
      projectVersionId: parsed.data.projectVersionId,
      quoteId: parsed.data.quoteId,
      capability: parsed.data.capabilityAlias,
      idempotencyKey: `render.start:${parsed.data.runId}`,
      requestId: job.id,
    };

    try {
      // A null result means pg-boss already has this singleton. Delivery is
      // therefore satisfied; the render handler is idempotent as a second floor.
      await this.#queue.enqueueGeneration(payload, { singletonKey: `submit:${parsed.data.runId}` });
      const completed = await this.#repository.complete(job.id, this.#workerId, this.#now());
      if (!completed) {
        this.#logger.warn("render_outbox_lease_lost_after_enqueue", { outboxJobId: job.id });
      }
    } catch (error) {
      const now = this.#now();
      await this.#repository.fail({
        job,
        workerId: this.#workerId,
        error: errorMessage(error),
        permanent: false,
        retryAt: new Date(now.getTime() + retryDelayMs(job.attempts)),
        now,
      });
    }
  }
}

export const RENDER_START_OUTBOX_TOPIC = "render.start";
export const RENDER_GENERATION_QUEUE = WORKER_JOB_NAMES.generation;
