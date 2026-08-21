import { createHash } from "node:crypto";

import { PROVIDER_BENCHMARK_CORPUS } from "@movprompt/creative-engine";
import { describe, expect, it, vi } from "vitest";

import {
  benchmarkFactsChecksum,
  createCalibrationCandidateManifest,
  parseCalibrationCandidateManifest,
  validateCalibrationArtifact,
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

describe("qualified-human calibration evidence", () => {
  it("builds a candidate-only corpus with immutable checksums and no human approval data", () => {
    const candidates = createCalibrationCandidateManifest(parseBenchmarkManifest(manifestInput()));

    expect(candidates.version).toBe("kw-video-48-v1");
    expect(candidates.candidates).toHaveLength(48);
    expect(new Set(candidates.candidates.map((candidate) => candidate.id))).toHaveLength(48);
    expect(new Set(candidates.candidates.map((candidate) => candidate.candidateChecksumSha256))).toHaveLength(48);
    expect(candidates.candidates.every((candidate) => candidate.rightsAttested)).toBe(true);
    expect(JSON.stringify(candidates)).not.toMatch(/approval|adjudication|reviewer|https?:\/\//iu);
    expect(() => parseCalibrationCandidateManifest({ ...candidates, candidates: candidates.candidates.slice(1) }))
      .toThrow("calibration_candidate_manifest_missing_candidates");
  });

  it("rejects imported evidence before independent qualified labels, clinic attestation, adjudication, metrics, and approval are all bound", () => {
    const candidates = createCalibrationCandidateManifest(parseBenchmarkManifest(manifestInput()));

    expect(() => validateCalibrationArtifact({
      candidateManifest: candidates,
      evidence: {
        datasetVersion: candidates.version,
        evaluatorVersion: "quality-evaluator-v1",
        rubricVersion: "kuwait-quality-rubric-v1",
        labels: [],
        reviewerRoleAttestations: [],
        adjudications: [],
        metrics: {
          binary: { truePositive: 0, trueNegative: 0, falsePositive: 0, falseNegative: 0 },
          weightedCohenKappa: 0,
          dimensions: {},
          criticalFalseAccepts: 0,
        },
      },
    })).toThrow("calibration_labels_incomplete");
  });

  it("recomputes agreement and rejects stale, unsafe, or manually altered calibration evidence", () => {
    const candidates = createCalibrationCandidateManifest(parseBenchmarkManifest(manifestInput()));
    const unsafeEvidence = {
      datasetVersion: candidates.version,
      evaluatorVersion: "quality-evaluator-v1",
      rubricVersion: "kuwait-quality-rubric-v1",
      labels: [],
      reviewerRoleAttestations: [],
      adjudications: [],
      metrics: {
        binary: { truePositive: 48, trueNegative: 0, falsePositive: 0, falseNegative: 0 },
        weightedCohenKappa: 1,
        dimensions: {},
        criticalFalseAccepts: 0,
      },
      approvalRecord: {
        approverRole: "quality_calibration_approver",
        evidenceDigest: "a".repeat(64),
        approvalRecordDigest: "b".repeat(64),
      },
      providerOperation: "must-never-persist",
    };

    expect(() => validateCalibrationArtifact({ candidateManifest: candidates, evidence: unsafeEvidence }))
      .toThrow(/calibration_(forbidden_field|labels_incomplete)/u);
  });
});
