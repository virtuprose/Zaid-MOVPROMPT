import { createHash } from "node:crypto";

import { PROVIDER_BENCHMARK_CORPUS, type BenchmarkBrief } from "@movprompt/creative-engine";
import { assertStorageKey } from "@movprompt/storage";
import { z } from "zod";

const SHA256 = /^[a-f0-9]{64}$/u;

const BenchmarkReferenceSchema = z.object({
  objectKey: z.string().trim().min(1).max(1_024),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "video/mp4"]),
  checksumSha256: z.string().regex(SHA256),
}).strict();

const BenchmarkManifestItemSchema = z.object({
  briefId: z.string().trim().min(1).max(160),
  factsChecksumSha256: z.string().regex(SHA256),
  rightsAttested: z.literal(true),
  references: z.array(BenchmarkReferenceSchema).min(1).max(9),
}).strict();

const BenchmarkManifestSchema = z.object({
  version: z.literal("kw-48-assets-v1"),
  items: z.array(BenchmarkManifestItemSchema).length(PROVIDER_BENCHMARK_CORPUS.length),
}).strict();

export type BenchmarkManifest = z.infer<typeof BenchmarkManifestSchema>;
export type BenchmarkManifestItem = z.infer<typeof BenchmarkManifestItemSchema>;

function canonicalFacts(brief: BenchmarkBrief): string {
  return JSON.stringify({
    briefId: brief.id,
    templateId: brief.templateId,
    vertical: brief.vertical,
    language: brief.language,
    subjectName: brief.subjectName,
    confirmedFacts: brief.confirmedFacts,
    requiredRatio: brief.requiredRatio,
    challenge: brief.challenge,
  });
}

export function benchmarkFactsChecksum(brief: BenchmarkBrief): string {
  return createHash("sha256").update(canonicalFacts(brief)).digest("hex");
}

function referenceSignature(item: BenchmarkManifestItem): string {
  return item.references
    .map((reference) => `${reference.mimeType}:${reference.checksumSha256}`)
    .sort()
    .join("|");
}

/**
 * A complete benchmark uses the same subject pack across the three language
 * variants, but a distinct primary asset for all sixteen vertical/challenge
 * combinations. This isolates language quality without letting one attractive
 * product image stand in for the whole launch corpus.
 */
export function parseBenchmarkManifest(input: unknown): BenchmarkManifest {
  const manifest = BenchmarkManifestSchema.parse(input);
  const expected = new Map(PROVIDER_BENCHMARK_CORPUS.map((brief) => [brief.id, brief]));
  const seen = new Set<string>();
  const signatureBySubject = new Map<string, string>();
  const primaryChecksums = new Set<string>();
  for (const item of manifest.items) {
    if (seen.has(item.briefId)) throw new Error(`benchmark_manifest_duplicate_brief:${item.briefId}`);
    seen.add(item.briefId);
    const brief = expected.get(item.briefId);
    if (!brief) throw new Error(`benchmark_manifest_unknown_brief:${item.briefId}`);
    if (item.factsChecksumSha256 !== benchmarkFactsChecksum(brief)) {
      throw new Error(`benchmark_manifest_facts_mismatch:${item.briefId}`);
    }
    for (const reference of item.references) assertStorageKey(reference.objectKey);
    if (!item.references[0]!.mimeType.startsWith("image/")) {
      throw new Error(`benchmark_manifest_primary_image_required:${item.briefId}`);
    }
    if (item.references.filter((reference) => reference.mimeType === "video/mp4").length > 3) {
      throw new Error(`benchmark_manifest_video_reference_limit:${item.briefId}`);
    }
    const subjectKey = `${brief.vertical}:${brief.challenge}`;
    const signature = referenceSignature(item);
    const existing = signatureBySubject.get(subjectKey);
    if (existing && existing !== signature) {
      throw new Error(`benchmark_manifest_language_asset_drift:${subjectKey}`);
    }
    signatureBySubject.set(subjectKey, signature);
    primaryChecksums.add(item.references[0]!.checksumSha256);
  }
  const missing = [...expected.keys()].filter((id) => !seen.has(id));
  if (missing.length) throw new Error(`benchmark_manifest_missing_briefs:${missing.join(",")}`);
  if (signatureBySubject.size !== 16 || primaryChecksums.size < 16) {
    throw new Error("benchmark_manifest_requires_sixteen_distinct_subject_packs");
  }
  return manifest;
}

export interface BenchmarkAssetStorage {
  readonly assetsBucket: string;
  head(bucket: string, key: string): Promise<{
    ContentLength?: number | undefined;
    ContentType?: string | undefined;
    Metadata?: Record<string, string> | undefined;
  }>;
}

/** Verifies every private source object before the first paid provider call. */
export async function verifyBenchmarkManifestAssets(
  manifest: BenchmarkManifest,
  storage: BenchmarkAssetStorage,
  maxReferenceBytes = 50 * 1024 * 1024,
): Promise<void> {
  const checked = new Set<string>();
  for (const item of manifest.items) {
    for (const reference of item.references) {
      const identity = `${reference.objectKey}:${reference.checksumSha256}`;
      if (checked.has(identity)) continue;
      checked.add(identity);
      const head = await storage.head(storage.assetsBucket, reference.objectKey);
      const size = head.ContentLength ?? 0;
      const type = head.ContentType?.toLowerCase() ?? "";
      const checksum = head.Metadata?.["sha256-hex"]?.toLowerCase() ?? "";
      if (!Number.isSafeInteger(size) || size < 1 || size > maxReferenceBytes) {
        throw new Error(`benchmark_asset_size_invalid:${reference.objectKey}`);
      }
      if (type !== reference.mimeType) throw new Error(`benchmark_asset_mime_mismatch:${reference.objectKey}`);
      if (checksum !== reference.checksumSha256) {
        throw new Error(`benchmark_asset_checksum_mismatch:${reference.objectKey}`);
      }
    }
  }
}

export function benchmarkManifestByBrief(manifest: BenchmarkManifest): ReadonlyMap<string, BenchmarkManifestItem> {
  return new Map(manifest.items.map((item) => [item.briefId, item]));
}
