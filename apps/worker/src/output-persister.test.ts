import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it, vi } from "vitest";

import { createProviderOutputPersister, normalizeDeliveryMp4, type WorkerOutputStorage } from "./output-persister.js";

const execFileAsync = promisify(execFile);

const mp4 = new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
const publicDns = async () => [{ address: "93.184.216.34", family: 4 as const }];

function storage() {
  const put = vi.fn<WorkerOutputStorage["put"]>(async (input) => ({ bucket: input.bucket, key: input.key }));
  return { outputsBucket: "creator-outputs", put } satisfies WorkerOutputStorage;
}

describe("provider output persister", () => {
  it.runIf(process.env.MOVPROMPT_TEST_FFMPEG === "true")(
    "normalizes provider media to MP4 H264/AAC delivery",
    async () => {
      const directory = await mkdtemp(join(tmpdir(), "movprompt-normalizer-test-"));
      const source = join(directory, "source.mp4");
      const voice = join(directory, "voice.mp3");
      const normalized = join(directory, "normalized.mp4");
      try {
        await execFileAsync("ffmpeg", [
          "-hide_banner", "-loglevel", "error", "-y",
          "-f", "lavfi", "-i", "color=c=blue:s=640x640:d=1",
          "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
          "-c:v", "mpeg4", "-c:a", "mp3", "-shortest", source,
        ]);
        await execFileAsync("ffmpeg", [
          "-hide_banner", "-loglevel", "error", "-y",
          "-f", "lavfi", "-i", "sine=frequency=880:duration=0.6", "-c:a", "mp3", voice,
        ]);
        await writeFile(normalized, await normalizeDeliveryMp4(
          new Uint8Array(await readFile(source)),
          new Uint8Array(await readFile(voice)),
        ));
        const { stdout } = await execFileAsync("ffprobe", [
          "-v", "error", "-show_entries", "stream=codec_type,codec_name", "-of", "json", normalized,
        ]);
        expect(JSON.parse(stdout).streams).toEqual(expect.arrayContaining([
          expect.objectContaining({ codec_type: "video", codec_name: "h264" }),
          expect.objectContaining({ codec_type: "audio", codec_name: "aac" }),
        ]));
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
    30_000,
  );

  it.runIf(process.env.MOVPROMPT_TEST_FFMPEG === "true")(
    "converts a provider 3:4 canvas into a decoded 4:5 delivery artifact",
    async () => {
      const directory = await mkdtemp(join(tmpdir(), "movprompt-four-five-test-"));
      const source = join(directory, "source-3x4.mp4");
      const output = join(directory, "delivery-4x5.mp4");
      try {
        await execFileAsync(process.env.FFMPEG_PATH?.trim() || "ffmpeg", [
          "-hide_banner", "-loglevel", "error", "-y",
          "-f", "lavfi", "-i", "testsrc2=s=720x960:d=1:r=24",
          "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", source,
        ]);
        await writeFile(output, await normalizeDeliveryMp4(
          new Uint8Array(await readFile(source)),
          undefined,
          { aspectRatio: "4:5" },
        ));
        const { stdout } = await execFileAsync(process.env.FFPROBE_PATH?.trim() || "ffprobe", [
          "-v", "error", "-select_streams", "v:0",
          "-show_entries", "stream=width,height,codec_name,pix_fmt", "-of", "json", output,
        ]);
        const stream = JSON.parse(stdout).streams[0];
        expect(stream).toMatchObject({ codec_name: "h264", pix_fmt: "yuv420p" });
        expect(stream.width / stream.height).toBeCloseTo(4 / 5, 3);
        await expect(execFileAsync(process.env.FFMPEG_PATH?.trim() || "ffmpeg", [
          "-v", "error", "-i", output, "-f", "null", "-",
        ])).resolves.toBeDefined();
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
    30_000,
  );

  it("copies a validated MP4 into an owned project/version path", async () => {
    const target = storage();
    const normalizer = vi.fn(async (bytes: Uint8Array) => bytes);
    const persister = createProviderOutputPersister({
      storage: target,
      allowedHosts: ["media.provider.test"],
      resolveHost: publicDns,
      normalizer,
      fetcher: vi.fn(async () => new Response(mp4, {
        status: 200,
        headers: { "content-length": String(mp4.byteLength), "content-type": "video/mp4" },
      })),
    });

    const saved = await persister.persist({
      runId: "run-1",
      userId: "user-1",
      projectId: "project-1",
      projectVersionId: "version-1",
      attemptNumber: 0,
      sourceUrl: "https://media.provider.test/result.mp4",
      configuration: { generation: { aspectRatio: "4:5" } },
    });

    expect(saved.bucket).toBe("creator-outputs");
    expect(normalizer).toHaveBeenCalledWith(mp4, undefined, { aspectRatio: "4:5" });
    expect(saved.objectKey).toBe("users/user-1/projects/project-1/versions/version-1/outputs/render-run-1-attempt-0.mp4");
    expect(target.put).toHaveBeenCalledWith(expect.objectContaining({
      contentType: "video/mp4",
      metadata: expect.objectContaining({ "sha256-hex": createHash("sha256").update(mp4).digest("hex") }),
    }));
  });

  it("rejects untrusted hosts, oversized responses and non-MP4 payloads", async () => {
    const target = storage();
    const fetcher = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "content-type": "video/mp4" },
    }));
    const persister = createProviderOutputPersister({
      storage: target,
      allowedHosts: ["media.provider.test"],
      resolveHost: publicDns,
      maxBytes: 12,
      normalizer: async (bytes) => bytes,
      fetcher,
    });

    await expect(persister.persist({
      runId: "run-1", userId: "user-1", projectId: "project-1", projectVersionId: "version-1",
      attemptNumber: 0, sourceUrl: "http://127.0.0.1/private.mp4",
      configuration: {},
    })).rejects.toThrow("provider_output_url_invalid");
    await expect(persister.persist({
      runId: "run-1", userId: "user-1", projectId: "project-1", projectVersionId: "version-1",
      attemptNumber: 0, sourceUrl: "https://media.provider.test/not-video",
      configuration: {},
    })).rejects.toThrow("provider_output_not_mp4");

    const oversized = createProviderOutputPersister({
      storage: target,
      allowedHosts: ["media.provider.test"],
      resolveHost: publicDns,
      maxBytes: 12,
      normalizer: async (bytes) => bytes,
      fetcher: vi.fn(async () => new Response(new Uint8Array(13), { status: 200 })),
    });
    await expect(oversized.persist({
      runId: "run-1", userId: "user-1", projectId: "project-1", projectVersionId: "version-1",
      attemptNumber: 0, sourceUrl: "https://media.provider.test/stream-without-length.mp4",
      configuration: {},
    })).rejects.toThrow("provider_output_too_large");
  });

  it("revalidates redirect destinations", async () => {
    const persister = createProviderOutputPersister({
      storage: storage(),
      allowedHosts: ["media.provider.test"],
      resolveHost: publicDns,
      normalizer: async (bytes) => bytes,
      fetcher: vi.fn(async () => new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest" } })),
    });
    await expect(persister.persist({
      runId: "run-1", userId: "user-1", projectId: "project-1", projectVersionId: "version-1",
      attemptNumber: 0, sourceUrl: "https://media.provider.test/result.mp4",
      configuration: {},
    })).rejects.toThrow("provider_output_url_invalid");
  });

  it("supports explicit DNS-bound suffix rules and rejects private DNS answers before download", async () => {
    const fetcher = vi.fn(async () => new Response(mp4, {
      status: 200,
      headers: { "content-type": "video/mp4" },
    }));
    const persister = createProviderOutputPersister({
      storage: storage(),
      allowedHosts: [".volces.com"],
      resolveHost: async () => [{ address: "10.0.0.8", family: 4 }],
      normalizer: async (bytes) => bytes,
      fetcher,
    });
    await expect(persister.persist({
      runId: "run-1", userId: "user-1", projectId: "project-1", projectVersionId: "version-1",
      attemptNumber: 0,
      sourceUrl: "https://ark-content-generation-ap-southeast-1.tos-ap-southeast-1.volces.com/result.mp4",
      configuration: {},
    })).rejects.toThrow("provider_output_address_not_public");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects HTTP, apex suffix bypasses and invalid response MIME", async () => {
    const fetcher = vi.fn(async () => new Response(mp4, {
      status: 200,
      headers: { "content-type": "text/html" },
    }));
    const persister = createProviderOutputPersister({
      storage: storage(),
      allowedHosts: [".volces.com", "media.provider.test"],
      resolveHost: publicDns,
      normalizer: async (bytes) => bytes,
      fetcher,
    });
    const base = {
      runId: "run-1", userId: "user-1", projectId: "project-1", projectVersionId: "version-1",
      attemptNumber: 0, configuration: {},
    };
    await expect(persister.persist({ ...base, sourceUrl: "http://media.provider.test/result.mp4" }))
      .rejects.toThrow("provider_output_url_invalid");
    await expect(persister.persist({ ...base, sourceUrl: "https://volces.com/result.mp4" }))
      .rejects.toThrow("provider_output_host_not_allowed");
    await expect(persister.persist({ ...base, sourceUrl: "https://media.provider.test/result.mp4" }))
      .rejects.toThrow("provider_output_mime_invalid");
  });
});
