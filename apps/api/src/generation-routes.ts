import {
  CancelRenderRunRequestSchema,
  CreateGenerationQuoteRequestSchema,
  IdempotencyKeySchema,
  RenderRunParametersSchema,
  StartRenderRunRequestSchema,
  type GenerationQuoteResponse,
  type RenderRunResponse,
} from "@movprompt/contracts";
import type { Hono } from "hono";

import type { AuthGateway, AuthenticatedSession } from "./auth-gateway.js";
import { ApiHttpError } from "./errors.js";
import {
  GenerationApplicationError,
  generationDependencyUnavailable,
  type GenerationApiService,
} from "./generation-service.js";
import type { ApiEnvironment } from "./request-context.js";

export type GenerationRouteServices = {
  enabled: boolean;
  auth?: AuthGateway;
  generation?: GenerationApiService;
};

function requireServices(
  services: GenerationRouteServices,
): { auth: AuthGateway; generation: GenerationApiService } {
  if (!services.enabled || !services.auth || !services.generation || !services.generation.isAvailable()) {
    throw new ApiHttpError({
      code: "generation_service_unavailable",
      message: "Video and image generation are not available in this environment.",
      status: 503,
      retryable: true,
    });
  }
  return { auth: services.auth, generation: services.generation };
}

async function sessionOrNull(auth: AuthGateway, headers: Headers): Promise<AuthenticatedSession | null> {
  return auth.getSession(headers);
}

async function requireSession(auth: AuthGateway, headers: Headers): Promise<AuthenticatedSession> {
  const session = await sessionOrNull(auth, headers);
  if (!session) {
    throw new ApiHttpError({
      code: "authentication_required",
      message: "Sign in to generate or manage a render.",
      status: 401,
      retryable: false,
    });
  }
  return session;
}

async function parseJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiHttpError({
      code: "invalid_json",
      message: "The request body must contain valid JSON.",
      status: 400,
      retryable: false,
    });
  }
}

function applicationError(error: unknown): never {
  if (generationDependencyUnavailable(error)) {
    throw new ApiHttpError({
      code: "generation_service_unavailable",
      message: "Authoritative generation pricing is not configured.",
      status: 503,
      retryable: true,
    });
  }
  if (!(error instanceof GenerationApplicationError)) throw error;

  switch (error.code) {
    case "authentication_required":
      throw new ApiHttpError({ code: error.code, message: "Sign in to save this quote.", status: 401 });
    case "generation_service_unavailable":
    case "capability_unavailable":
      throw new ApiHttpError({ code: error.code, message: error.message, status: 503, retryable: true });
    case "unapproved_capability":
    case "invalid_generation_configuration":
      throw new ApiHttpError({ code: error.code, message: error.message, status: 400 });
    case "project_version_not_found":
      throw new ApiHttpError({
        code: error.code,
        message: "The requested project version was not found.",
        status: 404,
      });
    case "template_version_not_found":
      throw new ApiHttpError({
        code: error.code,
        message: "The published template version was not found.",
        status: 404,
      });
    case "quote_not_found":
      throw new ApiHttpError({ code: error.code, message: "The generation quote was not found.", status: 404 });
    case "render_not_found":
      throw new ApiHttpError({ code: error.code, message: "The render was not found.", status: 404 });
    case "insufficient_credits":
      throw new ApiHttpError({
        code: error.code,
        message: "There are not enough available credits for this render.",
        status: 402,
      });
    case "quote_expired":
    case "quote_configuration_mismatch":
    case "quote_price_changed":
    case "starter_entitlement_unavailable":
    case "idempotency_conflict":
    case "render_not_cancellable":
      throw new ApiHttpError({ code: error.code, message: error.message, status: 409 });
    case "provider_acceptance_in_progress":
      throw new ApiHttpError({ code: error.code, message: error.message, status: 409, retryable: true });
  }
}

export function registerGenerationRoutes(
  app: Hono<ApiEnvironment>,
  services: GenerationRouteServices,
): void {
  app.post("/api/v1/generation-quotes", async (context) => {
    const { auth, generation } = requireServices(services);
    const request = CreateGenerationQuoteRequestSchema.parse(await parseJson(context.req.raw));
    const session = await sessionOrNull(auth, context.req.raw.headers);
    try {
      const quote = await generation.createQuote(request, session);
      const response: GenerationQuoteResponse = { quote, requestId: context.get("requestId") };
      context.header("cache-control", "private, no-store");
      return context.json(response, 200);
    } catch (error) {
      applicationError(error);
    }
  });

  app.post("/api/v1/render-runs", async (context) => {
    const { auth, generation } = requireServices(services);
    const session = await requireSession(auth, context.req.raw.headers);
    const request = StartRenderRunRequestSchema.parse(await parseJson(context.req.raw));
    const idempotencyKey = IdempotencyKeySchema.parse(context.req.header("idempotency-key") ?? "");
    try {
      const run = await generation.startRender({
        userId: session.user.id,
        projectId: request.projectId,
        projectVersionId: request.projectVersionId,
        quoteId: request.quoteId,
        idempotencyKey,
      });
      const response: RenderRunResponse = { run, requestId: context.get("requestId") };
      context.header("cache-control", "private, no-store");
      return context.json(response, 202);
    } catch (error) {
      applicationError(error);
    }
  });

  app.get("/api/v1/render-runs/:id", async (context) => {
    const { auth, generation } = requireServices(services);
    const session = await requireSession(auth, context.req.raw.headers);
    const { id } = RenderRunParametersSchema.parse({ id: context.req.param("id") });
    try {
      const run = await generation.getRender(session.user.id, id);
      const response: RenderRunResponse = { run, requestId: context.get("requestId") };
      context.header("cache-control", "private, no-store");
      return context.json(response, 200);
    } catch (error) {
      applicationError(error);
    }
  });

  app.post("/api/v1/render-runs/:id/cancel", async (context) => {
    const { auth, generation } = requireServices(services);
    const session = await requireSession(auth, context.req.raw.headers);
    const { id } = RenderRunParametersSchema.parse({ id: context.req.param("id") });
    CancelRenderRunRequestSchema.parse(await parseJson(context.req.raw));
    const idempotencyKey = IdempotencyKeySchema.parse(context.req.header("idempotency-key") ?? "");
    try {
      const run = await generation.cancelRender(session.user.id, id, idempotencyKey);
      const response: RenderRunResponse = { run, requestId: context.get("requestId") };
      context.header("cache-control", "private, no-store");
      return context.json(response, 202);
    } catch (error) {
      applicationError(error);
    }
  });
}
