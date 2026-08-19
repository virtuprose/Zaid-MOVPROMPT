import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabase } from "../src/client.js";
import { createServiceHeartbeatRepository } from "../src/service-heartbeat.js";

const integrationUrl = process.env.MOVPROMPT_TEST_DATABASE_URL;
const describePostgres = integrationUrl ? describe.sequential : describe.skip;

describePostgres("service heartbeat PostgreSQL repository", () => {
  let database: ReturnType<typeof createDatabase>;

  beforeAll(() => {
    database = createDatabase({
      url: integrationUrl!,
      maxConnections: 2,
      applicationName: "movprompt-heartbeat-test",
    });
  });

  afterAll(async () => {
    await database.close();
  });

  it("returns only a fresh ready worker and removes its shutdown record", async () => {
    const repository = createServiceHeartbeatRepository(database.db);
    const serviceName = `test-worker-${randomUUID()}`;
    const instanceId = randomUUID();
    const now = new Date("2026-08-15T00:00:00.000Z");

    await repository.beat({
      serviceName,
      instanceId,
      status: "ready",
      metadata: { generationReady: true, configurationFingerprint: "fingerprint" },
      now,
    });
    await expect(repository.findFreshReady({ serviceName, maxAgeSeconds: 45, now }))
      .resolves.toMatchObject({
        instanceId,
        metadata: { generationReady: true, configurationFingerprint: "fingerprint" },
      });

    await expect(repository.findFreshReady({
      serviceName,
      maxAgeSeconds: 45,
      now: new Date(now.getTime() + 46_000),
    })).resolves.toBeNull();

    await repository.beat({ serviceName, instanceId, status: "stopping", now });
    await expect(repository.findFreshReady({ serviceName, maxAgeSeconds: 45, now }))
      .resolves.toBeNull();

    await repository.remove({ serviceName, instanceId });
    await expect(repository.findFreshReady({ serviceName, maxAgeSeconds: 45, now }))
      .resolves.toBeNull();
  });
});
