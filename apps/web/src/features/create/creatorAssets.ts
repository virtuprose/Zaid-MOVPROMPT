import {
  MirroredAssetResponseSchema,
  SignedAssetDownloadResponseSchema,
  SignedAssetUploadResponseSchema,
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
