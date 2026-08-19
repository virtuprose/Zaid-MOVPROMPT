import type { S3Client } from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";

import { PrivateObjectStorage } from "../src/service.js";

function storageWith(send: S3Client["send"]): PrivateObjectStorage {
  return new PrivateObjectStorage({
    region: "us-east-1",
    accessKeyId: "test-access-key",
    secretAccessKey: "test-secret-key",
    assetsBucket: "creator-assets",
    outputsBucket: "creator-outputs",
  }, { send } as unknown as S3Client);
}

const objectKey = `users/user-1/projects/project-1/assets/product/asset-1/${"b".repeat(64)}`;

describe("PrivateObjectStorage bounded server reads", () => {
  it("reads private bytes with normalized MIME metadata and a streaming cap", async () => {
    async function* body() {
      yield Uint8Array.from([1, 2]);
      yield Uint8Array.from([3, 4]);
    }
    const send = vi.fn(async () => ({
      Body: body(),
      ContentLength: 4,
      ContentType: "image/png; charset=binary",
      Metadata: { "sha256-hex": "a".repeat(64) },
    }));

    await expect(storageWith(send as unknown as S3Client["send"]).get({
      bucket: "creator-assets",
      key: objectKey,
      maxBytes: 4,
    })).resolves.toEqual({
      body: Uint8Array.from([1, 2, 3, 4]),
      contentType: "image/png",
      checksumSha256: "a".repeat(64),
    });
    expect(send).toHaveBeenCalledOnce();
  });

  it("rejects declared and streamed objects beyond the caller's cap", async () => {
    async function* oversizedBody() {
      yield Uint8Array.from([1, 2, 3]);
      yield Uint8Array.from([4, 5, 6]);
    }
    const send = vi.fn()
      .mockResolvedValueOnce({ Body: oversizedBody(), ContentLength: 6, ContentType: "image/jpeg" })
      .mockResolvedValueOnce({ Body: oversizedBody(), ContentType: "image/jpeg" });
    const storage = storageWith(send as unknown as S3Client["send"]);
    const request = { bucket: "creator-assets", key: objectKey, maxBytes: 5 };

    await expect(storage.get(request)).rejects.toThrow("exceeds the configured read limit");
    await expect(storage.get(request)).rejects.toThrow("exceeds the configured read limit");
  });
});
