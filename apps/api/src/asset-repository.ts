import { schema, withUserTransaction, type Database } from "@movprompt/db";
import { CreatorAssetKindSchema, type CreatorAsset } from "@movprompt/contracts";
import { and, eq, ne } from "drizzle-orm";

export type OwnedAssetRecord = CreatorAsset & {
  userId: string;
  bucket: string;
  originalFilename?: string;
  sourceUrlHash?: string;
};

export type CreateAssetRecord = OwnedAssetRecord & {
  width?: number;
  height?: number;
  durationMs?: number;
};

export interface AssetRepository {
  isProjectOwned(userId: string, projectId: string): Promise<boolean>;
  createOrFind(record: CreateAssetRecord): Promise<OwnedAssetRecord>;
  findOwned(userId: string, projectId: string, assetId: string): Promise<OwnedAssetRecord | null>;
}

type SourceMetadata = { originalFilename?: string; sourceUrlHash?: string };

function originalFilename(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = (value as SourceMetadata).originalFilename;
  return typeof candidate === "string" && candidate.trim() ? candidate : undefined;
}

function sourceUrlHash(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = (value as SourceMetadata).sourceUrlHash;
  return typeof candidate === "string" && /^[a-f0-9]{64}$/.test(candidate)
    ? candidate
    : undefined;
}

export function createDrizzleAssetRepository(db: Database): AssetRepository {
  return {
    async isProjectOwned(userId, projectId) {
      const [project] = await withUserTransaction(db, userId, (tx) => tx
        .select({ id: schema.creatorProjects.id })
        .from(schema.creatorProjects)
        .where(
          and(
            eq(schema.creatorProjects.id, projectId),
            eq(schema.creatorProjects.userId, userId),
            ne(schema.creatorProjects.status, "trashed"),
          ),
        )
        .limit(1));
      return Boolean(project);
    },

    async createOrFind(record) {
      await withUserTransaction(db, record.userId, (tx) => tx
        .insert(schema.creatorProjectAssets)
        .values({
          id: record.id,
          projectId: record.projectId,
          userId: record.userId,
          kind: record.kind,
          bucket: record.bucket,
          objectKey: record.objectKey,
          mimeType: record.mimeType,
          sizeBytes: record.sizeBytes,
          checksumSha256: record.checksumSha256,
          ...(record.width === undefined ? {} : { width: record.width }),
          ...(record.height === undefined ? {} : { height: record.height }),
          ...(record.durationMs === undefined ? {} : { durationMs: record.durationMs }),
          sourceMetadata: {
            ...(record.originalFilename ? { originalFilename: record.originalFilename } : {}),
            ...(record.sourceUrlHash ? { sourceUrlHash: record.sourceUrlHash } : {}),
          },
        })
        .onConflictDoNothing());

      const persisted = await this.findOwned(record.userId, record.projectId, record.id);
      if (!persisted) throw new Error("asset_record_not_persisted");
      return persisted;
    },

    async findOwned(userId, projectId, assetId) {
      const [asset] = await withUserTransaction(db, userId, (tx) => tx
        .select({
          id: schema.creatorProjectAssets.id,
          projectId: schema.creatorProjectAssets.projectId,
          userId: schema.creatorProjectAssets.userId,
          kind: schema.creatorProjectAssets.kind,
          bucket: schema.creatorProjectAssets.bucket,
          objectKey: schema.creatorProjectAssets.objectKey,
          mimeType: schema.creatorProjectAssets.mimeType,
          sizeBytes: schema.creatorProjectAssets.sizeBytes,
          checksumSha256: schema.creatorProjectAssets.checksumSha256,
          sourceMetadata: schema.creatorProjectAssets.sourceMetadata,
        })
        .from(schema.creatorProjectAssets)
        .innerJoin(
          schema.creatorProjects,
          and(
            eq(schema.creatorProjects.id, schema.creatorProjectAssets.projectId),
            eq(schema.creatorProjects.userId, schema.creatorProjectAssets.userId),
          ),
        )
        .where(
          and(
            eq(schema.creatorProjectAssets.id, assetId),
            eq(schema.creatorProjectAssets.projectId, projectId),
            eq(schema.creatorProjectAssets.userId, userId),
            ne(schema.creatorProjects.status, "trashed"),
          ),
        )
        .limit(1));

      if (!asset?.checksumSha256) return null;
      const parsedKind = CreatorAssetKindSchema.safeParse(asset.kind);
      if (!parsedKind.success) return null;
      const filename = originalFilename(asset.sourceMetadata);
      const remoteSourceUrlHash = sourceUrlHash(asset.sourceMetadata);
      return {
        id: asset.id,
        projectId: asset.projectId,
        userId: asset.userId,
        kind: parsedKind.data,
        bucket: asset.bucket,
        objectKey: asset.objectKey,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        checksumSha256: asset.checksumSha256,
        ...(filename ? { originalFilename: filename } : {}),
        ...(remoteSourceUrlHash ? { sourceUrlHash: remoteSourceUrlHash } : {}),
      };
    },
  };
}
