import { describe, expect, it } from "vitest";

import { CampaignSourceSchema } from "@movprompt/contracts";

import { normalizeCampaignSource } from "./sourceFacts";

describe("campaign facts", () => {
  it("manual product tracer preserves stable fact values and asset identifiers", () => {
    const source = CampaignSourceSchema.parse({
      kind: "service_manual",
      subject: "product",
      assetKeys: ["creator-assets/user/project/product-image"],
      facts: [
        { field: "name", value: "Northfield No. 07", provenance: "manual" },
      ],
    });

    expect(normalizeCampaignSource(source)).toEqual(source);
  });
});
