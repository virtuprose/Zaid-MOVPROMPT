import { describe, expect, it } from "vitest";

import type { Database } from "../src/client";
import { createGenerationService } from "../src/generation-service";
import type { GenerationDomainError } from "../src/generation-policy";

const serviceWithoutDatabase = createGenerationService({} as Database);

describe("generation service boundary validation", () => {
  it("rejects an unapproved capability before accessing PostgreSQL", async () => {
    await expect(
      serviceWithoutDatabase.createQuote({
        capabilityAlias: "video.kling.latest",
        credits: 10,
        entitlementEligible: false,
        breakdown: [{ label: "generation", credits: 10 }],
        configuration: { duration: 5 },
        expiresAt: new Date(Date.now() + 60_000),
      }),
    ).rejects.toMatchObject({ code: "unapproved_capability" } satisfies Partial<GenerationDomainError>);
  });

  it("rejects a misleading quote breakdown before accessing PostgreSQL", async () => {
    await expect(
      serviceWithoutDatabase.createQuote({
        capabilityAlias: "video.cinematic",
        credits: 20,
        entitlementEligible: false,
        breakdown: [{ label: "generation", credits: 10 }],
        configuration: { duration: 5 },
        expiresAt: new Date(Date.now() + 60_000),
      }),
    ).rejects.toMatchObject({ code: "invalid_quote_breakdown" } satisfies Partial<GenerationDomainError>);
  });
});
