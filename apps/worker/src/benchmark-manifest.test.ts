import { createHash } from "node:crypto";

import { PROVIDER_BENCHMARK_CORPUS } from "@movprompt/creative-engine";
import { describe, expect, it, vi } from "vitest";

import {
  benchmarkFactsChecksum,
  parseBenchmarkManifest,
  verifyBenchmarkManifestAssets,
  type BenchmarkManifest,
} from "./benchmark-manifest.js";

function checksum(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function manifestInput(): BenchmarkManifest {
  return {
    version: "kw-48-assets-v1",
    items: PROVIDER_BENCHMARK_CORPUS.map((brief) => {
      const subject = `${brief.vertical}-${brief.challenge}`;
      return {
        briefId: brief.id,
        factsChecksumSha256: benchmarkFactsChecksum(brief),
        rightsAttested: true,
        references: [{
          objectKey: `benchmarks/kw-48-v1/${subject}/primary.jpg`,
          mimeType: "image/jpeg",
          checksumSha256: checksum(subject),
        }],
      };
    }),
  };
}

describe("live benchmark manifest", () => {
  it("accepts complete facts-locked coverage with sixteen stable subject packs", () => {
    const manifest = parseBenchmarkManifest(manifestInput());
    expect(manifest.items).toHaveLength(48);
    expect(new Set(manifest.items.map((item) => item.references[0]!.checksumSha256))).toHaveLength(16);
  });

  it("rejects changed facts and cross-language asset drift", () => {
    const changedFacts = manifestInput();
    changedFacts.items[0]!.factsChecksumSha256 = checksum("changed");
    expect(() => parseBenchmarkManifest(changedFacts)).toThrow("benchmark_manifest_facts_mismatch");

    const drift = manifestInput();
    const matchingSubject = PROVIDER_BENCHMARK_CORPUS.findIndex((brief, index) =>
      index > 0 && brief.vertical === PROVIDER_BENCHMARK_CORPUS[0]!.vertical &&
      brief.challenge === PROVIDER_BENCHMARK_CORPUS[0]!.challenge,
    );
    drift.items[matchingSubject]!.references[0]!.checksumSha256 = checksum("different-language-image");
    expect(() => parseBenchmarkManifest(drift)).toThrow("benchmark_manifest_language_asset_drift");
  });

  it("verifies MIME, byte size and checksum metadata before spending", async () => {
    const manifest = parseBenchmarkManifest(manifestInput());
    const head = vi.fn(async (_bucket: string, key: string) => {
      const reference = manifest.items.flatMap((item) => item.references).find((item) => item.objectKey === key)!;
      return {
        ContentLength: 250_000,
        ContentType: reference.mimeType,
        Metadata: { "sha256-hex": reference.checksumSha256 },
      };
    });
    await verifyBenchmarkManifestAssets(manifest, { assetsBucket: "creator-assets", head });
    expect(head).toHaveBeenCalledTimes(16);

    await expect(verifyBenchmarkManifestAssets(manifest, {
      assetsBucket: "creator-assets",
      head: async () => ({
        ContentLength: 250_000,
        ContentType: "image/jpeg",
        Metadata: { "sha256-hex": checksum("wrong") },
      }),
    })).rejects.toThrow("benchmark_asset_checksum_mismatch");
  });
});
