import { z } from "zod";

import { CreatorAssetKindSchema } from "./assets.js";
import { IdempotencyKeySchema, RequestIdSchema } from "./api.js";
import {
  CreationModeSchema,
  CreatorProjectSchema,
  JsonObjectSchema,
  ProjectVersionSchema,
} from "./creator.js";

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

/** Browser-local metadata that identifies an asset before it is copied to private storage. */
export const GuestClaimAssetManifestEntrySchema = z
  .object({
    localAssetId: z.uuid(),
    ordinal: z.number().int().nonnegative().max(99),
    kind: CreatorAssetKindSchema,
    mimeType: z.string().trim().min(1).max(255),
    sizeBytes: z.number().int().positive().max(50 * 1024 * 1024),
    checksumSha256: Sha256Schema,
  })
  .strict();
export type GuestClaimAssetManifestEntry = z.infer<typeof GuestClaimAssetManifestEntrySchema>;

export const GuestClaimAssetManifestSchema = z
  .array(GuestClaimAssetManifestEntrySchema)
  .max(20)
  .superRefine((assets, context) => {
    const seenOrdinals = new Set<number>();
    const seenAssets = new Set<string>();
    for (const [index, asset] of assets.entries()) {
      if (seenOrdinals.has(asset.ordinal)) {
        context.addIssue({ code: "custom", path: [index, "ordinal"], message: "Asset ordinal must be unique." });
      }
      if (seenAssets.has(asset.localAssetId)) {
        context.addIssue({ code: "custom", path: [index, "localAssetId"], message: "Asset must appear once." });
      }
      seenOrdinals.add(asset.ordinal);
      seenAssets.add(asset.localAssetId);
    }
  });
export type GuestClaimAssetManifest = z.infer<typeof GuestClaimAssetManifestSchema>;

/**
 * Exact campaign data retained in the browser until a signed-in owner claims it.
 * Ownership, storage coordinates, signed URLs and provider identifiers are never
 * accepted from this payload.
 */
export const GuestClaimSnapshotSchema = z
  .object({
    draftId: z.uuid(),
    pendingGenerationId: IdempotencyKeySchema,
    snapshotDigest: Sha256Schema,
    assetManifest: GuestClaimAssetManifestSchema,
    title: z.string().trim().min(1).max(160),
    mode: CreationModeSchema,
    templateVersionId: z.uuid().optional(),
    configuration: JsonObjectSchema,
    productRecipe: JsonObjectSchema.default({}),
    campaignRecipe: JsonObjectSchema.default({}),
  })
  .strict();
export type GuestClaimSnapshot = z.infer<typeof GuestClaimSnapshotSchema>;

export const GuestClaimStatusSchema = z.enum(["pending", "securing", "ready", "failed"]);
export type GuestClaimStatus = z.infer<typeof GuestClaimStatusSchema>;

export const GuestClaimAssetCheckpointSchema = z
  .object({
    id: z.string().uuid(),
    localAssetId: z.uuid(),
    ordinal: z.number().int().nonnegative().max(99),
    status: z.enum(["pending", "securing", "verified", "failed"]),
  })
  .strict();
export type GuestClaimAssetCheckpoint = z.infer<typeof GuestClaimAssetCheckpointSchema>;

/** Server-owned claim state lets the browser resume one failed local asset without guessing progress. */
export const GuestClaimOperationSchema = z
  .object({
    id: z.uuid(),
    projectId: z.uuid(),
    draftId: z.uuid(),
    pendingGenerationId: IdempotencyKeySchema,
    snapshotDigest: Sha256Schema,
    status: GuestClaimStatusSchema,
    nextAsset: GuestClaimAssetCheckpointSchema.nullable(),
  })
  .strict();
export type GuestClaimOperation = z.infer<typeof GuestClaimOperationSchema>;

export const GuestClaimOperationResponseSchema = z
  .object({
    operation: GuestClaimOperationSchema,
    requestId: RequestIdSchema,
  })
  .strict();
export type GuestClaimOperationResponse = z.infer<typeof GuestClaimOperationResponseSchema>;

export const GuestClaimRouteParametersSchema = z
  .object({ pendingGenerationId: z.uuid() })
  .strict();

export const GuestClaimReceiptSchema = z
  .object({
    status: GuestClaimStatusSchema,
    draftId: z.uuid(),
    pendingGenerationId: IdempotencyKeySchema,
    snapshotDigest: Sha256Schema,
    /** Ordered verified manifest is required before browser-local blobs may be cleaned up. */
    assetManifest: GuestClaimAssetManifestSchema,
    project: CreatorProjectSchema,
    version: ProjectVersionSchema,
  })
  .strict();
export type GuestClaimReceipt = z.infer<typeof GuestClaimReceiptSchema>;

export const GuestClaimResponseSchema = z
  .object({
    claim: GuestClaimReceiptSchema,
    requestId: RequestIdSchema,
  })
  .strict();
export type GuestClaimResponse = z.infer<typeof GuestClaimResponseSchema>;
