import {
  AssetReadyResponseSchema,
  GuestClaimOperationResponseSchema,
  GuestClaimResponseSchema,
  MirroredAssetResponseSchema,
  SignedAssetDownloadResponseSchema,
  SignedAssetUploadResponseSchema,
  type GuestClaimReceipt,
  type GuestClaimSnapshot,
  type CreatorAssetKind,
} from "@movprompt/contracts";

import type { CreatorAsset } from "./types";

type CreatorImageMimeType = NonNullable<CreatorAsset["mimeType"]>;

function parseCreatorImageMimeType(value: string): CreatorImageMimeType {
  if (value === "image/jpeg" || value === "image/png" || value === "image/webp") return value;
  throw new Error("MovPrompt received an unsupported image type from storage. Your local draft is unchanged.");
}

function apiOrigin(): string {
  const configured = import.meta.env.VITE_API_ORIGIN?.trim();
  return configured ? new URL(configured).origin : window.location.origin;
}

async function sha256(blob: Blob) {
  const bytes = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function jsonResponse(response: Response): Promise<unknown> {
  const body: unknown = await response.json().catch(() => null);
  if (response.ok) return body;
  const error = body && typeof body === "object" && "error" in body ? body.error : null;
  const message = error && typeof error === "object" && "message" in error && typeof error.message === "string"
    ? error.message
    : "MovPrompt could not save this image.";
  throw new Error(message);
}

async function reservePrivateAsset(
  projectId: string,
  idempotencyKey: string,
  body: string,
): Promise<Response> {
  const request = () => fetch(
    `${apiOrigin()}/api/v1/projects/${projectId}/assets/upload-url`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body,
    },
  );
  const first = await request();
  // A newly claimed project can become visible to a second pooled database
  // connection a fraction later. Retry the same idempotent reservation once;
  // every other failure remains fail-closed and surfaces immediately.
  if (first.status !== 404) return first;
  await new Promise((resolve) => window.setTimeout(resolve, 120));
  return request();
}

export class GuestClaimAssetFailure extends Error {
  constructor(readonly localAssetId: string, cause: unknown) {
    super("MovPrompt could not secure this image. Your local draft is unchanged.");
    this.name = "GuestClaimAssetFailure";
    this.cause = cause;
  }
}

async function requestClaimOperation(
  pendingGenerationId: string,
): Promise<ReturnType<typeof GuestClaimOperationResponseSchema.parse>["operation"]> {
  const response = await fetch(`${apiOrigin()}/api/v1/drafts/claim/${pendingGenerationId}`, {
    credentials: "include",
  });
  return GuestClaimOperationResponseSchema.parse(await jsonResponse(response)).operation;
}

async function secureClaimAsset(input: {
  projectId: string;
  pendingGenerationId: string;
  localAssetId: string;
  kind: CreatorAssetKind;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  blob: Blob;
}): Promise<void> {
  if (input.blob.size !== input.sizeBytes || input.blob.type !== input.mimeType || await sha256(input.blob) !== input.checksumSha256) {
    throw new Error("local_asset_integrity_mismatch");
  }
  const uploadResponse = await reservePrivateAsset(
    input.projectId,
    `asset:${input.localAssetId}:${input.checksumSha256.slice(0, 24)}`,
    JSON.stringify({
      assetId: input.localAssetId,
      kind: input.kind,
      metadata: {
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        checksumSha256: input.checksumSha256,
      },
    }),
  );
  const upload = SignedAssetUploadResponseSchema.parse(await jsonResponse(uploadResponse));
  if (
    upload.asset.id !== input.localAssetId ||
    upload.asset.projectId !== input.projectId ||
    upload.asset.mimeType !== input.mimeType ||
    upload.asset.sizeBytes !== input.sizeBytes ||
    upload.asset.checksumSha256 !== input.checksumSha256
  ) {
    throw new Error("claim_asset_metadata_mismatch");
  }
  const stored = await fetch(
    `${apiOrigin()}/api/v1/projects/${input.projectId}/assets/${upload.asset.id}/content`,
    {
      method: "PUT",
      credentials: "include",
      headers: { "content-type": upload.asset.mimeType },
      body: input.blob,
    },
  );
  // A signed preview may exist only in this response. Claim recovery stores neither it nor the object key.
  SignedAssetDownloadResponseSchema.parse(await jsonResponse(stored));
  const completed = await fetch(
    `${apiOrigin()}/api/v1/projects/${input.projectId}/assets/${upload.asset.id}/complete`,
    {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pendingGenerationId: input.pendingGenerationId, localAssetId: input.localAssetId }),
    },
  );
  const ready = AssetReadyResponseSchema.parse(await jsonResponse(completed));
  if (ready.asset.id !== input.localAssetId || ready.asset.checksumSha256 !== input.checksumSha256) {
    throw new Error("claim_asset_completion_mismatch");
  }
}

