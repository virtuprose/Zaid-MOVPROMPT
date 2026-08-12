import type {
  GenerationQuoteResponse,
  PublicRenderRun,
  RenderRunResponse,
} from "@movprompt/contracts";
import { describe, expect, it, vi } from "vitest";

import type { AuthGateway, AuthenticatedSession } from "./auth-gateway.js";
import { createApi } from "./app.js";
import { loadApiConfig } from "./config.js";
import type { GenerationApiService } from "./generation-service.js";

const userId = "00000000-0000-4000-8000-000000000001";
const projectId = "00000000-0000-4000-8000-000000000002";
const projectVersionId = "00000000-0000-4000-8000-000000000003";
const quoteId = "00000000-0000-4000-8000-000000000004";
const runId = "00000000-0000-4000-8000-000000000005";

const session: AuthenticatedSession = {
  user: {
    id: userId,
    email: "creator@example.com",
    emailVerified: true,
    name: "Creator",
  },
  session: { id: "session-1" },
};

function authGateway(currentSession: AuthenticatedSession | null): AuthGateway {
  return {
    handle: vi.fn(async () => new Response(null, { status: 204 })),
    getSession: vi.fn(async () => currentSession),
  };
}

function publicRun(status: PublicRenderRun["status"] = "submitting"): PublicRenderRun {
  return {
    id: runId,
    projectId,
    projectVersionId,
    capability: "video.seedance.latest",
    quoteId,
    quotedCredits: 80,
    chargedCredits: 0,
    starterEntitlementUsed: true,
    status,
    outputAvailable: false,
    error: null,
    createdAt: "2026-08-12T08:00:00.000Z",
    updatedAt: "2026-08-12T08:00:00.000Z",
    completedAt: null,
  };
}

function generationService(): GenerationApiService {
  return {
    isAvailable: () => true,
    createQuote: vi.fn(async () => ({
      quoteId: null,
      capability: "video.seedance.latest",
      credits: 80,
      entitlementEligible: false,
      configurationHash: "a".repeat(64),
      pricingVersion: "test-v1",
      expiresAt: "2026-08-12T08:15:00.000Z",
      breakdown: [{ label: "8 seconds of generated video", credits: 80 }],
      estimateOnly: true,
    })),
    startRender: vi.fn(async () => publicRun()),
    getRender: vi.fn(async () => publicRun("processing")),
    cancelRender: vi.fn(async () => publicRun("cancelled")),
  };
}

function app(currentSession: AuthenticatedSession | null, generation = generationService()) {
  return {
    app: createApi({
      config: loadApiConfig({
        APP_ENV: "test",
        API_PORT: "3001",
        FEATURE_AUTHENTICATION: "true",
        FEATURE_GENERATION: "true",
      }),
      authGateway: authGateway(currentSession),
      generationService: generation,
    }),
    generation,
  };
}

describe("generation API routes", () => {
  it("returns a guest estimate without persisting a render", async () => {
    const { app: api, generation } = app(null);
    const response = await api.request("/api/v1/generation-quotes", {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": "quote-request-1" },
      body: JSON.stringify({
        capability: "video.seedance.latest",
        configuration: { prompt: "A precise product reveal", durationSeconds: 8 },
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as GenerationQuoteResponse;
    expect(body.quote).toMatchObject({ quoteId: null, estimateOnly: true, credits: 80 });
    expect(generation.createQuote).toHaveBeenCalledWith(expect.any(Object), null);
  });

  it("requires authentication and a valid idempotency key before starting", async () => {
    const unauthenticated = app(null).app;
    const unauthenticatedResponse = await unauthenticated.request("/api/v1/render-runs", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "render-key-1" },
      body: JSON.stringify({ projectId, projectVersionId, quoteId, rightsAttested: true }),
    });
    expect(unauthenticatedResponse.status).toBe(401);

    const authenticated = app(session).app;
    const missingKeyResponse = await authenticated.request("/api/v1/render-runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId, projectVersionId, quoteId, rightsAttested: true }),
    });
    expect(missingKeyResponse.status).toBe(400);
  });

  it("starts, reads and cancels an owner-scoped durable run", async () => {
    const { app: api, generation } = app(session);
    const started = await api.request("/api/v1/render-runs", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "render-key-2" },
      body: JSON.stringify({ projectId, projectVersionId, quoteId, rightsAttested: true }),
    });
    expect(started.status).toBe(202);
    expect(((await started.json()) as RenderRunResponse).run.status).toBe("submitting");
    expect(generation.startRender).toHaveBeenCalledWith(expect.objectContaining({ userId, quoteId }));

    const status = await api.request(`/api/v1/render-runs/${runId}`);
    expect(status.status).toBe(200);
    expect(((await status.json()) as RenderRunResponse).run.status).toBe("processing");

    const cancelled = await api.request(`/api/v1/render-runs/${runId}/cancel`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "cancel-key-1" },
      body: "{}",
    });
    expect(cancelled.status).toBe(202);
    expect(((await cancelled.json()) as RenderRunResponse).run.status).toBe("cancelled");
  });

  it("fails closed when the runtime has no approved capability or pricing", async () => {
    const unavailable = generationService();
    unavailable.isAvailable = () => false;
    const response = await app(session, unavailable).app.request("/api/v1/generation-quotes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        capability: "video.seedance.latest",
        configuration: { prompt: "Product reveal", durationSeconds: 8 },
      }),
    });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "generation_service_unavailable", retryable: true },
    });
  });
});
