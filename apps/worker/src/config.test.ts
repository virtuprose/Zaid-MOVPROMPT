import { describe, expect, it } from "vitest";
import { loadWorkerConfig } from "./config.js";

describe("worker configuration", () => {
  it("prefers the direct database URL used by infrastructure", () => {
    const config = loadWorkerConfig({
      DATABASE_URL_DIRECT: "postgres://preferred",
      DATABASE_DIRECT_URL: "postgres://legacy",
      WORKER_ID: "worker-1",
    });

    expect(config.databaseUrl).toBe("postgres://preferred");
    expect(config.outboxBatchSize).toBe(20);
    expect(config.outboxLeaseMs).toBe(60_000);
    expect(config.outboxPollIntervalMs).toBe(1_000);
    expect(config.renderReconciliationDelaySeconds).toBe(15);
    expect(config.heartbeatIntervalSeconds).toBe(15);
  });

  it("accepts the temporary legacy environment name", () => {
    const config = loadWorkerConfig({
      DATABASE_DIRECT_URL: "postgres://legacy",
      WORKER_ID: "worker-1",
    });

    expect(config.databaseUrl).toBe("postgres://legacy");
  });

  it("fails fast without a direct database connection", () => {
    expect(() => loadWorkerConfig({})).toThrow("DATABASE_URL_DIRECT is required");
  });

  it("validates durable worker timing controls", () => {
    expect(() =>
      loadWorkerConfig({
        DATABASE_URL_DIRECT: "postgres://database",
        WORKER_OUTBOX_LEASE_MS: "0",
      }),
    ).toThrow("WORKER_OUTBOX_LEASE_MS must be a positive integer");
  });
});
