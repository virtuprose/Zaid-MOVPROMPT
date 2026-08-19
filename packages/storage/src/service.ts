import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type HeadObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { assertStorageKey } from "./keys.js";
import {
  validateUploadMetadata,
  type UploadMetadata,
  type UploadValidationPolicy,
  type ValidatedUploadMetadata,
} from "./validation.js";

export interface ObjectStorageConfig {
  endpoint?: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  assetsBucket: string;
  outputsBucket: string;
  previewsBucket?: string;
  forcePathStyle?: boolean;
  uploadUrlTtlSeconds?: number;
  downloadUrlTtlSeconds?: number;
}

export interface SignUploadRequest {
  bucket: string;
  key: string;
  metadata: UploadMetadata;
  validation?: UploadValidationPolicy;
  expiresInSeconds?: number;
}

export interface SignedUpload {
  method: "PUT";
  url: string;
  bucket: string;
  key: string;
  expiresInSeconds: number;
  headers: Record<string, string>;
  metadata: ValidatedUploadMetadata;
}

export interface SignedDownload {
  method: "GET";
  url: string;
  bucket: string;
  key: string;
  expiresInSeconds: number;
}

export interface PutPrivateObjectRequest {
  bucket: string;
  key: string;
  body: Uint8Array;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface GetPrivateObjectRequest {
  bucket: string;
  key: string;
  /** Hard allocation/streaming limit enforced even without Content-Length. */
  maxBytes: number;
}

export interface PrivateObjectBytes {
  body: Uint8Array;
  contentType?: string;
  checksumSha256?: string;
}

const MAX_SERVER_READ_BYTES = 64 * 1024 * 1024;

function assertServerReadLimit(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_SERVER_READ_BYTES) {
    throw new Error("Private object read limit must be between 1 byte and 64 MiB");
  }
  return value;
}

