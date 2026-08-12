import { describe, expect, it } from "vitest";
import {
  CapabilityRegistry,
  CapabilityResolutionError,
  createCapabilityRegistryFromEnvironment,
} from "./capability-registry.js";

describe("CapabilityRegistry", () => {
  it("resolves configured approved aliases", () => {
    const registry = new CapabilityRegistry({
      "video.cinematic": {
        enabled: true,
        adapterId: "approved-seedance-adapter",
        providerModelId: "server-private-model-id",
      },
    });

    expect(registry.resolve("video.cinematic", "video")).toEqual({
      alias: "video.cinematic",
      kind: "video",
      adapterId: "approved-seedance-adapter",
      providerModelId: "server-private-model-id",
    });
  });

  it("rejects raw provider IDs and unknown families", () => {
    const registry = new CapabilityRegistry();

    for (const value of ["seedance-2.0-ref", "video.kling.latest", "fal-ai/veo3"]) {
      expect(() => registry.resolve(value)).toThrowError(CapabilityResolutionError);
    }
  });

  it("never exposes provider configuration in the public list", () => {
    const registry = new CapabilityRegistry({
      "image.product": {
        enabled: true,
        adapterId: "google",
        providerModelId: "private-model-id",
      },
    });

    const serialized = JSON.stringify(registry.listPublic());
    expect(serialized).not.toContain("google");
    expect(serialized).not.toContain("private-model-id");
    expect(serialized).toContain("image.product");
  });

  it("fails closed when environment configuration is incomplete", () => {
    const registry = createCapabilityRegistryFromEnvironment({
      MOVPROMPT_CAPABILITY_VIDEO_PRODUCT_FIDELITY_ENABLED: "true",
      MOVPROMPT_CAPABILITY_VIDEO_PRODUCT_FIDELITY_ADAPTER_ID: "product-video",
    });

    expect(
      registry.listPublic().find((item) => item.alias === "video.product_fidelity")?.available,
    ).toBe(false);
    expect(() => registry.resolve("video.product_fidelity")).toThrowError(
      "capability_unavailable",
    );
  });
});
