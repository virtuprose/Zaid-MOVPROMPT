import { createHash } from "node:crypto";
import {
  AssetDownloadQuerySchema,
  AssetRouteParametersSchema,
  CompleteClaimAssetRequestSchema,
  CreateAssetUploadRequestSchema,
  IdempotencyKeySchema,
  MirrorRemoteImageRequestSchema,
  type AssetReadyResponse,
  type CreatorAsset,
  type MirroredAssetResponse,
  type SignedAssetDownloadResponse,
  type SignedAssetUploadResponse,
} from "@movprompt/contracts";
import { assertOwnedProjectKey, objectKeys } from "@movprompt/storage";
import type { Hono } from "hono";
import type { AuthGateway } from "./auth-gateway.js";
import type { AssetRepository, OwnedAssetRecord } from "./asset-repository.js";
import type { AssetStorageGateway } from "./asset-storage.js";
import { ApiHttpError } from "./errors.js";
import type { GuestClaimService } from "./guest-claim-service.js";
import type { RemoteImageFetcher } from "./remote-image-fetcher.js";
import type { RequestRateLimiter } from "./request-rate-limiter.js";
import type { ApiEnvironment } from "./request-context.js";

export type AssetRouteServices = {
  enabled: boolean;
  auth?: AuthGateway;
  repository?: AssetRepository;
  storage?: AssetStorageGateway;
  remoteImages?: RemoteImageFetcher;
  rateLimiter?: RequestRateLimiter;
  guestClaimService?: GuestClaimService;
};

type RequiredAssetServices = {
  auth: AuthGateway;
  repository: AssetRepository;
  storage: AssetStorageGateway;
};

function requireServices(services: AssetRouteServices): RequiredAssetServices {
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

function requireGuestClaimService(services: AssetRouteServices): GuestClaimService {
  if (!services.guestClaimService) {
    throw new ApiHttpError({
      code: "guest_claim_service_unavailable",
      message: "Campaign recovery is temporarily unavailable.",
      status: 503,
      retryable: true,
    });
  }
  return services.guestClaimService;
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
    ...(record.durationMs === undefined ? {} : { durationMs: record.durationMs }),
  };
}

function assertSameAssetIntent(existing: OwnedAssetRecord, requested: OwnedAssetRecord): void {
  if (
    existing.kind !== requested.kind ||
    existing.bucket !== requested.bucket ||
    existing.objectKey !== requested.objectKey ||
    existing.mimeType !== requested.mimeType ||
    existing.sizeBytes !== requested.sizeBytes ||
    existing.checksumSha256 !== requested.checksumSha256 ||
    (existing.sourceUrlHash ?? null) !== (requested.sourceUrlHash ?? null)
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

const MAX_BROWSER_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_BROWSER_FOOTAGE_BYTES = 50 * 1024 * 1024;

function hasExpectedImageSignature(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
  }
  if (mimeType === "image/webp") {
    return bytes.length >= 12 &&
      String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP";
  }
  return false;
}

function hasExpectedFootageSignature(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === "video/webm") {
    return bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  }
  // ISO base media files (MP4 and QuickTime MOV) expose their ftyp box at byte 4.
  return bytes.length >= 12 && String.fromCharCode(...bytes.subarray(4, 8)) === "ftyp";
}

