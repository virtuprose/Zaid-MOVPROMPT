import { describe, expect, it, vi } from "vitest";
import type { AuthGateway } from "./auth-gateway.js";
import { createApi } from "./app.js";
import type { AssetRepository, OwnedAssetRecord } from "./asset-repository.js";
import type { AssetStorageGateway } from "./asset-storage.js";
import { loadApiConfig } from "./config.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";
const PROJECT_ID = "33333333-3333-4333-8333-333333333333";
const ASSET_ID = "44444444-4444-4444-8444-444444444444";
const CHECKSUM = "a".repeat(64);

const config = loadApiConfig({
  APP_ENV: "test",
  API_PORT: "3001",
  FEATURE_AUTHENTICATION: "true",
  FEATURE_ASSETS: "true",
});

function authGateway(userId: string | null = USER_ID): AuthGateway {
  return {
    handle: vi.fn(async () => new Response("auth-ok")),
    getSession: vi.fn(async () =>
      userId
        ? {
            user: {
              id: userId,
              email: "owner@example.test",
              emailVerified: true,
              name: "Owner",
              role: "user" as const,
            },
            session: { id: "session-1" },
          }
        : null,
    ),
  };
}

function ownedAsset(userId = USER_ID): OwnedAssetRecord {
  return {
    id: ASSET_ID,
    projectId: PROJECT_ID,
    userId,
    kind: "product",
    bucket: "creator-assets",
    objectKey: `users/${userId}/projects/${PROJECT_ID}/assets/product/${ASSET_ID}/${CHECKSUM}`,
    mimeType: "image/jpeg",
    sizeBytes: 1_024,
    checksumSha256: CHECKSUM,
    originalFilename: "perfume.jpg",
  };
}

function repository(options: {
  projectOwned?: boolean;
  asset?: OwnedAssetRecord | null;
} = {}): AssetRepository {
  return {
    isProjectOwned: vi.fn(async () => options.projectOwned ?? true),
    createOrFind: vi.fn(async (record) => record),
    findOwned: vi.fn(async () => (options.asset === undefined ? ownedAsset() : options.asset)),
  };
}

function storage(): AssetStorageGateway {
  return {
    assetsBucket: "creator-assets",
    signUpload: vi.fn(async (input) => ({
      method: "PUT" as const,
      url: "https://storage.example.test/upload?signature=private",
      bucket: input.bucket,
      key: input.key,
      expiresInSeconds: 900,
      headers: {},
      metadata: {
        ...input.metadata,
        mimeType: input.metadata.mimeType.toLowerCase(),
        checksumSha256: input.metadata.checksumSha256.toLowerCase(),
      },
    })),
    signDownload: vi.fn(async (input) => ({
      method: "GET" as const,
      url: "https://storage.example.test/download?signature=private",
      bucket: input.bucket,
      key: input.key,
      expiresInSeconds: 900,
    })),
    head: vi.fn(async () => ({
      contentLength: 1_024,
      contentType: "image/jpeg",
      checksumSha256: CHECKSUM,
    })),
  };
}

