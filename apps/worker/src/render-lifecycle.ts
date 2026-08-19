import type { GenerationJobPayload } from "@movprompt/contracts";
import {
  CreativeBriefSchema,
  compileCreativeDirection,
  preflightCreativeBrief,
  type QualityDecision,
} from "@movprompt/creative-engine";
import {
  createGenerationService,
  creatorProjects,
  creatorProjectVersions,
  and,
  eq,
  hashGenerationConfiguration,
  outboxJobs,
  renderAttempts,
  renderRuns,
  sql,
  type Database,
  type GenerationService,
  type JsonObject,
  withUserTransaction,
} from "@movprompt/db";
import {
  CapabilityResolutionError,
  type CapabilityRegistry,
  type ProviderAdapter,
  type ProviderAdapterRegistry,
  type ProviderGenerationRequest,
  type ProviderOperation,
} from "@movprompt/providers";
import { z } from "zod";

import type { GenerationJobHandler, GenerationJobResult, WorkerJobContext } from "./handlers.js";

const GenerationConfigurationSchema = z
  .object({
    prompt: z.string().trim().min(1).max(8_000),
    durationSeconds: z.number().int().min(1).max(60).optional(),
    aspectRatio: z.enum(["9:16", "1:1", "4:5", "16:9"]).optional(),
    resolution: z.enum(["480p", "720p"]).default("720p"),
    audio: z.boolean().default(true),
    references: z
      .array(
        z
          .object({
            objectKey: z.string().trim().min(1).max(1_024),
            mimeType: z.string().trim().min(1).max(255),
          })
          .strict(),
      )
      .max(12)
      .default([]),
  })
  .passthrough();

type RenderStatus =
  | "submitting"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelling"
  | "cancelled";

export type RenderLifecycleSnapshot = {
  id: string;
  userId: string;
  projectId: string;
  projectVersionId: string;
  quoteId: string;
  capabilityAlias: string;
  idempotencyKey: string;
  status: RenderStatus;
  processingStage: "preparing" | "rendering" | "securing_output" | "quality_review" | "ready" | "cancelling" | "failed" | "cancelled";
  provider: string | null;
  providerRequestId: string | null;
  chargedAt: Date | null;
  refundStatus: "not_required" | "pending" | "refunded";
  qualityAttempt: number;
  maxQualityRetries: number;
  qualityRetryDirective: string | null;
  configuration: JsonObject;
};

export interface RenderLifecycleStore {
  load(payload: GenerationJobPayload): Promise<RenderLifecycleSnapshot>;
  beginProviderSubmission(input: {
    runId: string;
    userId: string;
    provider: string;
    attemptNumber: number;
    now: Date;
  }): Promise<boolean>;
  updateProviderStatus(input: {
    runId: string;
    userId: string;
    status: "queued" | "processing" | "cancelling";
    attemptNumber: number;
    now: Date;
  }): Promise<void>;
  updateProcessingStage(input: {
    runId: string;
    userId: string;
    stage: "securing_output" | "quality_review";
    now: Date;
  }): Promise<void>;
  recordRetryableFailure(input: {
    runId: string;
    userId: string;
    errorCode: string;
    errorMessage: string;
    now: Date;
  }): Promise<void>;
  recordProviderTelemetry(input: {
    runId: string;
    userId: string;
    attemptNumber: number;
    providerCostMicrousd?: number;
    providerLatencyMs?: number;
    providerUsage?: JsonObject;
    now: Date;
  }): Promise<void>;
  complete(input: {
    runId: string;
    userId: string;
    outputBucket: string;
    outputObjectKey: string;
    attemptNumber: number;
    now: Date;
  }): Promise<void>;
  markTerminal(input: {
    runId: string;
    userId: string;
    status: "failed" | "cancelled";
    errorCode: string;
    errorMessage?: string;
    attemptNumber: number;
    now: Date;
  }): Promise<void>;
  prepareQualityRetry(input: {
    runId: string;
    userId: string;
    attemptNumber: number;
    maxRetries: number;
    outputBucket: string;
    outputObjectKey: string;
    decision: QualityDecision;
    now: Date;
  }): Promise<void>;
}

export interface RenderOutputPersister {
  persist(input: {
    runId: string;
    userId: string;
    projectId: string;
    projectVersionId: string;
    attemptNumber: number;
    sourceUrl: string;
    configuration: JsonObject;
  }): Promise<{ bucket: string; objectKey: string }>;
}

