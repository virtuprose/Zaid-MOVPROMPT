import { randomUUID } from "node:crypto";
import type { GenerationJobPayload } from "@movprompt/contracts";
import {
  CapabilityRegistry,
  ProviderAdapterRegistry,
  type ProviderAdapter,
} from "@movprompt/providers";
import { describe, expect, it, vi } from "vitest";

import type { WorkerJobContext } from "./handlers.js";
import type { WorkerLogger } from "./logger.js";
import {
  createGenerationLifecycleHandler,
  type GenerationLifecycleHandlerOptions,
  type RenderLifecycleSnapshot,
  type RenderLifecycleStore,
} from "./render-lifecycle.js";

function payload(): GenerationJobPayload {
  return {
    renderRunId: randomUUID(),
    userId: randomUUID(),
    projectId: randomUUID(),
    projectVersionId: randomUUID(),
    quoteId: randomUUID(),
    capability: "video.seedance.latest",
    idempotencyKey: `render.start:${randomUUID()}`,
    requestId: randomUUID(),
  };
}

function snapshot(job: GenerationJobPayload, overrides: Partial<RenderLifecycleSnapshot> = {}): RenderLifecycleSnapshot {
  return {
    id: job.renderRunId,
    userId: job.userId,
    projectId: job.projectId,
    projectVersionId: job.projectVersionId,
    quoteId: job.quoteId,
    capabilityAlias: job.capability,
    idempotencyKey: `generation:${randomUUID()}`,
    status: "submitting",
    provider: null,
    providerRequestId: null,
    chargedAt: null,
    refundStatus: "not_required",
    configuration: { prompt: "Slow camera push toward a premium perfume bottle.", durationSeconds: 8 },
    ...overrides,
  };
}