/**
 * Browser claim orchestration deliberately follows the server's next checkpoint.
 * It never deletes or rewrites supplied blobs; cleanup is gated by canonical receipt verification.
 */
export async function claimGuestAssets(input: {
  snapshot: GuestClaimSnapshot;
  blobs: ReadonlyMap<string, Blob>;
}): Promise<GuestClaimReceipt> {
  const started = await fetch(`${apiOrigin()}/api/v1/drafts/claim/start`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "idempotency-key": input.snapshot.pendingGenerationId,
    },
    body: JSON.stringify(input.snapshot),
  });
  let operation = GuestClaimOperationResponseSchema.parse(await jsonResponse(started)).operation;
  const manifest = new Map(input.snapshot.assetManifest.map((asset) => [asset.localAssetId, asset]));

  while (operation.nextAsset) {
    const checkpoint = operation.nextAsset;
    const asset = manifest.get(checkpoint.localAssetId);
    const blob = asset ? input.blobs.get(asset.localAssetId) : undefined;
    if (!asset || !blob) throw new GuestClaimAssetFailure(checkpoint.localAssetId, new Error("local_asset_missing"));
    try {
      await secureClaimAsset({
        projectId: operation.projectId,
        pendingGenerationId: input.snapshot.pendingGenerationId,
        localAssetId: asset.localAssetId,
        kind: asset.kind,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        checksumSha256: asset.checksumSha256,
        blob,
      });
    } catch (error) {
      throw new GuestClaimAssetFailure(checkpoint.localAssetId, error);
    }
    operation = await requestClaimOperation(input.snapshot.pendingGenerationId);
  }

  const finalized = await fetch(
    `${apiOrigin()}/api/v1/drafts/claim/${input.snapshot.pendingGenerationId}/finalize`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "idempotency-key": input.snapshot.pendingGenerationId,
      },
      body: JSON.stringify({}),
    },
  );
  return GuestClaimResponseSchema.parse(await jsonResponse(finalized)).claim;
}

export async function claimGuestImage(input: {
  userId: string;
  projectId: string;
  assetId: string;
  name: string;
  blob: Blob;
  contentType: string;
  kind?: Extract<CreatorAssetKind, "product" | "reference">;
}) {
  const checksum = await sha256(input.blob);
  const idempotencyKey = `asset:${input.assetId}:${checksum.slice(0, 24)}`;
  const uploadResponse = await reservePrivateAsset(
    input.projectId,
    idempotencyKey,
    JSON.stringify({
      kind: input.kind ?? "product",
      metadata: {
        mimeType: input.contentType || "image/jpeg",
        sizeBytes: input.blob.size,
        checksumSha256: checksum,
        originalFilename: input.name,
      },
    }),
  );
  const upload = SignedAssetUploadResponseSchema.parse(await jsonResponse(uploadResponse));
  const stored = await fetch(
    `${apiOrigin()}/api/v1/projects/${input.projectId}/assets/${upload.asset.id}/content`,
    {
      method: "PUT",
      credentials: "include",
      headers: { "content-type": upload.asset.mimeType },
      body: input.blob,
    },
  );
  const download = SignedAssetDownloadResponseSchema.parse(await jsonResponse(stored));
  return {
    assetId: upload.asset.id,
    storagePath: upload.asset.objectKey,
    mimeType: parseCreatorImageMimeType(upload.asset.mimeType),
    url: download.download.url,
    checksum,
  };
}

export async function mirrorProductImages(projectId: string, assets: CreatorAsset[]) {
  const mirrored: CreatorAsset[] = [];
  for (const asset of assets) {
    if (asset.source !== "url" || asset.storagePath) {
      mirrored.push(asset);
      continue;
    }

    const urlChecksum = await sha256(new Blob([asset.url], { type: "text/plain" }));
    const response = await fetch(
      `${apiOrigin()}/api/v1/projects/${projectId}/assets/mirror`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "idempotency-key": `asset-mirror:${urlChecksum.slice(0, 48)}`,
        },
        body: JSON.stringify({
          kind: "product",
          url: asset.url,
          originalFilename: asset.name,
        }),
      },
    );
    const result = MirroredAssetResponseSchema.parse(await jsonResponse(response));
    mirrored.push({
      ...asset,
      id: result.asset.id,
      storagePath: result.asset.objectKey,
      mimeType: parseCreatorImageMimeType(result.asset.mimeType),
      url: result.download.url,
      checksum: result.asset.checksumSha256,
    });
  }
  return mirrored;
}
