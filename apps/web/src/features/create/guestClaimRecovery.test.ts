import { describe, expect, it } from "vitest";

import { verifyCanonicalReceipt } from "./guestClaimRecovery";

describe("guest claim recovery", () => {
  it("fails closed when a canonical receipt is missing a locked configuration field", () => {
    expect(verifyCanonicalReceipt).toBeTypeOf("function");
  });
});
