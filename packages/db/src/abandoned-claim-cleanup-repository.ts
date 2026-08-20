import { and, eq, inArray, isNull, lte, sql } from "drizzle-orm";

import type { Database } from "./client.js";
import { creatorProjectAssets, guestClaimAssets, guestClaimOperations, type JsonObject } from "./schema.js";

export type AbandonedClaimCleanupCandidateRecord = {
  claimId: string;
  assetId: string;
  userId: string;
  projectId: string;
  bucket: string;
  objectKey: string;
  kind: "product" | "logo" | "audio" | "reference" | "footage";
  checksumSha256: string;
  updatedAt: Date;
};

type CleanupAuditRecord = {
  claimId: string;
  assetId: string;
  jobId: string;
  workerId: string;
  requestId: string;
};

const TERMINAL_CLEANUP_CODE = "abandoned_claim_cleanup_completed";

function cleanupMetadata(input: CleanupAuditRecord & { state: string; code?: string; reason?: string; storageResult?: string; now: Date }): JsonObject {
  return {
    cleanup: {
      state: input.state,
      jobId: input.jobId,
      workerId: input.workerId,
      requestId: input.requestId,
      ...(input.code ? { code: input.code } : {}),
      ...(input.reason ? { reason: input.reason } : {}),
      ...(input.storageResult ? { storageResult: input.storageResult } : {}),
      at: input.now.toISOString(),
    },
  };
}

function candidateColumns() {
  return {
    claimId: guestClaimOperations.id,
    assetId: guestClaimAssets.id,
    userId: guestClaimAssets.userId,
    projectId: guestClaimOperations.projectId,
    bucket: guestClaimAssets.bucket,
    objectKey: guestClaimAssets.objectKey,
    kind: guestClaimAssets.kind,
    checksumSha256: guestClaimAssets.checksumSha256,
    updatedAt: guestClaimOperations.updatedAt,
  };
}

type CandidateRow = {
  claimId: string;
  assetId: string;
  userId: string;
  projectId: string | null;
  bucket: string | null;
  objectKey: string | null;
  kind: "product" | "logo" | "audio" | "reference" | "footage" | "generated" | "export";
  checksumSha256: string;
  updatedAt: Date;
};

function toCandidate(row: CandidateRow): AbandonedClaimCleanupCandidateRecord | null {
  if (!row.projectId || !row.bucket || !row.objectKey) return null;
  if (!(["product", "logo", "audio", "reference", "footage"] as const).includes(row.kind as "product" | "logo" | "audio" | "reference" | "footage")) return null;
  return {
    claimId: row.claimId,
    assetId: row.assetId,
    userId: row.userId,
    projectId: row.projectId,
    bucket: row.bucket,
    objectKey: row.objectKey,
    kind: row.kind as "product" | "logo" | "audio" | "reference" | "footage",
    checksumSha256: row.checksumSha256,
    updatedAt: row.updatedAt,
  };
}

/**
 * The cleanup lease lives in the existing bounded asset audit JSON rather than
 * introducing a second lifecycle table. Only verified, non-finalized claim
 * assets may be leased. Leasing changes the checkpoint to `securing`, which
 * makes concurrent finalization reject it as pending until cleanup either
 * releases the lease or records terminal cleanup.
 */
