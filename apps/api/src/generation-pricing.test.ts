import { describe, expect, it } from "vitest";

import {
  createGenerationPricingFromEnvironment,
  GenerationPricingUnavailableError,
} from "./generation-pricing.js";

function tieredPricing() {
  return createGenerationPricingFromEnvironment({
    GENERATION_PRICING_VERSION: "seedance-25-v1",
    GENERATION_QUOTE_TTL_SECONDS: "900",
    GENERATION_VIDEO_PRODUCT_FIDELITY_480P_CREDITS_PER_SECOND: "5",
    GENERATION_VIDEO_PRODUCT_FIDELITY_720P_CREDITS_PER_SECOND: "11",
  });
}

describe("authoritative resolution-bound generation pricing", () => {
  it("quotes 480p and 720p from distinct server rates", () => {
    const pricing = tieredPricing();
    expect(pricing.price("video.product_fidelity", {
      prompt: "Product reveal",
      durationSeconds: 8,
      resolution: "480p",
    })).toEqual({
      credits: 40,
      breakdown: [{ label: "8 seconds of 480p generated video", credits: 40 }],
    });
    expect(pricing.price("video.product_fidelity", {
      prompt: "Product reveal",
      durationSeconds: 8,
      resolution: "720p",
    })).toEqual({
      credits: 88,
      breakdown: [{ label: "8 seconds of 720p generated video", credits: 88 }],
    });
  });

  it("fails closed when a requested resolution has no configured rate", () => {
    const pricing = createGenerationPricingFromEnvironment({
      GENERATION_PRICING_VERSION: "seedance-25-v1",
      GENERATION_QUOTE_TTL_SECONDS: "900",
      GENERATION_VIDEO_PRODUCT_FIDELITY_720P_CREDITS_PER_SECOND: "11",
    });
    expect(() => pricing.price("video.product_fidelity", {
      prompt: "Product reveal",
      durationSeconds: 8,
      resolution: "480p",
    })).toThrowError(GenerationPricingUnavailableError);
  });

  it("allows a legacy single rate only when its fixed worker resolution matches", () => {
    const pricing = createGenerationPricingFromEnvironment({
      GENERATION_PRICING_VERSION: "legacy-v1",
      GENERATION_QUOTE_TTL_SECONDS: "900",
      GENERATION_VIDEO_FIXED_RESOLUTION: "720p",
      GENERATION_VIDEO_PRODUCT_FIDELITY_CREDITS_PER_SECOND: "10",
    });
    expect(pricing.price("video.product_fidelity", {
      prompt: "Product reveal",
      durationSeconds: 4,
      resolution: "720p",
    }).credits).toBe(40);
    expect(() => pricing.price("video.product_fidelity", {
      prompt: "Product reveal",
      durationSeconds: 4,
      resolution: "480p",
    })).toThrowError(GenerationPricingUnavailableError);
  });
});