function logger(): WorkerLogger {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function context(retryCount = 0, retryLimit = 5): WorkerJobContext {
  return {
    jobId: randomUUID(),
    jobName: "generation.render.v1",
    workerId: "worker-1",
    retryCount,
    retryLimit,
    signal: new AbortController().signal,
    logger: logger(),
  };
}

function store(current: RenderLifecycleSnapshot): RenderLifecycleStore {
  return {
    load: vi.fn(async () => current),
    updateProviderStatus: vi.fn(async () => undefined),
    complete: vi.fn(async () => undefined),
    markTerminal: vi.fn(async () => undefined),
  };
}

function billing() {
  return {
    recordProviderSubmission: vi.fn(async () => ({} as never)),
    finalizeProviderAccepted: vi.fn(async () => ({} as never)),
    releaseRenderReservation: vi.fn(async () => ({} as never)),
    refundRender: vi.fn(async () => ({} as never)),
  } satisfies GenerationLifecycleHandlerOptions["billing"];
}

function registries(adapter?: ProviderAdapter) {
  const capabilityRegistry = new CapabilityRegistry({
    "video.seedance.latest": {
      enabled: true,
      adapterId: "test-provider",
      providerModelId: "server-private-model-id",
    },
  });
  const adapterRegistry = new ProviderAdapterRegistry();
  if (adapter) adapterRegistry.register(adapter);
  return { capabilityRegistry, adapterRegistry };
}

function adapter(overrides: Partial<ProviderAdapter> = {}): ProviderAdapter {
  return {
    id: "test-provider",
    capability: "video.seedance.latest",
    submit: vi.fn(async () => ({
      providerRequestId: "provider-request-1",
      status: "queued" as const,
      acceptedAt: "2026-08-12T12:00:00.000Z",
    })),
    getStatus: vi.fn(async (providerRequestId) => ({ providerRequestId, status: "processing" as const })),
    cancel: vi.fn(async (providerRequestId) => ({ providerRequestId, status: "cancelled" as const })),
    ...overrides,
  };
}

describe("generation render lifecycle", () => {
  it("fails closed and releases the hold when no approved adapter is configured", async () => {
    const job = payload();
    const current = snapshot(job);
    const renderStore = store(current);
    const renderBilling = billing();
    const handler = createGenerationLifecycleHandler({
      store: renderStore,
      billing: renderBilling,
      ...registries(),
      scheduleReconciliation: vi.fn(async () => undefined),
    });

    await expect(handler.handle(job, context())).resolves.toEqual({
      renderRunId: job.renderRunId,
      outcome: "reconciled",
    });
    expect(renderBilling.releaseRenderReservation).toHaveBeenCalledWith(
      expect.objectContaining({ runId: job.renderRunId, reason: "provider_operation_failed", terminalStatus: "failed" }),
    );
    expect(renderBilling.finalizeProviderAccepted).not.toHaveBeenCalled();
  });

  it("charges only after provider acceptance and schedules reconciliation", async () => {
    const job = payload();
    const current = snapshot(job);
    const renderBilling = billing();
    const provider = adapter();
    const scheduleReconciliation = vi.fn(async () => undefined);
    const handler = createGenerationLifecycleHandler({
      store: store(current),
      billing: renderBilling,
      ...registries(provider),
      scheduleReconciliation,
      now: () => new Date("2026-08-12T12:00:01.000Z"),
    });

    await expect(handler.handle(job, context())).resolves.toEqual({
      renderRunId: job.renderRunId,
      outcome: "accepted",
    });
    expect(provider.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        operationId: job.renderRunId,
        idempotencyKey: `provider.submit:${job.renderRunId}`,
        prompt: "Slow camera push toward a premium perfume bottle.",
      }),
    );
    expect(renderBilling.finalizeProviderAccepted).toHaveBeenCalledWith({
      userId: job.userId,
      runId: job.renderRunId,
      provider: "test-provider",
      providerRequestId: "provider-request-1",
      now: new Date("2026-08-12T12:00:01.000Z"),
    });
    expect(scheduleReconciliation).toHaveBeenCalledWith(job, 15);
  });

  it("never releases after acceptance when reconciliation scheduling fails", async () => {
    const job = payload();
    const current = snapshot(job);
    const renderBilling = billing();
    const provider = adapter();
    const handler = createGenerationLifecycleHandler({
      store: store(current),
      billing: renderBilling,
      ...registries(provider),
      scheduleReconciliation: vi.fn(async () => Promise.reject(new Error("queue unavailable"))),
    });

    await expect(handler.handle(job, context())).rejects.toMatchObject({
      code: "reconciliation_schedule_failed",
      retryable: true,
    });
    expect(renderBilling.recordProviderSubmission).toHaveBeenCalledTimes(1);
    expect(renderBilling.finalizeProviderAccepted).toHaveBeenCalledTimes(1);
    expect(renderBilling.releaseRenderReservation).not.toHaveBeenCalled();
  });

  it("does not resubmit after provider identity was persisted but charge finalization failed", async () => {
    const job = payload();
    let current = snapshot(job);
    const renderStore = store(current);
    vi.mocked(renderStore.load).mockImplementation(async () => current);
    const renderBilling = billing();
    vi.mocked(renderBilling.recordProviderSubmission).mockImplementation(async (input) => {
      current = {
        ...current,
        provider: input.provider,
        providerRequestId: input.providerRequestId,
      };
      return {} as never;
    });
    vi.mocked(renderBilling.finalizeProviderAccepted).mockRejectedValueOnce(new Error("database timeout"));
    const provider = adapter();
    const handler = createGenerationLifecycleHandler({
      store: renderStore,
      billing: renderBilling,
      ...registries(provider),
      scheduleReconciliation: vi.fn(async () => undefined),
    });

    await expect(handler.handle(job, context())).rejects.toMatchObject({
      code: "provider_acceptance_not_finalized",
      retryable: true,
    });
    expect(renderBilling.releaseRenderReservation).not.toHaveBeenCalled();

    // The next queue retry sees the persisted provider request and reconciles
    // it instead of calling submit again.
    await handler.handle(job, context());
    expect(provider.submit).toHaveBeenCalledTimes(1);
    expect(provider.getStatus).toHaveBeenCalledWith("provider-request-1");
    expect(renderBilling.finalizeProviderAccepted).toHaveBeenCalledTimes(2);
  });

  it("leaves a transient pre-acceptance failure for pg-boss retry, then releases on final retry", async () => {
    const job = payload();
    const failure = new Error("provider temporarily unavailable");
    const provider = adapter({ submit: vi.fn(async () => Promise.reject(failure)) });
    const current = snapshot(job);
    const renderBilling = billing();
    const handler = createGenerationLifecycleHandler({
      store: store(current),
      billing: renderBilling,
      ...registries(provider),
      scheduleReconciliation: vi.fn(async () => undefined),
    });

    await expect(handler.handle(job, context(0, 5))).rejects.toThrow("provider temporarily unavailable");
    expect(renderBilling.releaseRenderReservation).not.toHaveBeenCalled();

    await expect(handler.handle(job, context(5, 5))).resolves.toEqual({
      renderRunId: job.renderRunId,
      outcome: "reconciled",
    });
    expect(renderBilling.releaseRenderReservation).toHaveBeenCalledTimes(1);
  });

  it("marks terminal provider failure and refunds the charged render exactly through billing", async () => {
    const job = payload();
    const current = snapshot(job, {
      status: "processing",
      provider: "test-provider",
      providerRequestId: "provider-request-1",
      chargedAt: new Date("2026-08-12T12:00:00.000Z"),
    });
    const provider = adapter({
      getStatus: vi.fn(async () => ({
        providerRequestId: "provider-request-1",
        status: "failed" as const,
        errorCode: "provider_invalid_result",
      })),
    });
    const renderStore = store(current);
    const renderBilling = billing();
    const handler = createGenerationLifecycleHandler({
      store: renderStore,
      billing: renderBilling,
      ...registries(provider),
      scheduleReconciliation: vi.fn(async () => undefined),
    });

    await handler.handle(job, context());
    expect(renderStore.markTerminal).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed", errorCode: "provider_invalid_result" }),
    );
    expect(renderBilling.refundRender).toHaveBeenCalledWith(
      expect.objectContaining({ runId: job.renderRunId, reason: "provider_invalid_result" }),
    );
  });

  it("persists provider output before completing the render", async () => {
    const job = payload();
    const current = snapshot(job, {
      status: "processing",
      provider: "test-provider",
      providerRequestId: "provider-request-1",
      chargedAt: new Date("2026-08-12T12:00:00.000Z"),
    });
    const provider = adapter({
      getStatus: vi.fn(async () => ({
        providerRequestId: "provider-request-1",
        status: "completed" as const,
        outputUrl: "https://provider.example/output.mp4",
      })),
    });
    const renderStore = store(current);
    const persist = vi.fn(async () => ({
      bucket: "creator-outputs",
      objectKey: `${job.userId}/${job.projectId}/${job.renderRunId}.mp4`,
    }));
    const handler = createGenerationLifecycleHandler({
      store: renderStore,
      billing: billing(),
      ...registries(provider),
      outputPersister: { persist },
      scheduleReconciliation: vi.fn(async () => undefined),
    });

    await handler.handle(job, context());
    expect(persist).toHaveBeenCalledWith(expect.objectContaining({ sourceUrl: "https://provider.example/output.mp4" }));
    expect(renderStore.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: job.renderRunId,
        outputBucket: "creator-outputs",
      }),
    );
  });
});