async function readVerifiedAssetBody(request: Request, asset: OwnedAssetRecord): Promise<Uint8Array> {
  const footage = asset.kind === "footage";
  const byteLimit = footage ? MAX_BROWSER_FOOTAGE_BYTES : MAX_BROWSER_IMAGE_BYTES;
  if (asset.sizeBytes > byteLimit) {
    throw new ApiHttpError({
      code: "asset_too_large",
      message: footage ? "Footage must be 50 MB or smaller." : "Product images must be 12 MB or smaller.",
      status: 413,
      retryable: false,
    });
  }
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== asset.mimeType.toLowerCase()) {
    throw new ApiHttpError({
      code: "asset_integrity_mismatch",
      message: "The uploaded file type does not match the saved asset metadata.",
      status: 409,
      retryable: false,
    });
  }
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && Number(declaredLength) !== asset.sizeBytes) {
    throw new ApiHttpError({
      code: "asset_integrity_mismatch",
      message: "The uploaded file size does not match the saved asset metadata.",
      status: 409,
      retryable: false,
    });
  }
  if (!request.body) {
    throw new ApiHttpError({
      code: "invalid_asset_content",
      message: "The asset upload body is empty.",
      status: 400,
      retryable: false,
    });
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > asset.sizeBytes || total > byteLimit) {
        throw new ApiHttpError({
          code: "asset_too_large",
          message: "The uploaded file is larger than the declared file.",
          status: 413,
          retryable: false,
        });
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  if (total !== asset.sizeBytes) {
    throw new ApiHttpError({
      code: "asset_integrity_mismatch",
      message: "The uploaded file did not arrive completely.",
      status: 409,
      retryable: true,
    });
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  if (footage ? !hasExpectedFootageSignature(bytes, contentType) : !hasExpectedImageSignature(bytes, contentType)) {
    throw new ApiHttpError({
      code: "invalid_asset_content",
      message: footage
        ? "The uploaded file is not a valid MP4, MOV or WebM video."
        : "The uploaded file is not a valid JPG, PNG or WebP image.",
      status: 422,
      retryable: false,
    });
  }
  const checksum = createHash("sha256").update(bytes).digest("hex");
  if (checksum !== asset.checksumSha256) {
    throw new ApiHttpError({
      code: "asset_integrity_mismatch",
      message: "The uploaded file checksum does not match the selected file.",
      status: 409,
      retryable: false,
    });
  }
  return bytes;
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

    const assetId = input.assetId ?? deterministicAssetId(userId, projectId, idempotencyKey);
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
      ...(input.metadata.durationMs === undefined ? {} : { durationMs: input.metadata.durationMs }),
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

  app.put("/api/v1/projects/:projectId/assets/:assetId/content", async (context) => {
    const { auth, repository, storage } = requireServices(services);
    const userId = await requireUserId(auth, context.req.raw.headers);
    const { projectId, assetId } = AssetRouteParametersSchema.parse({
      projectId: context.req.param("projectId"),
      assetId: context.req.param("assetId"),
    });
    const asset = await findOwnedAsset(repository, userId, projectId, assetId!);
    const bytes = await readVerifiedAssetBody(context.req.raw, asset);

    try {
      await storage.put({
        bucket: asset.bucket,
        key: asset.objectKey,
        body: bytes,
        contentType: asset.mimeType,
        metadata: { "sha256-hex": asset.checksumSha256 },
      });
    } catch {
      throw new ApiHttpError({
        code: "storage_unavailable",
        message: "Private storage could not save the uploaded image. Try again.",
        status: 503,
        retryable: true,
      });
    }
    await verifyStoredObject(storage, asset);

    let signedDownload;
    try {
      signedDownload = await storage.signDownload({
        bucket: asset.bucket,
        key: asset.objectKey,
        ...(asset.originalFilename ? { downloadFilename: asset.originalFilename } : {}),
      });
    } catch {
      throw new ApiHttpError({
        code: "storage_unavailable",
        message: "The image was saved, but its preview is temporarily unavailable.",
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
    return context.json(response, 201);
  });

  app.post("/api/v1/projects/:projectId/assets/mirror", async (context) => {
    const { auth, repository, storage } = requireServices(services);
    const userId = await requireUserId(auth, context.req.raw.headers);
    const { projectId } = AssetRouteParametersSchema.parse({
      projectId: context.req.param("projectId"),
    });
    const input = MirrorRemoteImageRequestSchema.parse(await parseJson(context.req.raw));
    const idempotencyKey = IdempotencyKeySchema.parse(
      context.req.header("idempotency-key") ?? "",
    );

    // Resolve ownership before any outbound request so callers cannot use this
    // endpoint as either an SSRF primitive or a cross-account existence oracle.
    if (!(await repository.isProjectOwned(userId, projectId))) {
      throw new ApiHttpError({
        code: "project_not_found",
        message: "The requested project was not found.",
        status: 404,
        retryable: false,
      });
    }
    if (!services.remoteImages) {
      throw new ApiHttpError({
        code: "remote_image_service_unavailable",
        message: "Secure product image import is not available in this environment.",
        status: 503,
        retryable: true,
      });
    }
    if (!services.rateLimiter) {
      throw new ApiHttpError({
        code: "remote_image_service_unavailable",
        message: "Secure product image import is not available in this environment.",
        status: 503,
        retryable: true,
      });
    }
    const quota = await services.rateLimiter.consumeAuthenticatedMirror(userId);
    if (!quota.allowed) {
      context.header("retry-after", String(quota.retryAfterSeconds));
      throw new ApiHttpError({
        code: "remote_image_rate_limited",
        message: "Too many image imports. Please try again shortly.",
        status: 429,
        retryable: true,
      });
    }

    const normalizedSourceUrl = new URL(input.url);
    normalizedSourceUrl.hash = "";
    const sourceUrlHash = createHash("sha256")
      .update(normalizedSourceUrl.toString())
      .digest("hex");
    const fetched = await services.remoteImages.fetch(normalizedSourceUrl.toString());
    const assetId = deterministicAssetId(userId, projectId, idempotencyKey);
    const objectKey = objectKeys.creatorAsset({
      userId,
      projectId,
      assetId,
      kind: input.kind,
      checksumSha256: fetched.checksumSha256,
    });
    const intendedRecord: OwnedAssetRecord = {
      id: assetId,
      projectId,
      userId,
      kind: input.kind,
      bucket: storage.assetsBucket,
      objectKey,
      mimeType: fetched.mimeType,
      sizeBytes: fetched.bytes.byteLength,
      checksumSha256: fetched.checksumSha256,
      originalFilename: input.originalFilename ?? fetched.originalFilename,
      // Persist only a hash for idempotency. Remote URLs may contain signed
      // query parameters and must never become durable project data.
      sourceUrlHash,
    };
    const assetRecord = await repository.createOrFind(intendedRecord);
    assertSameAssetIntent(assetRecord, intendedRecord);

    try {
      await storage.put({
        bucket: assetRecord.bucket,
        key: assetRecord.objectKey,
        body: fetched.bytes,
        contentType: assetRecord.mimeType,
        metadata: { "sha256-hex": assetRecord.checksumSha256 },
      });
    } catch {
      throw new ApiHttpError({
        code: "storage_unavailable",
        message: "Private storage could not save the imported image.",
        status: 503,
        retryable: true,
      });
    }
    await verifyStoredObject(storage, assetRecord);

    let signedDownload;
    try {
      signedDownload = await storage.signDownload({
        bucket: assetRecord.bucket,
        key: assetRecord.objectKey,
        ...(assetRecord.originalFilename
          ? { downloadFilename: assetRecord.originalFilename }
          : {}),
      });
    } catch {
      throw new ApiHttpError({
        code: "storage_unavailable",
        message: "Private storage could not create a download URL for the imported image.",
        status: 503,
        retryable: true,
      });
    }

    const response: MirroredAssetResponse = {
      asset: publicAsset(assetRecord),
      download: {
        method: "GET",
        url: signedDownload.url,
        expiresInSeconds: signedDownload.expiresInSeconds,
      },
      requestId: context.get("requestId"),
    };
    context.header("cache-control", "private, no-store");
    return context.json(response, 201);
  });

  app.post("/api/v1/projects/:projectId/assets/:assetId/complete", async (context) => {
    const { auth, repository, storage } = requireServices(services);
    const guestClaimService = requireGuestClaimService(services);
    const userId = await requireUserId(auth, context.req.raw.headers);
    const { projectId, assetId } = AssetRouteParametersSchema.parse({
      projectId: context.req.param("projectId"),
      assetId: context.req.param("assetId"),
    });
    const asset = await findOwnedAsset(repository, userId, projectId, assetId!);
    const input = CompleteClaimAssetRequestSchema.parse(await parseJson(context.req.raw));
    if (input.localAssetId !== asset.id) {
      throw new ApiHttpError({
        code: "asset_not_found",
        message: "The requested project asset was not found.",
        status: 404,
        retryable: false,
      });
    }
    await verifyStoredObject(storage, asset);
    await guestClaimService.markAssetVerified({
      userId,
      pendingGenerationId: input.pendingGenerationId,
      localAssetId: input.localAssetId,
      bucket: asset.bucket,
      objectKey: asset.objectKey,
    });

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
