import { describe, expect, it } from "vitest";

import { CampaignSourceSchema } from "./creator.js";

describe("creator contracts", () => {
  it("accepts durable campaign source identifiers but rejects browser and signed URLs", () => {
    expect(CampaignSourceSchema.parse({
      kind: "service_manual",
      subject: "product",
      assetKeys: ["creator-assets/user/project/product-image"],
      facts: [{ field: "name", value: "Northfield No. 07", provenance: "manual" }],
    })).toMatchObject({ subject: "product" });

    expect(() => CampaignSourceSchema.parse({
      kind: "product_upload",
      subject: "product",
      assetKeys: ["blob:https://movprompt.test/preview"],
      facts: [],
    })).toThrow();
  });
});
