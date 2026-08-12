import { z } from "zod";
import { RequestIdSchema } from "./api.js";

export const CreatorAssetKindSchema = z.enum(["product", "logo", "audio", "reference"]);

export type CreatorAssetKind = z.infer<typeof CreatorAssetKindSchema>;

export const AssetUploadMetadataSchema = z
  .object({
    mimeType: z.string().trim().min(1).max(255),
    sizeBytes: z.number().int().positive().max(50 * 1024 * 1024),
    checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
    originalFilename: z.string().trim().min(1).max(255).optional(),
    width: z.number().int().positive().max(65_535).optional(),
    height: z.number().int().positive().max(65_535).optional(),
    durationMs: z.number().int().positive().max(24 * 60 * 60 * 1000).optional(),
  })
  .strict();

export type AssetUploadMetadata = z.infer<typeof AssetUploadMetadataSchema>;

export const CreateAssetUploadRequestSchema = z
  .object({
    kind: CreatorAssetKindSchema,
    metadata: AssetUploadMetadataSchema,
  })
  .strict();

export type CreateAssetUploadRequest = z.infer<typeof CreateAssetUploadRequestSchema>;

export const AssetRouteParametersSchema = z
  .object({
    projectId: z.uuid(),
    assetId: z.uuid().optional(),
  })
  .strict();

export const AssetDownloadQuerySchema = z
  .object({
    filename: z.string().trim().min(1).max(255).optional(),
  })
  .strict();

export const CreatorAssetSchema = z
  .object({
    id: z.uuid(),
    projectId: z.uuid(),
    kind: CreatorAssetKindSchema,
    objectKey: z.string().min(1).max(1024),
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().nonnegative(),
    checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export type CreatorAsset = z.infer<typeof CreatorAssetSchema>;

export const SignedAssetUploadResponseSchema = z
  .object({
    asset: CreatorAssetSchema,
    upload: z
      .object({
        method: z.literal("PUT"),
        url: z.url(),
        headers: z.record(z.string(), z.string()),
        expiresInSeconds: z.number().int().positive().max(3600),
      })
      .strict(),
    requestId: RequestIdSchema,
  })
  .strict();

export type SignedAssetUploadResponse = z.infer<typeof SignedAssetUploadResponseSchema>;

export const SignedAssetDownloadResponseSchema = z
  .object({
    asset: CreatorAssetSchema,
    download: z
      .object({
        method: z.literal("GET"),
        url: z.url(),
        expiresInSeconds: z.number().int().positive().max(3600),
      })
      .strict(),
    requestId: RequestIdSchema,
  })
  .strict();

export type SignedAssetDownloadResponse = z.infer<typeof SignedAssetDownloadResponseSchema>;

export const AssetReadyResponseSchema = z
  .object({
    asset: CreatorAssetSchema,
    status: z.literal("ready"),
    requestId: RequestIdSchema,
  })
  .strict();

export type AssetReadyResponse = z.infer<typeof AssetReadyResponseSchema>;
