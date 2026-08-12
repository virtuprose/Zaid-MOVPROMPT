import type { GenerationJobPayload } from "@movprompt/contracts";
import {
  createGenerationService,
  creatorProjectVersions,
  and,
  eq,
  renderRuns,
  type Database,
  type GenerationService,
  type JsonObject,
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
  provider: string | null;
  providerRequestId: string | null;
  chargedAt: Date | null;
  refundStatus: "not_required" | "pending" | "refunded";
  configuration: JsonObject;
};

export interface RenderLifecycleStore {
  load(payload: GenerationJobPayload): Promise<RenderLifecycleSnapshot>;
  updateProviderStatus(input: {
    runId: string;
    userId: string;
    status: "queued" | "processing" | "cancelling";
    now: Date;
  }): Promise<void>;
  complete(input: {
    runId: string;
    userId: string;
    outputBucket: string;
    outputObjectKey: string;
    now: Date;
  }): Promise<void>;
  markTerminal(input: {
    runId: string;
    userId: string;
    status: "failed" | "cancelled";
    errorCode: string;
    errorMessage?: string;
    now: Date;
  }): Promise<void>;
}

export interface RenderOutputPersister {
  persist(input: {
    runId: string;
    userId: string;
    projectId: string;
    projectVersionId: string;
    sourceUrl: string;
  }): Promise<{ bucket: string; objectKey: string }>;
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
      const [row] = await db
        .select({
          id: renderRuns.id,
          userId: renderRuns.userId,
          projectId: renderRuns.projectId,
          projectVersionId: renderRuns.projectVersionId,
          quoteId: renderRuns.quoteId,
          capabilityAlias: renderRuns.capabilityAlias,
          idempotencyKey: renderRuns.idempotencyKey,
          status: renderRuns.status,
          provider: renderRuns.provider,
          providerRequestId: renderRuns.providerRequestId,
          chargedAt: renderRuns.chargedAt,
          refundStatus: renderRuns.refundStatus,
          configuration: creatorProjectVersions.configuration,
        })
        .from(renderRuns)
        .innerJoin(creatorProjectVersions, eq(creatorProjectVersions.id, renderRuns.projectVersionId))
        .where(and(eq(renderRuns.id, payload.renderRunId), eq(renderRuns.userId, payload.userId)))
        .limit(1);
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

    async updateProviderStatus(input) {
      const [updated] = await db
        .update(renderRuns)
        .set({ status: input.status, updatedAt: input.now })
        .where(and(eq(renderRuns.id, input.runId), eq(renderRuns.userId, input.userId)))
        .returning({ id: renderRuns.id });
      if (!updated) throw new RenderLifecycleError("render_not_found", false);
    },

    async complete(input) {
      const [updated] = await db
        .update(renderRuns)
        .set({
          status: "completed",
          outputBucket: input.outputBucket,
          outputObjectKey: input.outputObjectKey,
          completedAt: input.now,
          errorCode: null,
          errorMessage: null,
          updatedAt: input.now,
        })
        .where(and(eq(renderRuns.id, input.runId), eq(renderRuns.userId, input.userId)))
        .returning({ id: renderRuns.id });
      if (!updated) throw new RenderLifecycleError("render_not_found", false);
    },

    async markTerminal(input) {
      const [updated] = await db
        .update(renderRuns)
        .set({
          status: input.status,
          errorCode: input.errorCode,
          errorMessage: input.errorMessage,
          updatedAt: input.now,
        })
        .where(and(eq(renderRuns.id, input.runId), eq(renderRuns.userId, input.userId)))
        .returning({ id: renderRuns.id });
      if (!updated) throw new RenderLifecycleError("render_not_found", false);
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
    const persisted = await options.outputPersister.persist({
      runId: snapshot.id,
      userId: snapshot.userId,
      projectId: snapshot.projectId,
      projectVersionId: snapshot.projectVersionId,
      sourceUrl: sourceUrl(operation.outputUrl),
    });
    if (!persisted.bucket.trim() || !persisted.objectKey.trim()) {
      throw new RenderLifecycleError("persisted_output_invalid", false);
    }
    await options.store.complete({
      runId: snapshot.id,
      userId: snapshot.userId,
      outputBucket: persisted.bucket,
      outputObjectKey: persisted.objectKey,
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
      status: operation.status,
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

    try {
      const operation =
        snapshot.status === "cancelling"
          ? await adapter.cancel(snapshot.providerRequestId!)
          : await adapter.getStatus(snapshot.providerRequestId!);
      if (!snapshot.chargedAt && (operation.status === "queued" || operation.status === "processing")) {
        await options.billing.finalizeProviderAccepted({
          userId: snapshot.userId,
          runId: snapshot.id,
          provider: snapshot.provider!,
          providerRequestId: snapshot.providerRequestId!,
          now: now(),
        });
      }
      return await applyProviderOperation(payload, snapshot, operation);
    } catch (error) {
      const lastAttempt = context.retryCount >= context.retryLimit;
      if (isPermanentPreAcceptanceError(error) || lastAttempt) {
        return terminateAfterAcceptance(snapshot, error, context.signal.aborted);
      }
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
        request = {
          operationId: snapshot.id,
          capability: payload.capability,
          prompt: configuration.prompt,
          references: configuration.references,
          idempotencyKey: `provider.submit:${snapshot.id}`,
          ...(configuration.durationSeconds === undefined
            ? {}
            : { durationSeconds: configuration.durationSeconds }),
          ...(configuration.aspectRatio === undefined ? {} : { aspectRatio: configuration.aspectRatio }),
        };
      } catch (error) {
        return terminateBeforeAcceptance(snapshot, error);
      }

      try {
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
