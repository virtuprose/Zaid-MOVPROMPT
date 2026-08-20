import {
  CreatorProjectSchema,
  GuestClaimSnapshotSchema,
  GuestClaimAssetManifestSchema,
  ProjectVersionSchema,
  type CreatorProjectRecord,
  type GuestClaimSnapshot,
  type GuestClaimAssetManifest,
  type ProjectVersion,
} from "@movprompt/contracts";
import { objectKeys } from "@movprompt/storage";
import { schema, type Database, type JsonObject, type UserScopedTransaction, withUserTransaction } from "@movprompt/db";
import { and, asc, eq, sql } from "drizzle-orm";

export { createDatabaseAbandonedClaimCleanupRepository } from "@movprompt/db";

export class GuestClaimRepositoryError extends Error {
  constructor(readonly code: "conflict" | "not_found" | "assets_pending" | "asset_invalid" | "cleanup_leased") {
    super(code);
    this.name = "GuestClaimRepositoryError";
  }
}

function hasActiveCleanupLease(value: JsonObject): boolean {
  const cleanup = value.cleanup;
  return Boolean(cleanup && typeof cleanup === "object" && !Array.isArray(cleanup)
    && (cleanup as JsonObject).state === "leased");
}

export type GuestClaimAssetCheckpoint = {
  id: string;
  localAssetId: string;
  ordinal: number;
  status: "pending" | "securing" | "verified" | "failed";
};

export type GuestClaimOperation = {
  id: string;
  projectId: string;
  draftId: string;
  pendingGenerationId: string;
  snapshotDigest: string;
  status: "pending" | "securing" | "ready" | "failed";
  nextAsset: GuestClaimAssetCheckpoint | null;
};

export interface GuestClaimRepository {
  start(input: { userId: string; snapshot: GuestClaimSnapshot }): Promise<GuestClaimOperation>;
  resume(input: { userId: string; pendingGenerationId: string }): Promise<GuestClaimOperation>;
  markAssetVerified(input: { userId: string; pendingGenerationId: string; localAssetId: string; bucket: string; objectKey: string }): Promise<GuestClaimOperation>;
  markAssetFailed(input: { userId: string; pendingGenerationId: string; localAssetId: string; code: string }): Promise<GuestClaimOperation>;
  finalize(input: { userId: string; pendingGenerationId: string }): Promise<{ operation: GuestClaimOperation; project: CreatorProjectRecord; assetManifest: GuestClaimAssetManifest }>;
}

type ClaimRow = typeof schema.guestClaimOperations.$inferSelect;
type AssetRow = typeof schema.guestClaimAssets.$inferSelect;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function checkpoint(row: AssetRow | undefined): GuestClaimAssetCheckpoint | null {
  return row ? { id: row.id, localAssetId: row.localAssetId, ordinal: row.ordinal, status: row.status } : null;
}

async function assetsFor(tx: UserScopedTransaction, operationId: string): Promise<AssetRow[]> {
  return tx.select().from(schema.guestClaimAssets)
    .where(eq(schema.guestClaimAssets.claimOperationId, operationId))
    .orderBy(asc(schema.guestClaimAssets.ordinal));
}

function operationPublic(row: ClaimRow, assets: AssetRow[]): GuestClaimOperation {
  const next = assets.find((asset) => asset.status === "failed")
    ?? assets.find((asset) => asset.status === "pending" || asset.status === "securing");
  if (!row.projectId) throw new Error("guest_claim_project_missing");
  return {
    id: row.id,
    projectId: row.projectId,
    draftId: row.draftId,
    pendingGenerationId: row.pendingGenerationId,
    snapshotDigest: row.snapshotDigest,
    status: row.status,
    nextAsset: checkpoint(next),
  };
}

function assetManifest(assets: AssetRow[]): GuestClaimAssetManifest {
  return GuestClaimAssetManifestSchema.parse(assets.map((asset) => ({
    localAssetId: asset.localAssetId,
    ordinal: asset.ordinal,
    kind: asset.kind,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    checksumSha256: asset.checksumSha256,
    ...(asset.durationMs === null ? {} : { durationMs: asset.durationMs }),
  })));
}

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Guest drafts use IndexedDB IDs only to bind browser blobs to a claim operation.
 * Once those bytes are verified, every persisted campaign source must point at
 * the private object keys chosen by the server, never those local IDs.
 */
function configurationWithClaimedSourceAssetKeys(configuration: JsonObject, assets: AssetRow[]): JsonObject {
  const next = structuredClone(configuration);
  const creatorProject = next.creatorProject;
  if (!isJsonObject(creatorProject) || !isJsonObject(creatorProject.source)) return next;
  creatorProject.source.assetKeys = assets
    .filter((asset) => ["product", "reference", "footage"].includes(asset.kind) && Boolean(asset.objectKey))
    .map((asset) => asset.objectKey!);
  return next;
}