export interface RenderOutputQualityReviewer {
  review(input: {
    runId: string;
    userId: string;
    projectId: string;
    projectVersionId: string;
    bucket: string;
    objectKey: string;
    attemptNumber: number;
    configuration: JsonObject;
  }): Promise<QualityDecision>;
}

export type ScheduleRenderReconciliation = (
  payload: GenerationJobPayload,
  delaySeconds: number,
) => Promise<void>;

export class RenderLifecycleError extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean,
    message = code,
  ) {
    super(message);
    this.name = "RenderLifecycleError";
  }
}

function cleanError(error: unknown): { code: string; message: string } {
  if (error instanceof RenderLifecycleError) {
    return { code: error.code, message: error.message.slice(0, 2_000) };
  }
  if (error instanceof CapabilityResolutionError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof z.ZodError) {
    return { code: "invalid_generation_configuration", message: z.prettifyError(error).slice(0, 2_000) };
  }
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith("provider_output_host_not_allowed:")) {
    return { code: "provider_output_host_not_allowed", message: message.slice(0, 2_000) };
  }
  if (message.startsWith("provider_output_")) {
    return { code: "provider_output_unavailable", message: message.slice(0, 2_000) };
  }
  return { code: "provider_operation_failed", message: message.slice(0, 2_000) };
}

function isPermanentPreAcceptanceError(error: unknown): boolean {
  if (error instanceof CapabilityResolutionError || error instanceof z.ZodError) return true;
  if (error instanceof RenderLifecycleError) return !error.retryable;
  if (error instanceof Error && error.message === "provider_adapter_unavailable") return true;
  return Boolean(
    typeof error === "object" && error !== null && "retryable" in error && error.retryable === false,
  );
}

function sourceUrl(value: string | undefined): string {
  if (!value) throw new RenderLifecycleError("provider_output_missing", false);
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new RenderLifecycleError("provider_output_invalid", false);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new RenderLifecycleError("provider_output_invalid", false);
  }
  return parsed.toString();
}

function configurationInput(configuration: JsonObject): unknown {
  const nested = configuration.generation;
  return typeof nested === "object" && nested !== null && !Array.isArray(nested) ? nested : configuration;
}

