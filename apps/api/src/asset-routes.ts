import { createHash } from "node:crypto";
import {
  AssetDownloadQuerySchema,
  AssetRouteParametersSchema,
  CreateAssetUploadRequestSchema,
  IdempotencyKeySchema,
  type AssetReadyResponse,
  type CreatorAsset,
  type SignedAssetDownloadResponse,
  type SignedAssetUploadResponse,
} from "@movprompt/contracts";
import { assertOwnedProjectKey, objectKeys } from "@movprompt/storage";
import type { Hono } from "hono";
import type { AuthGateway } from "./auth-gateway.js";
import type { AssetRepository, OwnedAssetRecord } from "./asset-repository.js";
import type { AssetStorageGateway } from "./asset-storage.js";
import { ApiHttpError } from "./errors.js";
import type { ApiEnvironment } from "./request-context.js";

export type AssetRouteServices = {
  enabled: boolean;
  auth?: AuthGateway;
  repository?: AssetRepository;
  storage?: AssetStorageGateway;
};

function requireServices(services: AssetRouteServices): Required<Omit<AssetRouteServices, "enabled">> {
  if (!services.enabled || !services.auth || !services.repository || !services.storage) {
    throw new ApiHttpError({
      code: "asset_service_unavailable",
      message: "Private asset uploads are not available in this environment.",
      status: 503,
      retryable: true,
    });
  }
  return {
    auth: services.auth,
    repository: services.repository,
    storage: services.storage,
  };
}