describe("private asset API", () => {
  it("derives a stable key from the authenticated owner and server asset ID", async () => {
    const repo = repository();
    const objectStorage = storage();
    const app = createApi({
      config,
      authGateway: authGateway(),
      assetRepository: repo,
      assetStorage: objectStorage,
    });
    const response = await app.request(`/api/v1/projects/${PROJECT_ID}/assets/upload-url`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": "request-assets-1",
        "idempotency-key": "asset-upload-request-1",
      },
      body: JSON.stringify({
        kind: "product",
        metadata: {
          mimeType: "image/jpeg",
          sizeBytes: 1_024,
          checksumSha256: CHECKSUM,
          originalFilename: "my private perfume.jpg",
          width: 1_080,
          height: 1_920,
        },
      }),
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      asset: { id: string; objectKey: string };
      requestId: string;
    };
    expect(body.requestId).toBe("request-assets-1");
    expect(body.asset.objectKey).toMatch(
      new RegExp(
        `^users/${USER_ID}/projects/${PROJECT_ID}/assets/product/${body.asset.id}/${CHECKSUM}$`,
      ),
    );
    expect(body.asset.objectKey).not.toContain("perfume.jpg");
    expect(repo.createOrFind).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        projectId: PROJECT_ID,
        objectKey: body.asset.objectKey,
      }),
    );
  });

  it("returns the same asset identity for repeated idempotent requests", async () => {
    let persisted: OwnedAssetRecord | undefined;
    const repo: AssetRepository = {
      isProjectOwned: vi.fn(async () => true),
      createOrFind: vi.fn(async (record) => {
        persisted ??= record;
        return persisted;
      }),
      findOwned: vi.fn(async () => persisted ?? null),
    };
    const app = createApi({
      config,
      authGateway: authGateway(),
      assetRepository: repo,
      assetStorage: storage(),
    });
    const request = () =>
      app.request(`/api/v1/projects/${PROJECT_ID}/assets/upload-url`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": "asset-upload-repeated",
        },
        body: JSON.stringify({
          kind: "reference",
          metadata: {
            mimeType: "image/png",
            sizeBytes: 2_048,
            checksumSha256: "b".repeat(64),
          },
        }),
      });

    const first = await request();
    const second = await request();
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    const firstBody = (await first.json()) as { asset: { id: string; objectKey: string } };
    const secondBody = (await second.json()) as { asset: { id: string; objectKey: string } };
    expect(secondBody.asset).toEqual(firstBody.asset);
  });

  it("does not reveal a project owned by another account", async () => {
    const objectStorage = storage();
    const app = createApi({
      config,
      authGateway: authGateway(OTHER_USER_ID),
      assetRepository: repository({ projectOwned: false }),
      assetStorage: objectStorage,
    });
    const response = await app.request(`/api/v1/projects/${PROJECT_ID}/assets/upload-url`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "asset-upload-request-2",
      },
      body: JSON.stringify({
        kind: "product",
        metadata: {
          mimeType: "image/jpeg",
          sizeBytes: 1_024,
          checksumSha256: CHECKSUM,
        },
      }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "project_not_found", retryable: false },
    });
    expect(objectStorage.signUpload).not.toHaveBeenCalled();
  });

  it("requires an authenticated Better Auth session", async () => {
    const app = createApi({
      config,
      authGateway: authGateway(null),
      assetRepository: repository(),
      assetStorage: storage(),
    });
    const response = await app.request(`/api/v1/projects/${PROJECT_ID}/assets/upload-url`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "asset-upload-request-3",
      },
      body: JSON.stringify({
        kind: "product",
        metadata: {
          mimeType: "image/jpeg",
          sizeBytes: 1_024,
          checksumSha256: CHECKSUM,
        },
      }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "authentication_required", retryable: false },
    });
  });

  it("verifies object integrity before signing a download", async () => {
    const objectStorage = storage();
    const app = createApi({
      config,
      authGateway: authGateway(),
      assetRepository: repository(),
      assetStorage: objectStorage,
    });
    const response = await app.request(
      `/api/v1/projects/${PROJECT_ID}/assets/${ASSET_ID}/download-url`,
      { headers: { "x-request-id": "request-assets-2" } },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      asset: { id: ASSET_ID, projectId: PROJECT_ID },
      download: { method: "GET", expiresInSeconds: 900 },
      requestId: "request-assets-2",
    });
    const headCallOrder = (objectStorage.head as ReturnType<typeof vi.fn>).mock
      .invocationCallOrder[0];
    const signCallOrder = (objectStorage.signDownload as ReturnType<typeof vi.fn>).mock
      .invocationCallOrder[0];
    expect(headCallOrder).toBeLessThan(signCallOrder!);
  });

  it("rejects a mismatched object without issuing a download URL", async () => {
    const objectStorage = storage();
    objectStorage.head = vi.fn(async () => ({
      contentLength: 999,
      contentType: "image/jpeg",
      checksumSha256: CHECKSUM,
    }));
    const app = createApi({
      config,
      authGateway: authGateway(),
      assetRepository: repository(),
      assetStorage: objectStorage,
    });
    const response = await app.request(
      `/api/v1/projects/${PROJECT_ID}/assets/${ASSET_ID}/download-url`,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "asset_integrity_mismatch", retryable: false },
    });
    expect(objectStorage.signDownload).not.toHaveBeenCalled();
  });
});