export function createDatabaseRenderLifecycleStore(db: Database): RenderLifecycleStore {
  return {
    async load(payload) {
      const [row] = await withUserTransaction(db, payload.userId, (tx) =>
        tx
          .select({
            id: renderRuns.id,
            userId: renderRuns.userId,
            projectId: renderRuns.projectId,
            projectVersionId: renderRuns.projectVersionId,
            quoteId: renderRuns.quoteId,
            capabilityAlias: renderRuns.capabilityAlias,
            idempotencyKey: renderRuns.idempotencyKey,
            status: renderRuns.status,
            processingStage: renderRuns.processingStage,
            provider: renderRuns.provider,
            providerRequestId: renderRuns.providerRequestId,
            chargedAt: renderRuns.chargedAt,
            refundStatus: renderRuns.refundStatus,
            qualityAttempt: renderRuns.qualityAttempt,
            maxQualityRetries: renderRuns.maxQualityRetries,
            qualityRetryDirective: renderRuns.qualityRetryDirective,
            configuration: creatorProjectVersions.configuration,
          })
          .from(renderRuns)
          .innerJoin(
            creatorProjectVersions,
            eq(creatorProjectVersions.id, renderRuns.projectVersionId),
          )
          .where(
            and(eq(renderRuns.id, payload.renderRunId), eq(renderRuns.userId, payload.userId)),
          )
          .limit(1),
      );
      if (!row) throw new RenderLifecycleError("render_not_found", false);
      if (
        row.projectId !== payload.projectId ||
        row.projectVersionId !== payload.projectVersionId ||
        row.quoteId !== payload.quoteId ||
        row.capabilityAlias !== payload.capability
      ) {
        throw new RenderLifecycleError("render_job_payload_mismatch", false);
      }
      return row;
    },

    async beginProviderSubmission(input) {
      return withUserTransaction(db, input.userId, async (tx) => {
        const [run] = await tx
          .select({
            status: renderRuns.status,
            provider: renderRuns.provider,
            providerRequestId: renderRuns.providerRequestId,
            qualityAttempt: renderRuns.qualityAttempt,
          })
          .from(renderRuns)
          .where(and(eq(renderRuns.id, input.runId), eq(renderRuns.userId, input.userId)))
          .for("update")
          .limit(1);
        if (!run) throw new RenderLifecycleError("render_not_found", false);
        if (run.providerRequestId) {
          if (run.provider !== input.provider) {
            throw new RenderLifecycleError("provider_submission_identity_mismatch", false);
          }
          return false;
        }
        if (
          run.status !== "submitting" ||
          run.qualityAttempt !== input.attemptNumber ||
          (run.provider && run.provider !== input.provider)
        ) {
          throw new RenderLifecycleError("provider_submission_unavailable", false);
        }
        if (!run.provider) {
          const [updated] = await tx
            .update(renderRuns)
            .set({
              provider: input.provider,
              processingStage: "rendering",
              errorCode: null,
              errorMessage: null,
              updatedAt: input.now,
            })
            .where(
              and(
                eq(renderRuns.id, input.runId),
                eq(renderRuns.userId, input.userId),
                eq(renderRuns.status, "submitting"),
              ),
            )
            .returning({ id: renderRuns.id });
          if (!updated) throw new RenderLifecycleError("provider_submission_unavailable", false);
        }
        return true;
      });
    },

    async updateProviderStatus(input) {
      await withUserTransaction(db, input.userId, async (tx) => {
        const [updated] = await tx
          .update(renderRuns)
          .set({
            status: input.status,
            processingStage: input.status === "cancelling" ? "cancelling" : "rendering",
            errorCode: null,
            errorMessage: null,
            updatedAt: input.now,
          })
          .where(and(eq(renderRuns.id, input.runId), eq(renderRuns.userId, input.userId)))
          .returning({
            id: renderRuns.id,
            projectId: renderRuns.projectId,
            projectVersionId: renderRuns.projectVersionId,
          });
        if (!updated) throw new RenderLifecycleError("render_not_found", false);
        await tx
          .update(creatorProjects)
          .set({
            status: "generating",
            updatedAt: input.now,
          })
          .where(
            and(
              eq(creatorProjects.id, updated.projectId),
              eq(creatorProjects.userId, input.userId),
              eq(creatorProjects.currentWorkingVersionId, updated.projectVersionId),
            ),
          );
        await tx
          .update(renderAttempts)
          .set({ status: input.status === "queued" ? "submitted" : "processing", updatedAt: input.now })
          .where(
            and(
              eq(renderAttempts.renderRunId, input.runId),
              eq(renderAttempts.userId, input.userId),
              eq(renderAttempts.attemptNumber, input.attemptNumber),
            ),
          );
      });
    },

    async updateProcessingStage(input) {
      const [updated] = await withUserTransaction(db, input.userId, (tx) => tx
        .update(renderRuns)
        .set({
          status: "processing",
          processingStage: input.stage,
          errorCode: null,
          errorMessage: null,
          updatedAt: input.now,
        })
        .where(and(eq(renderRuns.id, input.runId), eq(renderRuns.userId, input.userId)))
        .returning({ id: renderRuns.id }));
      if (!updated) throw new RenderLifecycleError("render_not_found", false);
    },

    async recordRetryableFailure(input) {
      const [updated] = await withUserTransaction(db, input.userId, (tx) => tx
        .update(renderRuns)
        .set({
          errorCode: input.errorCode,
          errorMessage: input.errorMessage,
          updatedAt: input.now,
        })
        .where(and(eq(renderRuns.id, input.runId), eq(renderRuns.userId, input.userId)))
        .returning({ id: renderRuns.id }));
      if (!updated) throw new RenderLifecycleError("render_not_found", false);
    },

    async recordProviderTelemetry(input) {
      if (
        input.providerCostMicrousd === undefined &&
        input.providerLatencyMs === undefined &&
        input.providerUsage === undefined
      ) return;
      const [updated] = await withUserTransaction(db, input.userId, (tx) =>
        tx
          .update(renderAttempts)
          .set({
            ...(input.providerCostMicrousd === undefined
              ? {}
              : { providerCostMicrousd: input.providerCostMicrousd }),
            ...(input.providerLatencyMs === undefined
              ? {}
              : { providerLatencyMs: input.providerLatencyMs }),
            ...(input.providerUsage === undefined ? {} : { providerUsage: input.providerUsage }),
            updatedAt: input.now,
          })
          .where(
            and(
              eq(renderAttempts.renderRunId, input.runId),
              eq(renderAttempts.userId, input.userId),
              eq(renderAttempts.attemptNumber, input.attemptNumber),
            ),
          )
          .returning({ id: renderAttempts.id }),
      );
      if (!updated) throw new RenderLifecycleError("render_attempt_not_found", false);
    },

    async complete(input) {
      await withUserTransaction(db, input.userId, async (tx) => {
        const [updated] = await tx
          .update(renderRuns)
          .set({
            status: "completed",
            processingStage: "ready",
            outputBucket: input.outputBucket,
            outputObjectKey: input.outputObjectKey,
            completedAt: input.now,
            errorCode: null,
            errorMessage: null,
            updatedAt: input.now,
          })
          .where(and(eq(renderRuns.id, input.runId), eq(renderRuns.userId, input.userId)))
          .returning({
            id: renderRuns.id,
            projectId: renderRuns.projectId,
            projectVersionId: renderRuns.projectVersionId,
          });
        if (!updated) throw new RenderLifecycleError("render_not_found", false);
        await tx
          .update(creatorProjects)
          .set({
            status: "completed",
            currentAcceptedVersionId: updated.projectVersionId,
            updatedAt: input.now,
          })
          .where(
            and(
              eq(creatorProjects.id, updated.projectId),
              eq(creatorProjects.userId, input.userId),
              eq(creatorProjects.currentWorkingVersionId, updated.projectVersionId),
            ),
          );
        await tx
          .update(renderAttempts)
          .set({
            status: "accepted",
            candidateBucket: input.outputBucket,
            candidateObjectKey: input.outputObjectKey,
            updatedAt: input.now,
          })
          .where(
            and(
              eq(renderAttempts.renderRunId, input.runId),
              eq(renderAttempts.userId, input.userId),
              eq(renderAttempts.attemptNumber, input.attemptNumber),
            ),
          );
      });
    },

    async markTerminal(input) {
      await withUserTransaction(db, input.userId, async (tx) => {
        const [updated] = await tx
          .update(renderRuns)
          .set({
            status: input.status,
            processingStage: input.status === "cancelled" ? "cancelled" : "failed",
            errorCode: input.errorCode,
            errorMessage: input.errorMessage,
            updatedAt: input.now,
          })
          .where(and(eq(renderRuns.id, input.runId), eq(renderRuns.userId, input.userId)))
          .returning({
            id: renderRuns.id,
            projectId: renderRuns.projectId,
            projectVersionId: renderRuns.projectVersionId,
          });
        if (!updated) throw new RenderLifecycleError("render_not_found", false);
        await tx
          .update(creatorProjects)
          .set({ status: "failed", updatedAt: input.now })
          .where(
            and(
              eq(creatorProjects.id, updated.projectId),
              eq(creatorProjects.userId, input.userId),
              eq(creatorProjects.currentWorkingVersionId, updated.projectVersionId),
            ),
          );
        await tx
          .update(renderAttempts)
          .set({ status: input.status === "cancelled" ? "cancelled" : "failed", updatedAt: input.now })
          .where(
            and(
              eq(renderAttempts.renderRunId, input.runId),
              eq(renderAttempts.userId, input.userId),
              eq(renderAttempts.attemptNumber, input.attemptNumber),
            ),
          );
      });
    },

    async prepareQualityRetry(input) {
      if (!Number.isSafeInteger(input.maxRetries) || input.maxRetries < 0 || input.maxRetries > 3) {
        throw new RenderLifecycleError("quality_retry_limit_invalid", false);
      }
      await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('movprompt.user_id', ${input.userId}, true)`);
        const [run] = await tx
          .select({
            run: renderRuns,
            configuration: creatorProjectVersions.configuration,
          })
          .from(renderRuns)
          .innerJoin(creatorProjectVersions, eq(creatorProjectVersions.id, renderRuns.projectVersionId))
          .where(and(eq(renderRuns.id, input.runId), eq(renderRuns.userId, input.userId)))
          .for("update")
          .limit(1);
        if (!run) throw new RenderLifecycleError("render_not_found", false);

        const current = run.run;
        if (
          current.qualityAttempt === input.attemptNumber + 1 &&
          current.status === "submitting" &&
          !current.providerRequestId
        ) {
          return;
        }
        if (
          current.qualityAttempt !== input.attemptNumber ||
          input.attemptNumber >= input.maxRetries ||
          !current.chargedAt ||
          !current.providerRequestId ||
          current.refundStatus === "refunded"
        ) {
          throw new RenderLifecycleError("quality_retry_unavailable", false);
        }

        const report: JsonObject = {
          status: input.decision.status,
          score: input.decision.score,
          failedDimensions: input.decision.failedDimensions,
          ...(input.decision.retryDirective ? { retryDirective: input.decision.retryDirective } : {}),
        };
        const [attempt] = await tx
          .update(renderAttempts)
          .set({
            status: "quality_rejected",
            candidateBucket: input.outputBucket,
            candidateObjectKey: input.outputObjectKey,
            qualityScore: input.decision.score,
            qualityDecision: report,
            updatedAt: input.now,
          })
          .where(
            and(
              eq(renderAttempts.renderRunId, current.id),
              eq(renderAttempts.userId, current.userId),
              eq(renderAttempts.attemptNumber, input.attemptNumber),
            ),
          )
          .returning({ id: renderAttempts.id });
        if (!attempt) throw new RenderLifecycleError("render_attempt_not_found", false);

        const nextAttempt = input.attemptNumber + 1;
        await tx
          .update(renderRuns)
          .set({
            status: "submitting",
            processingStage: "preparing",
            provider: null,
            providerRequestId: null,
            qualityAttempt: nextAttempt,
            maxQualityRetries: input.maxRetries,
            qualityRetryDirective: input.decision.retryDirective ?? "Improve every failed premium quality dimension.",
            lastQualityReport: report,
            errorCode: null,
            errorMessage: null,
            updatedAt: input.now,
          })
          .where(and(eq(renderRuns.id, current.id), eq(renderRuns.userId, current.userId)));

        await tx
          .insert(outboxJobs)
          .values({
            topic: "render.start",
            idempotencyKey: `render.quality_retry:${current.id}:${nextAttempt}`,
            payload: {
              runId: current.id,
              userId: current.userId,
              projectId: current.projectId,
              projectVersionId: current.projectVersionId,
              quoteId: current.quoteId,
              capabilityAlias: current.capabilityAlias,
              configurationHash: hashGenerationConfiguration(run.configuration),
              qualityAttempt: nextAttempt,
            },
            status: "pending",
            availableAt: input.now,
            createdAt: input.now,
            updatedAt: input.now,
          })
          .onConflictDoNothing({ target: outboxJobs.idempotencyKey });
      });
    },
  };
}

export type GenerationLifecycleHandlerOptions = {
  store: RenderLifecycleStore;
  billing: Pick<
    GenerationService,
    "recordProviderSubmission" | "finalizeProviderAccepted" | "releaseRenderReservation" | "refundRender"
  >;
  capabilityRegistry: CapabilityRegistry;
  adapterRegistry: ProviderAdapterRegistry;
  outputPersister?: RenderOutputPersister;
  outputQualityReviewer?: RenderOutputQualityReviewer;
  scheduleReconciliation: ScheduleRenderReconciliation;
  reconciliationDelaySeconds?: number;
  now?: () => Date;
};

export function createGenerationLifecycleHandler(options: GenerationLifecycleHandlerOptions): GenerationJobHandler {
  const reconciliationDelaySeconds = options.reconciliationDelaySeconds ?? 15;
  if (!Number.isSafeInteger(reconciliationDelaySeconds) || reconciliationDelaySeconds < 1) {
    throw new Error("reconciliation_delay_must_be_positive");
  }
  const now = options.now ?? (() => new Date());

  async function schedule(payload: GenerationJobPayload): Promise<void> {
    await options.scheduleReconciliation(payload, reconciliationDelaySeconds);
  }

  function resolveAdapter(snapshot: RenderLifecycleSnapshot): ProviderAdapter {
    const capability = options.capabilityRegistry.resolve(snapshot.capabilityAlias);
    return options.adapterRegistry.get(capability.adapterId, capability.alias);
  }

  async function terminateBeforeAcceptance(
    snapshot: RenderLifecycleSnapshot,
    error: unknown,
    cancelled = false,
  ): Promise<GenerationJobResult> {
    const failure = cleanError(error);
    await options.billing.releaseRenderReservation({
      userId: snapshot.userId,
      runId: snapshot.id,
      reason: failure.code,
      terminalStatus: cancelled ? "cancelled" : "failed",
      now: now(),
    });
    return { renderRunId: snapshot.id, outcome: "reconciled" };
  }

  async function terminateAfterAcceptance(
    snapshot: RenderLifecycleSnapshot,
    error: unknown,
    cancelled = false,
  ): Promise<GenerationJobResult> {
    const failure = cleanError(error);
    await options.store.markTerminal({
      runId: snapshot.id,
      userId: snapshot.userId,
      status: cancelled ? "cancelled" : "failed",
      errorCode: failure.code,
      errorMessage: failure.message,
      attemptNumber: snapshot.qualityAttempt,
      now: now(),
    });
    await options.billing.refundRender({
      userId: snapshot.userId,
      runId: snapshot.id,
      reason: failure.code,
      now: now(),
    });
    return { renderRunId: snapshot.id, outcome: "reconciled" };
  }

  async function persistCompleted(
    snapshot: RenderLifecycleSnapshot,
    operation: ProviderOperation,
  ): Promise<GenerationJobResult> {
    if (!options.outputPersister) {
      return terminateAfterAcceptance(
        snapshot,
        new RenderLifecycleError("output_persister_unavailable", false),
      );
    }
    await options.store.updateProcessingStage({
      runId: snapshot.id,
      userId: snapshot.userId,
      stage: "securing_output",
      now: now(),
    });
    const persisted = await options.outputPersister.persist({
      runId: snapshot.id,
      userId: snapshot.userId,
      projectId: snapshot.projectId,
      projectVersionId: snapshot.projectVersionId,
      attemptNumber: snapshot.qualityAttempt,
      sourceUrl: sourceUrl(operation.outputUrl),
      configuration: snapshot.configuration,
    });
    if (!persisted.bucket.trim() || !persisted.objectKey.trim()) {
      throw new RenderLifecycleError("persisted_output_invalid", false);
    }
    if (!options.outputQualityReviewer) {
      return terminateAfterAcceptance(
        snapshot,
        new RenderLifecycleError("output_quality_reviewer_unavailable", false),
      );
    }
    await options.store.updateProcessingStage({
      runId: snapshot.id,
      userId: snapshot.userId,
      stage: "quality_review",
      now: now(),
    });
    const quality = await options.outputQualityReviewer.review({
      runId: snapshot.id,
      userId: snapshot.userId,
      projectId: snapshot.projectId,
      projectVersionId: snapshot.projectVersionId,
      bucket: persisted.bucket,
      objectKey: persisted.objectKey,
      attemptNumber: snapshot.qualityAttempt,
      configuration: snapshot.configuration,
    });
    if (quality.status === "retry") {
      let maxRetries = snapshot.maxQualityRetries;
      const configuration = GenerationConfigurationSchema.parse(configurationInput(snapshot.configuration));
      if (configuration.creativeBrief !== undefined) {
        maxRetries = CreativeBriefSchema.parse(configuration.creativeBrief).qualityPolicy.internalRetryLimit;
      }
      await options.store.prepareQualityRetry({
        runId: snapshot.id,
        userId: snapshot.userId,
        attemptNumber: snapshot.qualityAttempt,
        maxRetries,
        outputBucket: persisted.bucket,
        outputObjectKey: persisted.objectKey,
        decision: quality,
        now: now(),
      });
      return { renderRunId: snapshot.id, outcome: "reconciled" };
    }
    if (quality.status !== "accepted") {
      return terminateAfterAcceptance(
        snapshot,
        new RenderLifecycleError(
          `quality_gate_${quality.status}`,
          false,
          `${quality.score}:${quality.failedDimensions.join(",")}`,
        ),
      );
    }
    await options.store.complete({
      runId: snapshot.id,
      userId: snapshot.userId,
      outputBucket: persisted.bucket,
      outputObjectKey: persisted.objectKey,
      attemptNumber: snapshot.qualityAttempt,
      now: now(),
    });
    return { renderRunId: snapshot.id, outcome: "reconciled" };
  }

  async function applyProviderOperation(
    payload: GenerationJobPayload,
    snapshot: RenderLifecycleSnapshot,
    operation: ProviderOperation,
  ): Promise<GenerationJobResult> {
    if (operation.providerRequestId !== snapshot.providerRequestId) {
      return terminateAfterAcceptance(
        snapshot,
        new RenderLifecycleError("provider_request_mismatch", false),
      );
    }
    if (operation.telemetry) {
      await options.store.recordProviderTelemetry({
        runId: snapshot.id,
        userId: snapshot.userId,
        attemptNumber: snapshot.qualityAttempt,
        ...(operation.telemetry.providerCostMicrousd === undefined
          ? {}
          : { providerCostMicrousd: operation.telemetry.providerCostMicrousd }),
        ...(operation.telemetry.providerLatencyMs === undefined
          ? {}
          : { providerLatencyMs: operation.telemetry.providerLatencyMs }),
        ...(operation.telemetry.usage === undefined
          ? {}
          : { providerUsage: operation.telemetry.usage as JsonObject }),
        now: now(),
      });
    }
    if (operation.status === "completed") return persistCompleted(snapshot, operation);
    if (operation.status === "failed") {
      return terminateAfterAcceptance(
        snapshot,
        new RenderLifecycleError(
          operation.errorCode?.trim() || "provider_failed",
          false,
          operation.errorMessage?.trim() || "provider_failed",
        ),
      );
    }
    if (operation.status === "cancelled") {
      return terminateAfterAcceptance(snapshot, new RenderLifecycleError("provider_cancelled", false), true);
    }

    await options.store.updateProviderStatus({
      runId: snapshot.id,
      userId: snapshot.userId,
      status: snapshot.status === "cancelling" ? "cancelling" : operation.status,
      attemptNumber: snapshot.qualityAttempt,
      now: now(),
    });
    await schedule(payload);
    return { renderRunId: snapshot.id, outcome: "reconciled" };
  }

  async function reconcile(
    payload: GenerationJobPayload,
    snapshot: RenderLifecycleSnapshot,
    context: WorkerJobContext,
  ): Promise<GenerationJobResult> {
    let adapter: ProviderAdapter;
    try {
      adapter = resolveAdapter(snapshot);
    } catch (error) {
      return terminateAfterAcceptance(snapshot, error);
    }

    // Once a provider request ID exists, acceptance is durable even if the
    // process died before the economic transition committed. Finalize that
    // idempotent transition before polling, completion, cancellation or any
    // refund path. If the database is temporarily unavailable, keep the run
    // recoverable and schedule another reconciliation instead of terminally
    // failing an accepted but not-yet-charged request.
    if (!snapshot.chargedAt) {
      try {
        await options.billing.finalizeProviderAccepted({
          userId: snapshot.userId,
          runId: snapshot.id,
          provider: snapshot.provider!,
          providerRequestId: snapshot.providerRequestId!,
          now: now(),
        });
      } catch {
        try {
          await schedule(payload);
        } catch (error) {
          throw new RenderLifecycleError(
            "reconciliation_schedule_failed",
            true,
            error instanceof Error ? error.message : String(error),
          );
        }
        return { renderRunId: snapshot.id, outcome: "reconciled" };
      }
    }

    try {
      const operation =
        snapshot.status === "cancelling"
          ? await adapter.cancel(snapshot.providerRequestId!)
          : await adapter.getStatus(snapshot.providerRequestId!);
      return await applyProviderOperation(payload, snapshot, operation);
    } catch (error) {
      const lastAttempt = context.retryCount >= context.retryLimit;
      if (isPermanentPreAcceptanceError(error) || lastAttempt) {
        return terminateAfterAcceptance(snapshot, error, context.signal.aborted);
      }
      const failure = cleanError(error);
      await options.store.recordRetryableFailure({
        runId: snapshot.id,
        userId: snapshot.userId,
        errorCode: failure.code,
        errorMessage: failure.message,
        now: now(),
      });
      throw error;
    }
  }

  return {
    async handle(payload, context) {
      const snapshot = await options.store.load(payload);

      if (snapshot.status === "completed") {
        return { renderRunId: snapshot.id, outcome: "reconciled" };
      }
      if (snapshot.status === "failed" || snapshot.status === "cancelled") {
        if (snapshot.chargedAt && snapshot.refundStatus !== "refunded") {
          await options.billing.refundRender({
            userId: snapshot.userId,
            runId: snapshot.id,
            reason: snapshot.status === "cancelled" ? "provider_cancelled" : "provider_failed",
            now: now(),
          });
        } else if (!snapshot.chargedAt) {
          await options.billing.releaseRenderReservation({
            userId: snapshot.userId,
            runId: snapshot.id,
            reason: snapshot.status === "cancelled" ? "provider_cancelled" : "provider_failed",
            terminalStatus: snapshot.status,
            now: now(),
          });
        }
        return { renderRunId: snapshot.id, outcome: "reconciled" };
      }

      if (snapshot.providerRequestId) return reconcile(payload, snapshot, context);
      if (snapshot.status === "cancelling" || context.signal.aborted) {
        return terminateBeforeAcceptance(
          snapshot,
          new RenderLifecycleError("provider_cancelled", false),
          true,
        );
      }
      if (snapshot.status !== "submitting") {
        throw new RenderLifecycleError("render_missing_provider_request", false);
      }

      let adapter: ProviderAdapter;
      let request: ProviderGenerationRequest;
      try {
        adapter = resolveAdapter(snapshot);
        const configuration = GenerationConfigurationSchema.parse(configurationInput(snapshot.configuration));
        let providerPrompt = configuration.prompt;
        let generateAudio = configuration.audio;
        if (configuration.creativeBrief !== undefined) {
          const creativeBrief = CreativeBriefSchema.parse(configuration.creativeBrief);
          const preflight = preflightCreativeBrief(creativeBrief);
          if (!preflight.passed) {
            throw new RenderLifecycleError(
              "creative_brief_preflight_failed",
              false,
              preflight.failures.join(","),
            );
          }
          const compiled = compileCreativeDirection({
            rawPrompt: configuration.prompt,
            creativeBrief,
            audioEnabled: configuration.audio,
          });
          if (compiled.dialectScore < 90) {
            throw new RenderLifecycleError(
              "kuwaiti_dialect_quality_failed",
              false,
              compiled.dialectWarnings.join(",") || "Kuwaiti dialect score is below the submission threshold.",
            );
          }
          providerPrompt = compiled.prompt;
          // Provider-native audio follows the explicit campaign toggle. The
          // compiled prompt additionally suppresses visible speech when audio
          // is disabled, including on presenter templates.
          generateAudio = configuration.audio;
        }
        if (snapshot.qualityAttempt > 0 && snapshot.qualityRetryDirective) {
          providerPrompt = `${providerPrompt}\n\nPREMIUM QUALITY RETRY ${snapshot.qualityAttempt}\nCorrect the rejected candidate without changing confirmed product or business facts:\n${snapshot.qualityRetryDirective}`;
        }
        request = {
          operationId: snapshot.id,
          userId: snapshot.userId,
          projectId: snapshot.projectId,
          capability: payload.capability,
          prompt: providerPrompt,
          references: configuration.references,
          generateAudio,
          idempotencyKey: `provider.submit:${snapshot.id}:${snapshot.qualityAttempt}`,
          ...(configuration.durationSeconds === undefined
            ? {}
            : { durationSeconds: configuration.durationSeconds }),
          ...(configuration.aspectRatio === undefined ? {} : { aspectRatio: configuration.aspectRatio }),
          resolution: configuration.resolution,
        };
      } catch (error) {
        return terminateBeforeAcceptance(snapshot, error);
      }

      try {
        const shouldSubmit = await options.store.beginProviderSubmission({
          runId: snapshot.id,
          userId: snapshot.userId,
          provider: adapter.id,
          attemptNumber: snapshot.qualityAttempt,
          now: now(),
        });
        if (!shouldSubmit) {
          const latest = await options.store.load(payload);
          if (!latest.providerRequestId) {
            throw new RenderLifecycleError("provider_submission_unavailable", true);
          }
          return reconcile(payload, latest, context);
        }
        const submission = await adapter.submit(request);
        // Persist the provider identity before any economic transition. If the
        // process dies after submit, the next pg-boss retry reconciles this
        // exact provider request instead of submitting a second render.
        await options.billing.recordProviderSubmission({
          userId: snapshot.userId,
          runId: snapshot.id,
          provider: adapter.id,
          providerRequestId: submission.providerRequestId,
          now: now(),
        });
        try {
          await options.billing.finalizeProviderAccepted({
            userId: snapshot.userId,
            runId: snapshot.id,
            provider: adapter.id,
            providerRequestId: submission.providerRequestId,
            now: now(),
          });
        } catch (error) {
          // The accepted request is already durable. Never release its hold as
          // a pre-acceptance failure; retry will reconcile/charge it by ID.
          throw new RenderLifecycleError(
            "provider_acceptance_not_finalized",
            true,
            error instanceof Error ? error.message : String(error),
          );
        }
      } catch (error) {
        const latest = await options.store.load(payload);
        if (latest.providerRequestId) throw error;
        const lastAttempt = context.retryCount >= context.retryLimit;
        if (isPermanentPreAcceptanceError(error) || lastAttempt || context.signal.aborted) {
          return terminateBeforeAcceptance(snapshot, error, context.signal.aborted);
        }
        throw error;
      }

      // Acceptance and charge are durable at this point. A queue outage must
      // be retried; it must never enter the pre-acceptance release path.
      try {
        await schedule(payload);
      } catch (error) {
        throw new RenderLifecycleError(
          "reconciliation_schedule_failed",
          true,
          error instanceof Error ? error.message : String(error),
        );
      }
      context.logger.info("render_provider_accepted", {
        renderRunId: snapshot.id,
        provider: adapter.id,
      });
      return { renderRunId: snapshot.id, outcome: "accepted" };
    },
  };
}

export function createDatabaseGenerationBilling(db: Database) {
  return createGenerationService(db);
}