async function requireUserId(auth: AuthGateway, headers: Headers): Promise<string> {
  const session = await auth.getSession(headers);
  if (!session) {
    throw new ApiHttpError({
      code: "authentication_required",
      message: "Sign in to manage project assets.",
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

function deterministicAssetId(userId: string, projectId: string, idempotencyKey: string): string {
  const bytes = createHash("sha256")
    .update("movprompt-asset-v1\0")
    .update(userId)
    .update("\0")
    .update(projectId)
    .update("\0")
    .update(idempotencyKey)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function publicAsset(record: OwnedAssetRecord): CreatorAsset {
  return {
    id: record.id,
    projectId: record.projectId,
    kind: record.kind,
    objectKey: record.objectKey,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    checksumSha256: record.checksumSha256,
  };
}

function assertSameAssetIntent(existing: OwnedAssetRecord, requested: OwnedAssetRecord): void {
  if (
    existing.kind !== requested.kind ||
    existing.bucket !== requested.bucket ||
    existing.objectKey !== requested.objectKey ||
    existing.mimeType !== requested.mimeType ||
    existing.sizeBytes !== requested.sizeBytes ||
    existing.checksumSha256 !== requested.checksumSha256
  ) {
    throw new ApiHttpError({
      code: "idempotency_conflict",
      message: "This idempotency key was already used for a different asset upload.",
      status: 409,
      retryable: false,
    });
  }
}

function storageStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const metadata = (error as { $metadata?: { httpStatusCode?: number } }).$metadata;
  return metadata?.httpStatusCode;
}

async function verifyStoredObject(
  storage: AssetStorageGateway,
  asset: OwnedAssetRecord,
): Promise<void> {
  assertOwnedProjectKey(asset.objectKey, asset.userId, asset.projectId);

  let head;
  try {
    head = await storage.head(asset.bucket, asset.objectKey);
  } catch (error) {
    if (storageStatus(error) === 404 || (error instanceof Error && error.name === "NotFound")) {
      throw new ApiHttpError({
        code: "asset_not_ready",
        message: "The asset upload has not completed yet.",
        status: 409,
        retryable: true,
      });
    }
    throw new ApiHttpError({
      code: "storage_unavailable",
      message: "Private storage could not verify the asset.",
      status: 503,
      retryable: true,
    });
  }

  const checksum = head.checksumSha256?.trim().toLowerCase();
  const contentType = head.contentType?.trim().toLowerCase();
  if (
    head.contentLength !== asset.sizeBytes ||
    checksum !== asset.checksumSha256 ||
    contentType !== asset.mimeType.toLowerCase()
  ) {
    throw new ApiHttpError({
      code: "asset_integrity_mismatch",
      message: "The uploaded asset does not match the declared file metadata.",
      status: 409,
      retryable: false,
    });
  }
}

async function findOwnedAsset(
  repository: AssetRepository,
  userId: string,
  projectId: string,
  assetId: string,
): Promise<OwnedAssetRecord> {
  const asset = await repository.findOwned(userId, projectId, assetId);
  if (!asset) {
    // Do not reveal whether another account owns either resource.
    throw new ApiHttpError({
      code: "asset_not_found",
      message: "The requested project asset was not found.",
      status: 404,
      retryable: false,
    });
  }
  return asset;
}

export function registerAssetRoutes(
  app: Hono<ApiEnvironment>,
  services: AssetRouteServices,
): void {
  app.post("/api/v1/projects/:projectId/assets/upload-url", async (context) => {
    const { auth, repository, storage } = requireServices(services);
    const userId = await requireUserId(auth, context.req.raw.headers);
    const { projectId } = AssetRouteParametersSchema.parse({
      projectId: context.req.param("projectId"),
    });
    const input = CreateAssetUploadRequestSchema.parse(await parseJson(context.req.raw));
    const idempotencyKey = IdempotencyKeySchema.parse(
      context.req.header("idempotency-key") ?? "",
    );

    if (!(await repository.isProjectOwned(userId, projectId))) {
      throw new ApiHttpError({
        code: "project_not_found",
        message: "The requested project was not found.",
        status: 404,
        retryable: false,
      });
    }

    const assetId = deterministicAssetId(userId, projectId, idempotencyKey);
    const objectKey = objectKeys.creatorAsset({
      userId,
      projectId,
      assetId,
      kind: input.kind,
      checksumSha256: input.metadata.checksumSha256,
    });

    let signedUpload;
    try {
      signedUpload = await storage.signUpload({
        bucket: storage.assetsBucket,
        key: objectKey,
        metadata: {
          mimeType: input.metadata.mimeType,
          sizeBytes: input.metadata.sizeBytes,
          checksumSha256: input.metadata.checksumSha256,
          ...(input.metadata.originalFilename === undefined
            ? {}
            : { originalFilename: input.metadata.originalFilename }),
          ...(input.metadata.width === undefined ? {} : { width: input.metadata.width }),
          ...(input.metadata.height === undefined ? {} : { height: input.metadata.height }),
          ...(input.metadata.durationMs === undefined
            ? {}
            : { durationMs: input.metadata.durationMs }),
        },
      });
    } catch (error) {
      if (error instanceof ApiHttpError) throw error;
      throw new ApiHttpError({
        code: "storage_unavailable",
        message: "Private storage could not create an upload URL.",
        status: 503,
        retryable: true,
      });
    }

    const intendedRecord: OwnedAssetRecord = {
      id: assetId,
      projectId,
      userId,
      kind: input.kind,
      bucket: storage.assetsBucket,
      objectKey,
      mimeType: signedUpload.metadata.mimeType,
      sizeBytes: signedUpload.metadata.sizeBytes,
      checksumSha256: signedUpload.metadata.checksumSha256,
      ...(input.metadata.originalFilename
        ? { originalFilename: input.metadata.originalFilename }
        : {}),
    };
    const assetRecord = await repository.createOrFind({
      ...intendedRecord,
      ...(input.metadata.width === undefined ? {} : { width: input.metadata.width }),
      ...(input.metadata.height === undefined ? {} : { height: input.metadata.height }),
      ...(input.metadata.durationMs === undefined
        ? {}
        : { durationMs: input.metadata.durationMs }),
    });
    assertSameAssetIntent(assetRecord, intendedRecord);

    const response: SignedAssetUploadResponse = {
      asset: publicAsset(assetRecord),
      upload: {
        method: "PUT",
        url: signedUpload.url,
        headers: signedUpload.headers,
        expiresInSeconds: signedUpload.expiresInSeconds,
      },
      requestId: context.get("requestId"),
    };
    context.header("cache-control", "private, no-store");
    return context.json(response, 201);
  });

  app.post("/api/v1/projects/:projectId/assets/:assetId/complete", async (context) => {
    const { auth, repository, storage } = requireServices(services);
    const userId = await requireUserId(auth, context.req.raw.headers);
    const { projectId, assetId } = AssetRouteParametersSchema.parse({
      projectId: context.req.param("projectId"),
      assetId: context.req.param("assetId"),
    });
    const asset = await findOwnedAsset(repository, userId, projectId, assetId!);
    await verifyStoredObject(storage, asset);

    const response: AssetReadyResponse = {
      asset: publicAsset(asset),
      status: "ready",
      requestId: context.get("requestId"),
    };
    context.header("cache-control", "private, no-store");
    return context.json(response);
  });

  app.get("/api/v1/projects/:projectId/assets/:assetId/download-url", async (context) => {
    const { auth, repository, storage } = requireServices(services);
    const userId = await requireUserId(auth, context.req.raw.headers);
    const { projectId, assetId } = AssetRouteParametersSchema.parse({
      projectId: context.req.param("projectId"),
      assetId: context.req.param("assetId"),
    });
    const query = AssetDownloadQuerySchema.parse(context.req.query());
    const asset = await findOwnedAsset(repository, userId, projectId, assetId!);
    await verifyStoredObject(storage, asset);

    let signedDownload;
    try {
      signedDownload = await storage.signDownload({
        bucket: asset.bucket,
        key: asset.objectKey,
        ...(query.filename || asset.originalFilename
          ? { downloadFilename: query.filename || asset.originalFilename }
          : {}),
      });
    } catch {
      throw new ApiHttpError({
        code: "storage_unavailable",
        message: "Private storage could not create a download URL.",
        status: 503,
        retryable: true,
      });
    }

    const response: SignedAssetDownloadResponse = {
      asset: publicAsset(asset),
      download: {
        method: "GET",
        url: signedDownload.url,
        expiresInSeconds: signedDownload.expiresInSeconds,
      },
      requestId: context.get("requestId"),
    };
    context.header("cache-control", "private, no-store");
    return context.json(response);
  });
}