function versionPublic(row: typeof schema.creatorProjectVersions.$inferSelect): ProjectVersion {
  return ProjectVersionSchema.parse({
    id: row.id,
    projectId: row.projectId,
    parentVersionId: row.parentVersionId,
    templateVersionId: row.templateVersionId,
    mode: row.mode,
    versionNumber: row.versionNumber,
    configuration: row.configuration,
    productRecipe: row.productRecipe,
    campaignRecipe: row.campaignRecipe,
    changeReason: row.changeReason,
    createdAt: row.createdAt.toISOString(),
  });
}

async function receiptProject(tx: UserScopedTransaction, userId: string, operation: ClaimRow): Promise<CreatorProjectRecord> {
  if (!operation.projectId || !operation.projectVersionId) throw new Error("guest_claim_receipt_missing");
  const [project] = await tx.select().from(schema.creatorProjects).where(and(
    eq(schema.creatorProjects.id, operation.projectId),
    eq(schema.creatorProjects.userId, userId),
  )).limit(1);
  const [version] = await tx.select().from(schema.creatorProjectVersions).where(and(
    eq(schema.creatorProjectVersions.id, operation.projectVersionId),
    eq(schema.creatorProjectVersions.projectId, operation.projectId),
    eq(schema.creatorProjectVersions.userId, userId),
  )).limit(1);
  if (!project || !version) throw new Error("guest_claim_receipt_missing");
  return CreatorProjectSchema.parse({
    id: project.id,
    title: project.title,
    mode: project.mode,
    status: project.status,
    currentWorkingVersionId: project.currentWorkingVersionId,
    currentAcceptedVersionId: project.currentAcceptedVersionId,
    latestRenderRunId: null,
    latestRenderProjectVersionId: null,
    latestRenderRunStatus: null,
    deletedAt: project.deletedAt?.toISOString() ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    currentVersion: versionPublic(version),
    versionCount: 1,
    outputCount: 0,
  });
}

function sameSnapshot(row: ClaimRow, snapshot: GuestClaimSnapshot): boolean {
  return row.snapshotDigest === snapshot.snapshotDigest
    && canonical(row.snapshot) === canonical(snapshot)
    && canonical(row.assetManifest) === canonical(snapshot.assetManifest);
}

function databaseConstraint(error: unknown): string | null {
  let current: unknown = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== "object") return null;
    const candidate = current as { constraint_name?: unknown; cause?: unknown };
    if (typeof candidate.constraint_name === "string") return candidate.constraint_name;
    current = candidate.cause;
  }
  return null;
}

async function claimByIntent(tx: UserScopedTransaction, userId: string, pendingGenerationId: string): Promise<ClaimRow> {
  const [operation] = await tx.select().from(schema.guestClaimOperations).where(and(
    eq(schema.guestClaimOperations.userId, userId),
    eq(schema.guestClaimOperations.pendingGenerationId, pendingGenerationId),
  )).limit(1);
  if (!operation) throw new GuestClaimRepositoryError("not_found");
  return operation;
}

async function ensureTemplate(tx: UserScopedTransaction, templateVersionId: string | undefined): Promise<void> {
  if (!templateVersionId) return;
  const [template] = await tx.select({ id: schema.videoTemplateVersions.id })
    .from(schema.videoTemplateVersions)
    .innerJoin(schema.videoTemplates, and(
      eq(schema.videoTemplates.id, schema.videoTemplateVersions.templateId),
      eq(schema.videoTemplates.publishingState, "published"),
    ))
    .where(and(
      eq(schema.videoTemplateVersions.id, templateVersionId),
      sql`${schema.videoTemplateVersions.publishedAt} IS NOT NULL`,
    )).limit(1);
  if (!template) throw new GuestClaimRepositoryError("conflict");
}

