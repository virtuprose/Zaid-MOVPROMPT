import {
  AcceptProjectVersionRequestSchema,
  ClaimDraftRequestSchema,
  CreditSummaryResponseSchema,
  CreateProjectVersionRequestSchema,
  EmptyMutationRequestSchema,
  IdempotencyKeySchema,
  ProjectListQuerySchema,
  ProjectRouteParametersSchema,
  SourceScanRequestSchema,
  TemplateListQuerySchema,
  type CreditSummaryResponse,
  type OutputDownloadResponse,
  type ProjectListResponse,
  type ProjectResponse,
  type ProjectVersionListResponse,
  type ProjectVersionResponse,
  type TemplateListResponse,
  type TemplateResponse,
} from "@movprompt/contracts";
import type { Hono } from "hono";

import type { AssetStorageGateway } from "./asset-storage.js";
import type { AuthGateway } from "./auth-gateway.js";
import { CreatorRepositoryError, type CreatorRepository } from "./creator-repository.js";
import { ApiHttpError } from "./errors.js";
import type { ApiEnvironment } from "./request-context.js";
import type { SourceScanner } from "./source-scanner.js";

export type CreatorRouteServices = {
  enabled: boolean;
  auth?: AuthGateway;
  repository?: CreatorRepository;
  storage?: AssetStorageGateway;
  scanner?: SourceScanner;
};

function requireRepository(services: CreatorRouteServices): CreatorRepository {
  if (!services.enabled || !services.repository) {
    throw new ApiHttpError({
      code: "creator_service_unavailable",
      message: "Creator projects are not available in this environment.",
      status: 503,
      retryable: true,
    });
  }
  return services.repository;
}

function requireAuth(services: CreatorRouteServices): AuthGateway {
  if (!services.auth) {
    throw new ApiHttpError({
      code: "authentication_service_unavailable",
      message: "Authentication is not available in this environment.",
      status: 503,
      retryable: true,
    });
  }
  return services.auth;
}

