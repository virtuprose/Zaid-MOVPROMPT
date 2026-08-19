import { afterEach, describe, expect, it, vi } from "vitest";

import { claimGuestAssets, claimGuestImage, mirrorProductImages } from "./creatorAssets";
import type { CreatorAsset } from "./types";

describe("creator remote product image mirroring", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uploads a local image through the authenticated API before returning its private preview", async () => {
    const assetId = "11111111-1111-4111-8111-111111111111";
    const projectId = "22222222-2222-4222-8222-222222222222";
    const checksum = "b".repeat(64);
    const privateAsset = {
      id: assetId,
      projectId,
      kind: "product",
      objectKey: `users/u/projects/${projectId}/assets/product/${assetId}/${checksum}`,
      mimeType: "image/jpeg",
      sizeBytes: 4,
      checksumSha256: checksum,
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        asset: privateAsset,
        upload: {
          method: "PUT",
          url: "https://storage.example.test/signed-upload",
          headers: { "content-type": "image/jpeg" },
          expiresInSeconds: 900,
        },
        requestId: "request-upload-url-1",
      }), { status: 201, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        asset: privateAsset,
        download: {
          method: "GET",
          url: "https://storage.example.test/private.jpg?signature=short-lived",
          expiresInSeconds: 900,
        },
        requestId: "request-upload-content-1",
      }), { status: 201, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: "image/jpeg" });

    const result = await claimGuestImage({
      userId: "user-1",
      projectId,
      assetId: "local-image-1",
      name: "product.jpg",
      blob,
      contentType: "image/jpeg",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]![0])).toMatch(
      new RegExp(`/api/v1/projects/${projectId}/assets/${assetId}/content$`),
    );
    expect(fetchMock.mock.calls[1]![1]).toMatchObject({
      method: "PUT",
      credentials: "include",
      headers: { "content-type": "image/jpeg" },
      body: blob,
    });
    expect(result).toMatchObject({
      assetId,
      storagePath: privateAsset.objectKey,
      mimeType: "image/jpeg",
      url: "https://storage.example.test/private.jpg?signature=short-lived",
    });
  });

  it("retries one idempotent asset reservation when a newly claimed project is briefly unavailable", async () => {
    const assetId = "11111111-1111-4111-8111-111111111111";
    const projectId = "22222222-2222-4222-8222-222222222222";
    const checksum = "b".repeat(64);
    const privateAsset = {
      id: assetId,
      projectId,
      kind: "product",
      objectKey: `users/u/projects/${projectId}/assets/product/${assetId}/${checksum}`,
      mimeType: "image/jpeg",
      sizeBytes: 4,
      checksumSha256: checksum,
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: { code: "project_not_found", message: "The requested project was not found." },
      }), { status: 404, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        asset: privateAsset,
        upload: {
          method: "PUT",
          url: "https://storage.example.test/signed-upload",
          headers: { "content-type": "image/jpeg" },
          expiresInSeconds: 900,
        },
        requestId: "request-upload-url-retry",
      }), { status: 201, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        asset: privateAsset,
        download: {
          method: "GET",
          url: "https://storage.example.test/private.jpg?signature=short-lived",
          expiresInSeconds: 900,
        },
        requestId: "request-upload-content-retry",
      }), { status: 201, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await claimGuestImage({
      userId: "user-1",
      projectId,
      assetId: "local-image-1",
      name: "product.jpg",
      blob: new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: "image/jpeg" }),
      contentType: "image/jpeg",
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]![0]).toEqual(fetchMock.mock.calls[1]![0]);
    expect(fetchMock.mock.calls[0]![1]).toEqual(fetchMock.mock.calls[1]![1]);
  });

  it("resumes only the server-reported failed asset and keeps the supplied local blobs on failure", async () => {
    const projectId = "22222222-2222-4222-8222-222222222222";
    const pendingGenerationId = "33333333-3333-4333-8333-333333333333";
    const skippedAssetId = "44444444-4444-4444-8444-444444444444";
    const failedAssetId = "55555555-5555-4555-8555-555555555555";
    const failedBlob = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: "image/jpeg" });
    const checksum = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await failedBlob.arrayBuffer())))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
    const privateAsset = {
      id: failedAssetId,
      projectId,
      kind: "product",
      objectKey: `users/u/projects/${projectId}/assets/product/${failedAssetId}/${checksum}`,
      mimeType: "image/jpeg",
      sizeBytes: 4,
      checksumSha256: checksum,
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        operation: {
          id: "66666666-6666-4666-8666-666666666666",
          projectId,
          draftId: "77777777-7777-4777-8777-777777777777",
          pendingGenerationId,
          snapshotDigest: "a".repeat(64),
          status: "failed",
          nextAsset: {
            id: "88888888-8888-4888-8888-888888888888",
            localAssetId: failedAssetId,
            ordinal: 1,
            status: "failed",
          },
        },
        requestId: "start-request",
      }), { status: 201, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        asset: privateAsset,
        upload: { method: "PUT", url: "https://storage.example.test/upload", headers: {}, expiresInSeconds: 900 },
        requestId: "reserve-request",
      }), { status: 201, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        asset: privateAsset,
        download: { method: "GET", url: "https://storage.example.test/short-lived", expiresInSeconds: 900 },
        requestId: "content-request",
      }), { status: 201, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: { code: "asset_integrity_mismatch", message: "The uploaded asset could not be verified." },
      }), { status: 409, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const blobs = new Map([
      [skippedAssetId, new Blob(["already secure"], { type: "image/jpeg" })],
      [failedAssetId, failedBlob],
    ]);

    await expect(claimGuestAssets({
      snapshot: {
        draftId: "77777777-7777-4777-8777-777777777777",
        pendingGenerationId,
        snapshotDigest: "a".repeat(64),
        assetManifest: [
          { localAssetId: skippedAssetId, ordinal: 0, kind: "product", mimeType: "image/jpeg", sizeBytes: 14, checksumSha256: "c".repeat(64) },
          { localAssetId: failedAssetId, ordinal: 1, kind: "product", mimeType: "image/jpeg", sizeBytes: 4, checksumSha256: checksum },
        ],
        title: "Coffee campaign",
        mode: "template",
        configuration: {},
        productRecipe: {},
        campaignRecipe: {},
      },
      blobs,
    })).rejects.toMatchObject({ localAssetId: failedAssetId });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(String(fetchMock.mock.calls[1]![0])).toContain(`/assets/upload-url`);
    expect(JSON.parse(String((fetchMock.mock.calls[1]![1] as RequestInit).body))).toMatchObject({ assetId: failedAssetId });
    expect(blobs.get(skippedAssetId)).toBeInstanceOf(Blob);
    expect(blobs.get(failedAssetId)).toBeInstanceOf(Blob);
  });

  it("calls the authenticated mirror endpoint and returns only the private stored asset", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({
        asset: {
          id: "11111111-1111-4111-8111-111111111111",
          projectId: "22222222-2222-4222-8222-222222222222",
          kind: "product",
          objectKey: "users/u/projects/p/assets/product/a/checksum",
          mimeType: "image/jpeg",
          sizeBytes: 6,
          checksumSha256: "a".repeat(64),
        },
        download: {
          method: "GET",
          url: "https://storage.example.test/private.jpg?signature=short-lived",
          expiresInSeconds: 900,
        },
        requestId: "request-mirror-client-1",
      }), { status: 201, headers: { "content-type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const assets: CreatorAsset[] = [
      {
        id: "remote-1",
        name: "AirPods Max.jpg",
        url: "https://cdn.example.test/apple/airpods-max.jpg",
        source: "url",
      },
      {
        id: "uploaded-1",
        name: "Side angle.jpg",
        url: "blob:http://localhost/uploaded-1",
        storagePath: "users/u/projects/p/assets/product/uploaded-1/checksum",
        source: "upload",
      },
    ];

    const result = await mirrorProductImages(
      "22222222-2222-4222-8222-222222222222",
      assets,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, request] = fetchMock.mock.calls[0]!;
    expect(String(url)).toMatch(
      /\/api\/v1\/projects\/22222222-2222-4222-8222-222222222222\/assets\/mirror$/,
    );
    expect(request).toMatchObject({ method: "POST", credentials: "include" });
    expect((request as RequestInit).headers).toMatchObject({
      "content-type": "application/json",
      "idempotency-key": expect.stringMatching(/^asset-mirror:[a-f0-9]{48}$/),
    });
    expect(JSON.parse(String((request as RequestInit).body))).toEqual({
      kind: "product",
      url: "https://cdn.example.test/apple/airpods-max.jpg",
      originalFilename: "AirPods Max.jpg",
    });
    expect(result[0]).toMatchObject({
      id: "11111111-1111-4111-8111-111111111111",
      name: "AirPods Max.jpg",
      source: "url",
      url: "https://storage.example.test/private.jpg?signature=short-lived",
      storagePath: "users/u/projects/p/assets/product/a/checksum",
      checksum: "a".repeat(64),
    });
    expect(result[1]).toEqual(assets[1]);
  });

  it("rejects an unsupported storage MIME type instead of weakening the image contract", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      asset: {
        id: "11111111-1111-4111-8111-111111111111",
        projectId: "22222222-2222-4222-8222-222222222222",
        kind: "product",
        objectKey: "users/u/projects/p/assets/product/a/checksum",
        mimeType: "image/gif",
        sizeBytes: 6,
        checksumSha256: "a".repeat(64),
      },
      download: {
        method: "GET",
        url: "https://storage.example.test/private.gif?signature=short-lived",
        expiresInSeconds: 900,
      },
      requestId: "request-mirror-client-invalid-mime",
    }), { status: 201, headers: { "content-type": "application/json" } })));

    await expect(mirrorProductImages(
      "22222222-2222-4222-8222-222222222222",
      [{
        id: "remote-1",
        name: "AirPods Max.gif",
        url: "https://cdn.example.test/apple/airpods-max.gif",
        source: "url",
      }],
    )).rejects.toThrow("unsupported image type");
  });
});