export function createGuestClaimRepository(dependencies: { db: Database }): GuestClaimRepository {
  const { db } = dependencies;
  return {
    async start({ userId, snapshot }) {
      return withUserTransaction(db, userId, async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`guest-claim:${snapshot.draftId}`}, 0))`);
        const [byDraft] = await tx.select().from(schema.guestClaimOperations)
          .where(eq(schema.guestClaimOperations.draftId, snapshot.draftId)).limit(1);
        if (byDraft) {
          if (byDraft.userId !== userId || byDraft.pendingGenerationId !== snapshot.pendingGenerationId || !sameSnapshot(byDraft, snapshot)) {
            throw new GuestClaimRepositoryError("conflict");
          }
          return operationPublic(byDraft, await assetsFor(tx, byDraft.id));
        }
        const [byIntent] = await tx.select().from(schema.guestClaimOperations).where(and(
          eq(schema.guestClaimOperations.userId, userId),
          eq(schema.guestClaimOperations.pendingGenerationId, snapshot.pendingGenerationId),
        )).limit(1);
        if (byIntent) {
          if (!sameSnapshot(byIntent, snapshot)) throw new GuestClaimRepositoryError("conflict");
          return operationPublic(byIntent, await assetsFor(tx, byIntent.id));
        }
        await ensureTemplate(tx, snapshot.templateVersionId);
        const [project] = await tx.insert(schema.creatorProjects).values({
          userId, title: snapshot.title, mode: snapshot.mode, status: "draft", clientDraftId: snapshot.draftId,
        }).returning();
        if (!project) throw new Error("guest_claim_project_insert_failed");
        const [operation] = await tx.insert(schema.guestClaimOperations).values({
          userId,
          draftId: snapshot.draftId,
          pendingGenerationId: snapshot.pendingGenerationId,
          snapshotDigest: snapshot.snapshotDigest,
          snapshot: snapshot as unknown as JsonObject,
          assetManifest: snapshot.assetManifest as unknown as JsonObject[],
          projectId: project.id,
          status: snapshot.assetManifest.length === 0 ? "pending" : "securing",
        }).returning();
        if (!operation) throw new Error("guest_claim_operation_insert_failed");
        const assets = snapshot.assetManifest.length === 0 ? [] : await tx.insert(schema.guestClaimAssets)
          .values(snapshot.assetManifest.map((asset) => ({
            claimOperationId: operation.id,
            userId,
            localAssetId: asset.localAssetId,
            ordinal: asset.ordinal,
            kind: asset.kind,
            mimeType: asset.mimeType,
            sizeBytes: asset.sizeBytes,
            checksumSha256: asset.checksumSha256,
            ...(asset.durationMs === undefined ? {} : { durationMs: asset.durationMs }),
          }))).returning();
        return operationPublic(operation, assets);
      }).catch((error) => {
        const constraint = databaseConstraint(error);
        if (constraint?.startsWith("guest_claim_") || constraint === "creator_projects_client_draft_unique") {
          throw new GuestClaimRepositoryError("conflict");
        }
        throw error;
      });
    },

    async resume({ userId, pendingGenerationId }) {
      return withUserTransaction(db, userId, async (tx) => {
        const operation = await claimByIntent(tx, userId, pendingGenerationId);
        return operationPublic(operation, await assetsFor(tx, operation.id));
      });
    },

    async markAssetVerified({ userId, pendingGenerationId, localAssetId, bucket, objectKey }) {
      return withUserTransaction(db, userId, async (tx) => {
        const operation = await claimByIntent(tx, userId, pendingGenerationId);
        if (!operation.projectId || operation.status === "ready") throw new GuestClaimRepositoryError("asset_invalid");
        const [asset] = await tx.select().from(schema.guestClaimAssets).where(and(
          eq(schema.guestClaimAssets.claimOperationId, operation.id),
          eq(schema.guestClaimAssets.localAssetId, localAssetId),
          eq(schema.guestClaimAssets.userId, userId),
        )).limit(1);
        if (!asset) throw new GuestClaimRepositoryError("not_found");
        // A cleanup lease is exclusive. A late browser retry must not restore
        // the asset to verified while the worker owns the delete decision.
        // The client receives a retryable error and can resume after the
        // worker has either released or terminally completed the lease.
        if (asset.status === "securing" && hasActiveCleanupLease(asset.errorMetadata)) {
          throw new GuestClaimRepositoryError("cleanup_leased");
        }
        if (!["product", "logo", "audio", "reference", "footage"].includes(asset.kind)) {
          throw new GuestClaimRepositoryError("asset_invalid");
        }
        const expectedKey = objectKeys.creatorAsset({
          userId,
          projectId: operation.projectId,
          assetId: asset.localAssetId,
          kind: asset.kind as "product" | "logo" | "audio" | "reference" | "footage",
          checksumSha256: asset.checksumSha256,
        });
        if (objectKey !== expectedKey || !bucket.trim()) throw new GuestClaimRepositoryError("asset_invalid");
        await tx.update(schema.guestClaimAssets).set({
          status: "verified", bucket, objectKey, verifiedAt: new Date(), errorCode: null, errorMetadata: {}, updatedAt: new Date(),
        }).where(and(eq(schema.guestClaimAssets.id, asset.id), eq(schema.guestClaimAssets.userId, userId)));
        await tx.update(schema.guestClaimOperations).set({
          status: "securing", errorCode: null, errorMetadata: {}, updatedAt: new Date(),
        }).where(and(eq(schema.guestClaimOperations.id, operation.id), eq(schema.guestClaimOperations.userId, userId)));
        const updated = await claimByIntent(tx, userId, pendingGenerationId);
        return operationPublic(updated, await assetsFor(tx, updated.id));
      });
    },

    async markAssetFailed({ userId, pendingGenerationId, localAssetId, code }) {
      return withUserTransaction(db, userId, async (tx) => {
        const operation = await claimByIntent(tx, userId, pendingGenerationId);
        const [asset] = await tx.select().from(schema.guestClaimAssets).where(and(
          eq(schema.guestClaimAssets.claimOperationId, operation.id),
          eq(schema.guestClaimAssets.localAssetId, localAssetId),
          eq(schema.guestClaimAssets.userId, userId),
        )).limit(1);
        if (!asset) throw new GuestClaimRepositoryError("not_found");
        await tx.update(schema.guestClaimAssets).set({ status: "failed", errorCode: code, errorMetadata: {}, updatedAt: new Date() })
          .where(eq(schema.guestClaimAssets.id, asset.id));
        await tx.update(schema.guestClaimOperations).set({ status: "failed", errorCode: code, errorMetadata: {}, updatedAt: new Date() })
          .where(and(eq(schema.guestClaimOperations.id, operation.id), eq(schema.guestClaimOperations.userId, userId)));
        const updated = await claimByIntent(tx, userId, pendingGenerationId);
        return operationPublic(updated, await assetsFor(tx, updated.id));
      });
    },

    async finalize({ userId, pendingGenerationId }) {
      return withUserTransaction(db, userId, async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`guest-claim:${userId}:${pendingGenerationId}`}, 0))`);
        const operation = await claimByIntent(tx, userId, pendingGenerationId);
        const assets = await assetsFor(tx, operation.id);
        if (operation.status === "ready") {
          return {
            operation: operationPublic(operation, assets),
            project: await receiptProject(tx, userId, operation),
            assetManifest: assetManifest(assets),
          };
        }
        if (assets.some((asset) => asset.status !== "verified")) throw new GuestClaimRepositoryError("assets_pending");
        if (!operation.projectId) throw new Error("guest_claim_project_missing");
        const snapshot = GuestClaimSnapshotSchema.parse(operation.snapshot);
        await ensureTemplate(tx, snapshot.templateVersionId);
        const [version] = await tx.insert(schema.creatorProjectVersions).values({
          projectId: operation.projectId,
          userId,
          mode: snapshot.mode,
          versionNumber: 1,
          ...(snapshot.templateVersionId ? { templateVersionId: snapshot.templateVersionId } : {}),
          configuration: configurationWithClaimedSourceAssetKeys(snapshot.configuration, assets),
          productRecipe: snapshot.productRecipe,
          campaignRecipe: snapshot.campaignRecipe,
          changeReason: "Guest draft claimed after authentication",
          operationKey: snapshot.pendingGenerationId,
        }).returning();
        if (!version) throw new Error("guest_claim_version_insert_failed");
        if (assets.length > 0) await tx.insert(schema.creatorProjectAssets).values(assets.map((asset) => ({
          id: asset.localAssetId,
          projectId: operation.projectId!,
          userId,
          kind: asset.kind,
          bucket: asset.bucket!,
          objectKey: asset.objectKey!,
          mimeType: asset.mimeType,
          sizeBytes: asset.sizeBytes,
          checksumSha256: asset.checksumSha256,
          ...(asset.durationMs === null ? {} : { durationMs: asset.durationMs }),
        }))).onConflictDoNothing();
        await tx.update(schema.creatorProjects).set({ status: "ready", currentWorkingVersionId: version.id, updatedAt: new Date() })
          .where(and(eq(schema.creatorProjects.id, operation.projectId), eq(schema.creatorProjects.userId, userId)));
        const [ready] = await tx.update(schema.guestClaimOperations).set({
          status: "ready", projectVersionId: version.id, errorCode: null, errorMetadata: {}, finalizedAt: new Date(), updatedAt: new Date(),
        }).where(and(eq(schema.guestClaimOperations.id, operation.id), eq(schema.guestClaimOperations.userId, userId))).returning();
        if (!ready) throw new Error("guest_claim_finalize_update_failed");
        return {
          operation: operationPublic(ready, assets),
          project: await receiptProject(tx, userId, ready),
          assetManifest: assetManifest(assets),
        };
      });
    },
  };
}