async function boundedBodyBytes(body: unknown, maxBytes: number): Promise<Uint8Array> {
  if (!body || typeof body !== "object" || !(Symbol.asyncIterator in body)) {
    throw new Error("Private object body is not readable");
  }
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    for await (const raw of body as AsyncIterable<Uint8Array | string>) {
      const chunk = typeof raw === "string" ? Buffer.from(raw) : new Uint8Array(raw);
      totalBytes += chunk.byteLength;
      if (totalBytes > maxBytes) throw new Error("Private object exceeds the configured read limit");
      chunks.push(chunk);
    }
  } catch (error) {
    const destroy = (body as { destroy?: (error?: Error) => void }).destroy;
    if (typeof destroy === "function") destroy.call(body, error instanceof Error ? error : undefined);
    throw error;
  }
  if (!totalBytes) throw new Error("Private object body is empty");
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function requireEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function positiveInteger(value: string | undefined, fallback: number, label: string): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${label} must be a positive integer`);
  return parsed;
}

export function objectStorageConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ObjectStorageConfig {
  return {
    endpoint: env.S3_ENDPOINT?.trim() || undefined,
    region: env.S3_REGION?.trim() || "auto",
    accessKeyId: requireEnv(env, "S3_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv(env, "S3_SECRET_ACCESS_KEY"),
    assetsBucket: requireEnv(env, "S3_ASSETS_BUCKET"),
    outputsBucket: requireEnv(env, "S3_OUTPUTS_BUCKET"),
    previewsBucket: env.S3_PREVIEWS_BUCKET?.trim() || undefined,
    forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
    uploadUrlTtlSeconds: positiveInteger(env.S3_UPLOAD_URL_TTL_SECONDS, 900, "S3_UPLOAD_URL_TTL_SECONDS"),
    downloadUrlTtlSeconds: positiveInteger(
      env.S3_DOWNLOAD_URL_TTL_SECONDS,
      900,
      "S3_DOWNLOAD_URL_TTL_SECONDS",
    ),
  };
}

export class PrivateObjectStorage {
  readonly assetsBucket: string;
  readonly outputsBucket: string;
  readonly previewsBucket?: string;

  private readonly client: S3Client;
  private readonly uploadUrlTtlSeconds: number;
  private readonly downloadUrlTtlSeconds: number;
  private readonly allowedBuckets: ReadonlySet<string>;

  constructor(private readonly config: ObjectStorageConfig, client?: S3Client) {
    this.assetsBucket = config.assetsBucket;
    this.outputsBucket = config.outputsBucket;
    this.previewsBucket = config.previewsBucket;
    this.uploadUrlTtlSeconds = config.uploadUrlTtlSeconds ?? 900;
    this.downloadUrlTtlSeconds = config.downloadUrlTtlSeconds ?? 900;
    this.allowedBuckets = new Set(
      [config.assetsBucket, config.outputsBucket, config.previewsBucket].filter((bucket): bucket is string => Boolean(bucket)),
    );
    this.client =
      client ??
      new S3Client({
        endpoint: config.endpoint,
        region: config.region,
      credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
        forcePathStyle: config.forcePathStyle ?? false,
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
      });
  }

  async checkBucket(bucket: string): Promise<void> {
    if (!this.allowedBuckets.has(bucket)) throw new Error("Storage bucket is not allowed");
    await this.client.send(new HeadBucketCommand({ Bucket: bucket }));
  }

  async signUpload(input: SignUploadRequest): Promise<SignedUpload> {
    this.assertBucket(input.bucket);
    const key = assertStorageKey(input.key);
    const metadata = validateUploadMetadata(input.metadata, input.validation);
    const expiresInSeconds = this.validateTtl(input.expiresInSeconds ?? this.uploadUrlTtlSeconds);

    const command = new PutObjectCommand({
      Bucket: input.bucket,
      Key: key,
      ContentType: metadata.mimeType,
      Metadata: {
        "sha256-hex": metadata.checksumSha256,
      },
    });

    const url = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    return {
      method: "PUT",
      url,
      bucket: input.bucket,
      key,
      expiresInSeconds,
      headers: {
        // Custom metadata is encoded into the presigned query. Content-Type is
        // intentionally returned so browsers persist the MIME type that the
        // API verifies before the asset can be downloaded.
        "content-type": metadata.mimeType,
      },
      metadata,
    };
  }

  async signDownload(input: {
    bucket: string;
    key: string;
    expiresInSeconds?: number;
    downloadFilename?: string;
  }): Promise<SignedDownload> {
    this.assertBucket(input.bucket);
    const key = assertStorageKey(input.key);
    const expiresInSeconds = this.validateTtl(input.expiresInSeconds ?? this.downloadUrlTtlSeconds);
    const command = new GetObjectCommand({
      Bucket: input.bucket,
      Key: key,
      ResponseContentDisposition: input.downloadFilename
        ? `attachment; filename*=UTF-8''${encodeURIComponent(input.downloadFilename)}`
        : undefined,
    });
    const url = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    return { method: "GET", url, bucket: input.bucket, key, expiresInSeconds };
  }

  /**
   * Server-side writes used by trusted workers. Browser uploads continue to
   * use signUpload so untrusted clients never receive storage credentials.
   */
  async put(input: PutPrivateObjectRequest): Promise<{ bucket: string; key: string }> {
    this.assertBucket(input.bucket);
    const key = assertStorageKey(input.key);
    if (!input.body.byteLength) throw new Error("Object body must not be empty");
    const contentType = input.contentType.trim().toLowerCase();
    if (!contentType || contentType.length > 255) throw new Error("Invalid object content type");
    const metadata = Object.fromEntries(
      Object.entries(input.metadata ?? {}).map(([name, value]) => {
        const normalizedName = name.trim().toLowerCase();
        const normalizedValue = value.trim();
        if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(normalizedName) || !normalizedValue || normalizedValue.length > 1_024) {
          throw new Error("Invalid object metadata");
        }
        return [normalizedName, normalizedValue];
      }),
    );
    await this.client.send(new PutObjectCommand({
      Bucket: input.bucket,
      Key: key,
      Body: input.body,
      ContentLength: input.body.byteLength,
      ContentType: contentType,
      Metadata: metadata,
    }));
    return { bucket: input.bucket, key };
  }

  /** Trusted worker read that never exposes a signed storage URL. */
  async get(input: GetPrivateObjectRequest): Promise<PrivateObjectBytes> {
    this.assertBucket(input.bucket);
    const key = assertStorageKey(input.key);
    const maxBytes = assertServerReadLimit(input.maxBytes);
    const object = await this.client.send(new GetObjectCommand({ Bucket: input.bucket, Key: key }));
    const declaredLength = object.ContentLength;
    if (declaredLength !== undefined && declaredLength > maxBytes) {
      const destroy = (object.Body as { destroy?: (error?: Error) => void } | undefined)?.destroy;
      if (typeof destroy === "function") {
        destroy.call(object.Body, new Error("Private object exceeds the configured read limit"));
      }
      throw new Error("Private object exceeds the configured read limit");
    }
    const body = await boundedBodyBytes(object.Body, maxBytes);
    const contentType = object.ContentType?.split(";", 1)[0]?.trim().toLowerCase();
    const checksumSha256 = object.Metadata?.["sha256-hex"]?.trim().toLowerCase();
    return {
      body,
      ...(contentType ? { contentType } : {}),
      ...(checksumSha256 ? { checksumSha256 } : {}),
    };
  }

  async head(bucket: string, key: string): Promise<HeadObjectCommandOutput> {
    this.assertBucket(bucket);
    return this.client.send(new HeadObjectCommand({ Bucket: bucket, Key: assertStorageKey(key) }));
  }

  async delete(bucket: string, key: string): Promise<void> {
    this.assertBucket(bucket);
    await this.client.send(new DeleteObjectCommand({ Bucket: bucket, Key: assertStorageKey(key) }));
  }

  private assertBucket(bucket: string): void {
    if (!this.allowedBuckets.has(bucket)) throw new Error("Bucket is not managed by MovPrompt storage");
  }

  private validateTtl(ttl: number): number {
    if (!Number.isInteger(ttl) || ttl < 1 || ttl > 3600) {
      throw new Error("Signed URL lifetime must be between 1 and 3600 seconds");
    }
    return ttl;
  }
}