async function requireUserId(services: CreatorRouteServices, headers: Headers): Promise<string> {
  const session = await requireAuth(services).getSession(headers);
  if (!session) {
    throw new ApiHttpError({
      code: "authentication_required",
      message: "Sign in to manage your campaigns.",
      status: 401,
      retryable: false,
    });
  }
  return session.user.id;
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

function mapRepositoryError(error: unknown): never {
  if (!(error instanceof CreatorRepositoryError)) throw error;
  if (error.code === "idempotency_conflict") {
    throw new ApiHttpError({
      code: error.code,
      message: "This operation key was already used for a different campaign.",
      status: 409,
      retryable: false,
    });
  }
  throw new ApiHttpError({
    code: error.code,
    message:
      error.code === "template_not_found"
        ? "The published template version was not found."
        : error.code === "parent_version_not_found"
          ? "The parent version was not found in this project."
          : "The requested project was not found.",
    status: 404,
    retryable: false,
  });
}

function noStore(context: { header(name: string, value: string): void }) {
  context.header("cache-control", "private, no-store");
}

export function registerCreatorRoutes(
  app: Hono<ApiEnvironment>,
  services: CreatorRouteServices,
): void {
  app.get("/api/v1/templates", async (context) => {
    const repository = requireRepository(services);
    const query = TemplateListQuerySchema.parse(context.req.query());
    const body: TemplateListResponse = {
      templates: await repository.listPublishedTemplates({
        ...(query.vertical ? { vertical: query.vertical } : {}),
        ...(query.goal ? { goal: query.goal } : {}),
        ...(query.language ? { language: query.language } : {}),
      }),
      requestId: context.get("requestId"),
    };
    context.header("cache-control", "public, max-age=60, stale-while-revalidate=300");
    return context.json(body);
  });

  app.get("/api/v1/templates/:slug", async (context) => {
    const repository = requireRepository(services);
    const template = await repository.findPublishedTemplate(context.req.param("slug"));
    if (!template) {
      throw new ApiHttpError({
        code: "template_not_found",
        message: "The published template was not found.",
        status: 404,
        retryable: false,
      });
    }
    const body: TemplateResponse = { template, requestId: context.get("requestId") };
    context.header("cache-control", "public, max-age=60, stale-while-revalidate=300");
    return context.json(body);
  });

  app.post("/api/v1/drafts/claim", async (context) => {
    const repository = requireRepository(services);
    const userId = await requireUserId(services, context.req.raw.headers);
    const idempotencyKey = IdempotencyKeySchema.parse(context.req.header("idempotency-key") ?? "");
    const input = ClaimDraftRequestSchema.parse(await parseJson(context.req.raw));
    if (idempotencyKey !== input.draftId) {
      throw new ApiHttpError({
        code: "idempotency_conflict",
        message: "The draft ID must be used as the stable claim operation key.",
        status: 409,
        retryable: false,
      });
    }
    try {
      const body: ProjectResponse = {
        project: await repository.claimDraft(userId, input),
        requestId: context.get("requestId"),
      };
      noStore(context);
      return context.json(body, 201);
    } catch (error) {
      mapRepositoryError(error);
    }
  });

  app.get("/api/v1/projects", async (context) => {
    const repository = requireRepository(services);
    const userId = await requireUserId(services, context.req.raw.headers);
    const query = ProjectListQuerySchema.parse(context.req.query());
    const body: ProjectListResponse = {
      projects: await repository.listProjects(userId, {
        ...(query.status ? { status: query.status } : {}),
        includeTrashed: query.includeTrashed === "true",
        ...(query.search ? { search: query.search } : {}),
      }),
      requestId: context.get("requestId"),
    };
    noStore(context);
    return context.json(body);
  });

  app.get("/api/v1/projects/:projectId", async (context) => {
    const repository = requireRepository(services);
    const userId = await requireUserId(services, context.req.raw.headers);
    const { projectId } = ProjectRouteParametersSchema.parse({
      projectId: context.req.param("projectId"),
    });
    const project = await repository.findOwnedProject(userId, projectId);
    if (!project) mapRepositoryError(new CreatorRepositoryError("project_not_found"));
    const body: ProjectResponse = { project: project!, requestId: context.get("requestId") };
    noStore(context);
    return context.json(body);
  });

  app.post("/api/v1/projects/:projectId/duplicate", async (context) => {
    const repository = requireRepository(services);
    const userId = await requireUserId(services, context.req.raw.headers);
    const { projectId } = ProjectRouteParametersSchema.parse({
      projectId: context.req.param("projectId"),
    });
    EmptyMutationRequestSchema.parse(await parseJson(context.req.raw));
    const idempotencyKey = IdempotencyKeySchema.parse(context.req.header("idempotency-key") ?? "");
    try {
      const body: ProjectResponse = {
        project: await repository.duplicateProject(userId, projectId, idempotencyKey),
        requestId: context.get("requestId"),
      };
      noStore(context);
      return context.json(body, 201);
    } catch (error) {
      mapRepositoryError(error);
    }
  });

  for (const action of ["trash", "restore"] as const) {
    app.post(`/api/v1/projects/:projectId/${action}`, async (context) => {
      const repository = requireRepository(services);
      const userId = await requireUserId(services, context.req.raw.headers);
      const { projectId } = ProjectRouteParametersSchema.parse({
        projectId: context.req.param("projectId"),
      });
      EmptyMutationRequestSchema.parse(await parseJson(context.req.raw));
      IdempotencyKeySchema.parse(context.req.header("idempotency-key") ?? "");
      try {
        const project =
          action === "trash"
            ? await repository.trashProject(userId, projectId)
            : await repository.restoreProject(userId, projectId);
        const body: ProjectResponse = { project, requestId: context.get("requestId") };
        noStore(context);
        return context.json(body);
      } catch (error) {
        mapRepositoryError(error);
      }
    });
  }

  app.get("/api/v1/projects/:projectId/versions", async (context) => {
    const repository = requireRepository(services);
    const userId = await requireUserId(services, context.req.raw.headers);
    const { projectId } = ProjectRouteParametersSchema.parse({
      projectId: context.req.param("projectId"),
    });
    try {
      const body: ProjectVersionListResponse = {
        versions: await repository.listVersions(userId, projectId),
        requestId: context.get("requestId"),
      };
      noStore(context);
      return context.json(body);
    } catch (error) {
      mapRepositoryError(error);
    }
  });

  app.post("/api/v1/projects/:projectId/versions", async (context) => {
    const repository = requireRepository(services);
    const userId = await requireUserId(services, context.req.raw.headers);
    const { projectId } = ProjectRouteParametersSchema.parse({
      projectId: context.req.param("projectId"),
    });
    const idempotencyKey = IdempotencyKeySchema.parse(context.req.header("idempotency-key") ?? "");
    const input = CreateProjectVersionRequestSchema.parse(await parseJson(context.req.raw));
    try {
      const body: ProjectVersionResponse = {
        version: await repository.createVersion(userId, projectId, input, idempotencyKey),
        requestId: context.get("requestId"),
      };
      noStore(context);
      return context.json(body, 201);
    } catch (error) {
      mapRepositoryError(error);
    }
  });

  app.post("/api/v1/projects/:projectId/accepted-version", async (context) => {
    const repository = requireRepository(services);
    const userId = await requireUserId(services, context.req.raw.headers);
    const { projectId } = ProjectRouteParametersSchema.parse({
      projectId: context.req.param("projectId"),
    });
    IdempotencyKeySchema.parse(context.req.header("idempotency-key") ?? "");
    const { versionId } = AcceptProjectVersionRequestSchema.parse(await parseJson(context.req.raw));
    try {
      const body: ProjectResponse = {
        project: await repository.acceptVersion(userId, projectId, versionId),
        requestId: context.get("requestId"),
      };
      noStore(context);
      return context.json(body);
    } catch (error) {
      mapRepositoryError(error);
    }
  });

  app.get("/api/v1/credits", async (context) => {
    const repository = requireRepository(services);
    const userId = await requireUserId(services, context.req.raw.headers);
    const body: CreditSummaryResponse = CreditSummaryResponseSchema.parse({
      ...(await repository.creditSummary(userId)),
      requestId: context.get("requestId"),
    });
    noStore(context);
    return context.json(body);
  });

  for (const [route, kind] of [
    ["product-scans", "product"],
    ["business-scans", "business"],
  ] as const) {
    app.post(`/api/v1/${route}`, async (context) => {
      if (!services.scanner) {
        throw new ApiHttpError({
          code: "source_scan_unavailable",
          message: "Link import is not available in this environment.",
          status: 503,
          retryable: true,
        });
      }
      const { url } = SourceScanRequestSchema.parse(await parseJson(context.req.raw));
      const body = await services.scanner.scan({ url, kind, requestId: context.get("requestId") });
      context.header("cache-control", "public, max-age=300");
      return context.json(body);
    });
  }

  app.get("/api/v1/projects/:projectId/render-runs/:runId/output", async (context) => {
    const repository = requireRepository(services);
    const userId = await requireUserId(services, context.req.raw.headers);
    const { projectId, runId } = ProjectRouteParametersSchema.parse({
      projectId: context.req.param("projectId"),
      runId: context.req.param("runId"),
    });
    if (!services.storage) {
      throw new ApiHttpError({
        code: "storage_unavailable",
        message: "Output download is not available in this environment.",
        status: 503,
        retryable: true,
      });
    }
    const output = await repository.findOwnedOutput(userId, projectId, runId!);
    if (!output) {
      throw new ApiHttpError({
        code: "output_not_found",
        message: "The completed output was not found.",
        status: 404,
        retryable: false,
      });
    }
    if (output.bucket !== services.storage.outputsBucket) {
      throw new ApiHttpError({
        code: "output_not_ready",
        message: "The output has not been copied into MovPrompt storage.",
        status: 409,
        retryable: true,
      });
    }
    const download = await services.storage.signDownload({
      bucket: output.bucket,
      key: output.objectKey,
      downloadFilename: `${projectId}.mp4`,
    });
    const body: OutputDownloadResponse = {
      runId: runId!,
      projectId,
      download: {
        method: "GET",
        url: download.url,
        expiresInSeconds: download.expiresInSeconds,
      },
      requestId: context.get("requestId"),
    };
    noStore(context);
    return context.json(body);
  });
}
