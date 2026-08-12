import { describe, expect, it } from "vitest";
import { PrivateObjectStorage } from "../src/service.js";

describe("PrivateObjectStorage signed uploads", () => {
  it("returns the declared content type as a required browser upload header", async () => {
    const storage = new PrivateObjectStorage({
      endpoint: "http://127.0.0.1:9000",
      region: "us-east-1",
      accessKeyId: "test-access-key",
      secretAccessKey: "test-secret-key",
      assetsBucket: "creator-assets",
      outputsBucket: "creator-outputs",
      forcePathStyle: true,
    });
    const signed = await storage.signUpload({
      bucket: "creator-assets",
      key: `users/user-1/projects/project-1/assets/product/asset-1/${"a".repeat(64)}`,
      metadata: {
        mimeType: "image/jpeg",
        sizeBytes: 1_024,
        checksumSha256: "a".repeat(64),
      },
    });

    expect(signed.headers).toEqual({ "content-type": "image/jpeg" });
    expect(signed.url).toContain("x-amz-meta-sha256-hex=");
  });
});
