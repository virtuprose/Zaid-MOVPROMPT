import {
  AssetReadyResponseSchema,
  SignedAssetDownloadResponseSchema,
  SignedAssetUploadResponseSchema,
} from "@movprompt/contracts";

import type { CreatorAsset } from "./types";

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

export async function claimGuestImage(input: {
  userId: string;
  projectId: string;
  assetId: string;
  name: string;
  blob: Blob;
  contentType: string;
}) {
  const checksum = await sha256(input.blob);
  const idempotencyKey = `asset:${input.assetId}:${checksum.slice(0, 24)}`;
  const uploadResponse = await fetch(
    `${apiOrigin()}/api/v1/projects/${input.projectId}/assets/upload-url`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify({
        kind: "product",
        metadata: {
          mimeType: input.contentType || "image/jpeg",
          sizeBytes: input.blob.size,
          checksumSha256: checksum,
          originalFilename: input.name,
        },
      }),
    },
  );
  const upload = SignedAssetUploadResponseSchema.parse(await jsonResponse(uploadResponse));
  const stored = await fetch(upload.upload.url, {
    method: "PUT",
    headers: upload.upload.headers,
    body: input.blob,
  });
  if (!stored.ok) throw new Error("The image upload did not complete. Your local draft is unchanged.");
  const complete = await fetch(
    `${apiOrigin()}/api/v1/projects/${input.projectId}/assets/${upload.asset.id}/complete`,
    { method: "POST", credentials: "include" },
  );
  AssetReadyResponseSchema.parse(await jsonResponse(complete));
  const signed = await fetch(
    `${apiOrigin()}/api/v1/projects/${input.projectId}/assets/${upload.asset.id}/download-url`,
    { credentials: "include" },
  );
  const download = SignedAssetDownloadResponseSchema.parse(await jsonResponse(signed));
  return {
    assetId: upload.asset.id,
    storagePath: upload.asset.objectKey,
    url: download.download.url,
    checksum,
  };
}

/**
 * Remote image mirroring is deliberately deferred until each candidate has
 * passed the same DNS, redirect, MIME and byte controls as source scanning.
 * Keeping this fail-closed prevents authenticated imports from becoming an
 * SSRF bypass.
 */
export async function mirrorProductImages(_projectId: string, assets: CreatorAsset[]) {
  if (assets.some((asset) => asset.source === "url" && !asset.storagePath)) {
    throw new Error("Download the selected product image and upload it to continue securely.");
  }
  return assets;
}
