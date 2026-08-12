import {
  CreateBucketCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";

import {
  PrivateObjectStorage,
  objectKeys,
  objectStorageConfigFromEnv,
} from "../../packages/storage/src/index.ts";

const config = objectStorageConfigFromEnv(process.env);
const client = new S3Client({
  endpoint: config.endpoint,
  region: config.region,
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
  forcePathStyle: config.forcePathStyle,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

for (const bucket of [config.assetsBucket, config.outputsBucket, config.previewsBucket].filter(
  (value): value is string => Boolean(value),
)) {
  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  } catch (error) {
    const code = (error as { name?: string }).name;
    if (code !== "BucketAlreadyOwnedByYou" && code !== "BucketAlreadyExists") throw error;
  }
}

const bytes = new TextEncoder().encode(`movprompt-storage-check:${crypto.randomUUID()}`);
const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
const key = objectKeys.creatorAsset({
  userId: "storage-check-user",
  projectId: "storage-check-project",
  assetId: crypto.randomUUID(),
  kind: "reference",
  checksumSha256,
});
const storage = new PrivateObjectStorage(config, client);
const signedUpload = await storage.signUpload({
  bucket: storage.assetsBucket,
  key,
  metadata: {
    mimeType: "image/png",
    sizeBytes: bytes.byteLength,
    checksumSha256,
  },
});

const upload = await fetch(signedUpload.url, {
  method: signedUpload.method,
  headers: signedUpload.headers,
  body: bytes,
});
if (!upload.ok) throw new Error(`Signed upload failed with HTTP ${upload.status}: ${await upload.text()}`);

const signedDownload = await storage.signDownload({
  bucket: storage.assetsBucket,
  key,
});
const download = await fetch(signedDownload.url);
if (!download.ok) throw new Error(`Signed download failed with HTTP ${download.status}`);
const downloaded = new Uint8Array(await download.arrayBuffer());
const downloadedChecksum = createHash("sha256").update(downloaded).digest("hex");
if (downloadedChecksum !== checksumSha256) throw new Error("Object storage checksum mismatch");

const head = await storage.head(storage.assetsBucket, key);
if (head.ContentLength !== bytes.byteLength) throw new Error("Object storage content length mismatch");

await storage.delete(storage.assetsBucket, key);
try {
  await client.send(new GetObjectCommand({ Bucket: storage.assetsBucket, Key: key }));
  throw new Error("Object remained after the deletion check");
} catch (error) {
  const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
  if (status !== 404) throw error;
}

console.info("Private signed upload/download/delete round trip passed with checksum verification.");
