import { createDatabase } from "@movprompt/db";
import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { createRequestRateLimiter } from "./request-rate-limiter.js";

const databaseUrl = process.env.MOVPROMPT_RATE_LIMIT_DATABASE_URL?.trim();
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres("PostgreSQL request rate limiter", () => {
  const first = createDatabase({ url: databaseUrl!, maxConnections: 4 });
  const second = createDatabase({ url: databaseUrl!, maxConnections: 4 });

  beforeEach(async () => {
    await first.db.execute(sql`DELETE FROM request_rate_limits`);
  });

  afterAll(async () => {
    await Promise.all([first.close(), second.close()]);
  });

  it("atomically admits exactly twenty concurrent public scans across API instances", async () => {
    const limiterOne = createRequestRateLimiter({ database: first.db });
    const limiterTwo = createRequestRateLimiter({ database: second.db });
    const decisions = await Promise.all(
      Array.from({ length: 30 }, (_, index) =>
        (index % 2 === 0 ? limiterOne : limiterTwo).consume({
          action: "public_source_scan",
          subject: "198.51.100.20",
        }),
      ),
    );

    expect(decisions.filter((decision) => decision.allowed)).toHaveLength(20);
    expect(decisions.filter((decision) => !decision.allowed)).toHaveLength(10);
    expect(decisions.every((decision) => decision.retryAfterSeconds >= 1)).toBe(true);
  });
});
