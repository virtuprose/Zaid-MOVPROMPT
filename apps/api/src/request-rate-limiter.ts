import { createHash } from "node:crypto";

import type { Database } from "@movprompt/db";
import { sql } from "drizzle-orm";

export const DEFAULT_PUBLIC_SCAN_LIMIT = 20;
export const DEFAULT_AUTHENTICATED_MIRROR_LIMIT = 50;
export const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 10 * 60;

export type RequestRateAction = "public_source_scan" | "authenticated_remote_image_mirror";

type RateLimitDatabase = Pick<Database, "execute">;

export type RequestRateLimiterOptions = {
  database: RateLimitDatabase;
  publicScanLimit?: number;
  authenticatedMirrorLimit?: number;
  windowSeconds?: number;
  trustedProxyHops?: number;
};

export type TrustedClientIpInput = {
  headers: Headers;
  directAddress?: string | null;
  trustedProxyHops: number;
};

export type RequestRateLimiter = {
  consume(input: { action: RequestRateAction; subject: string }): Promise<{
    allowed: boolean;
    retryAfterSeconds: number;
  }>;
  consumePublicScan(input: { headers: Headers; directAddress?: string | null }): Promise<{
    allowed: boolean;
    retryAfterSeconds: number;
  }>;
  consumeAuthenticatedMirror(userId: string): Promise<{
    allowed: boolean;
    retryAfterSeconds: number;
  }>;
};

function positiveInteger(value: number, label: string, maximum: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${label} must be an integer between 1 and ${maximum}.`);
  }
  return value;
}

function normalizedIp(value: string): string | null {
  const trimmed = value.trim().replace(/^"|"$/g, "");
  if (!trimmed || /[\r\n]/.test(trimmed)) return null;
  const bracketed = trimmed.match(/^\[([^\]]+)\](?::\d+)?$/)?.[1];
  return (bracketed ?? trimmed).toLowerCase();
}

function forwardedValues(headers: Headers): string[] {
  const forwarded = headers.get("forwarded");
  if (forwarded) {
    const values = forwarded
      .split(",")
      .map((part) => part.split(";").find((parameter) => parameter.trim().toLowerCase().startsWith("for=")))
      .map((parameter) => parameter?.slice(parameter.indexOf("=") + 1) ?? "")
      .map(normalizedIp);
    if (values.length > 0 && values.every((value): value is string => value !== null)) return values;
  }
  return (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map(normalizedIp)
    .filter((value): value is string => value !== null);
}

export function resolveTrustedClientIp(input: TrustedClientIpInput): string {
  const directAddress = normalizedIp(input.directAddress ?? "") ?? "unknown-direct-client";
  if (input.trustedProxyHops === 0) return directAddress;

  const forwarded = forwardedValues(input.headers);
  const selected = forwarded[forwarded.length - input.trustedProxyHops];
  return selected ?? directAddress;
}

function hashSubject(subject: string): string {
  return createHash("sha256").update("movprompt-rate-limit-v1\0").update(subject).digest("hex");
}

export function createRequestRateLimiter(options: RequestRateLimiterOptions): RequestRateLimiter {
  const publicScanLimit = positiveInteger(
    options.publicScanLimit ?? DEFAULT_PUBLIC_SCAN_LIMIT,
    "Public source scan limit",
    100000,
  );
  const authenticatedMirrorLimit = positiveInteger(
    options.authenticatedMirrorLimit ?? DEFAULT_AUTHENTICATED_MIRROR_LIMIT,
    "Authenticated image mirror limit",
    100000,
  );
  const windowSeconds = positiveInteger(
    options.windowSeconds ?? DEFAULT_RATE_LIMIT_WINDOW_SECONDS,
    "Rate-limit window",
    86400,
  );
  const trustedProxyHops = options.trustedProxyHops ?? 0;
  if (!Number.isSafeInteger(trustedProxyHops) || trustedProxyHops < 0 || trustedProxyHops > 32) {
    throw new Error("Trusted proxy hops must be an integer between 0 and 32.");
  }

  async function consume(input: { action: RequestRateAction; subject: string }) {
    const maximum = input.action === "public_source_scan" ? publicScanLimit : authenticatedMirrorLimit;
    const rows = await options.database.execute<{
      allowed: boolean;
      retry_after_seconds: number;
    }>(sql`
      SELECT "allowed", "retry_after_seconds"
      FROM "consume_request_rate_limit"(
        ${hashSubject(input.subject)},
        ${input.action},
        ${windowSeconds},
        ${maximum}
      )
    `);
    const decision = rows[0];
    if (!decision || typeof decision.allowed !== "boolean" || !Number.isSafeInteger(decision.retry_after_seconds)) {
      throw new Error("PostgreSQL rate-limit operation returned an invalid decision.");
    }
    return { allowed: decision.allowed, retryAfterSeconds: Math.max(1, decision.retry_after_seconds) };
  }

  return {
    consume,
    consumePublicScan(input) {
      return consume({
        action: "public_source_scan",
        subject: resolveTrustedClientIp({ ...input, trustedProxyHops }),
      });
    },
    consumeAuthenticatedMirror(userId) {
      return consume({ action: "authenticated_remote_image_mirror", subject: userId });
    },
  };
}