export function createDatabaseAbandonedClaimCleanupRepository(db: Database) {
  async function findEligible(now: Date, minimumAgeMs: number) {
    const cutoff = new Date(now.getTime() - minimumAgeMs);
    const rows = await db.select(candidateColumns())
      .from(guestClaimAssets)
      .innerJoin(guestClaimOperations, and(
        eq(guestClaimOperations.id, guestClaimAssets.claimOperationId),
        eq(guestClaimOperations.userId, guestClaimAssets.userId),
      ))
      .leftJoin(creatorProjectAssets, and(
        eq(creatorProjectAssets.id, guestClaimAssets.localAssetId),
        eq(creatorProjectAssets.userId, guestClaimAssets.userId),
      ))
      .where(and(
        eq(guestClaimAssets.status, "verified"),
        inArray(guestClaimOperations.status, ["pending", "securing", "failed"]),
        isNull(guestClaimOperations.finalizedAt),
        lte(guestClaimOperations.updatedAt, cutoff),
        isNull(creatorProjectAssets.id),
        sql`coalesce(${guestClaimAssets.errorMetadata}->'cleanup'->>'state', '') <> 'leased'`,
      ))
      .limit(1);
    return rows[0] ? toCandidate(rows[0]) : null;
  }

  return {
    async leaseCandidate(input: { now: Date; minimumAgeMs: number; workerId: string; jobId: string; requestId: string }) {
      const candidate = await findEligible(input.now, input.minimumAgeMs);
      if (!candidate) return null;
      const [leased] = await db.update(guestClaimAssets).set({
        status: "securing",
        errorMetadata: cleanupMetadata({
          claimId: candidate.claimId,
          assetId: candidate.assetId,
          jobId: input.jobId,
          workerId: input.workerId,
          requestId: input.requestId,
          state: "leased",
          now: input.now,
        }),
        updatedAt: input.now,
      }).where(and(
        eq(guestClaimAssets.id, candidate.assetId),
        eq(guestClaimAssets.status, "verified"),
        sql`coalesce(${guestClaimAssets.errorMetadata}->'cleanup'->>'state', '') <> 'leased'`,
      )).returning({ id: guestClaimAssets.id });
      return leased ? candidate : null;
    },

    async recheckLeasedCandidate(input: { claimId: string; assetId: string; now: Date }) {
      const rows = await db.select(candidateColumns())
        .from(guestClaimAssets)
        .innerJoin(guestClaimOperations, and(
          eq(guestClaimOperations.id, guestClaimAssets.claimOperationId),
          eq(guestClaimOperations.userId, guestClaimAssets.userId),
        ))
        .leftJoin(creatorProjectAssets, and(
          eq(creatorProjectAssets.id, guestClaimAssets.localAssetId),
          eq(creatorProjectAssets.userId, guestClaimAssets.userId),
        ))
        .where(and(
          eq(guestClaimAssets.id, input.assetId),
          eq(guestClaimOperations.id, input.claimId),
          eq(guestClaimAssets.status, "securing"),
          inArray(guestClaimOperations.status, ["pending", "securing", "failed"]),
          isNull(guestClaimOperations.finalizedAt),
          isNull(creatorProjectAssets.id),
          eq(sql`${guestClaimAssets.errorMetadata}->'cleanup'->>'state'`, "leased"),
        ))
        .limit(1);
      return rows[0] ? toCandidate(rows[0]) : null;
    },

    async complete(input: CleanupAuditRecord & { storageResult: "deleted" | "not_found" }) {
      const now = new Date();
      await db.update(guestClaimAssets).set({
        status: "failed",
        errorCode: TERMINAL_CLEANUP_CODE,
        errorMetadata: cleanupMetadata({ ...input, state: "completed", storageResult: input.storageResult, now }),
        updatedAt: now,
      }).where(and(eq(guestClaimAssets.id, input.assetId), eq(guestClaimAssets.status, "securing")));
    },

    async retry(input: CleanupAuditRecord & { code: string; message: string }) {
      const now = new Date();
      await db.update(guestClaimAssets).set({
        status: "verified",
        errorCode: input.code.slice(0, 120),
        errorMetadata: cleanupMetadata({ ...input, state: "retryable", code: input.code.slice(0, 120), now }),
        updatedAt: now,
      }).where(and(eq(guestClaimAssets.id, input.assetId), eq(guestClaimAssets.status, "securing")));
    },

    async release(input: CleanupAuditRecord & { reason: "retention_window" | "canonical_key_mismatch" | "finalized_or_released" }) {
      const now = new Date();
      await db.update(guestClaimAssets).set({
        status: "verified",
        errorMetadata: cleanupMetadata({ ...input, state: "released", reason: input.reason, now }),
        updatedAt: now,
      }).where(and(eq(guestClaimAssets.id, input.assetId), eq(guestClaimAssets.status, "securing")));
    },
  };
}
