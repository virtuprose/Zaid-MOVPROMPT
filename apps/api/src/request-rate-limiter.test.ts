import { describe, expect, it, vi } from "vitest";

import {
  createRequestRateLimiter,
  resolveTrustedClientIp,
} from "./request-rate-limiter.js";

describe("request rate limiter", () => {
  it("uses the direct socket address when no trusted proxy hops are configured", () => {
    expect(
      resolveTrustedClientIp({
        headers: new Headers({
          forwarded: "for=198.51.100.88",
          "x-forwarded-for": "198.51.100.89",
        }),
        directAddress: "203.0.113.10",
        trustedProxyHops: 0,
      }),
    ).toBe("203.0.113.10");
  });

  it("uses only the documented client hop behind configured proxies", () => {
    expect(
      resolveTrustedClientIp({
        headers: new Headers({ "x-forwarded-for": "198.51.100.44, 198.51.100.45" }),
        directAddress: "203.0.113.10",
        trustedProxyHops: 2,
      }),
    ).toBe("198.51.100.44");
  });

  it("returns the PostgreSQL decision with an accurate retry window", async () => {
    const execute = vi.fn(async () => [{ allowed: false, retry_after_seconds: 117 }]);
    const limiter = createRequestRateLimiter({ database: { execute } as never });

    await expect(
      limiter.consume({ action: "public_source_scan", subject: "203.0.113.10" }),
    ).resolves.toEqual({ allowed: false, retryAfterSeconds: 117 });
    expect(execute).toHaveBeenCalledOnce();
  });
});
