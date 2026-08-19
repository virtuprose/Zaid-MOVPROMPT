import { afterEach, describe, expect, it, vi } from "vitest";

import { enabledSocialAuthProviders, isSocialAuthProviderEnabled } from "./authProviders";

describe("social authentication provider visibility", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails closed when providers are not explicitly enabled", () => {
    expect(isSocialAuthProviderEnabled("google")).toBe(false);
    expect(isSocialAuthProviderEnabled("apple")).toBe(false);
    expect(enabledSocialAuthProviders()).toEqual([]);
  });

  it("returns only explicitly enabled providers", () => {
    vi.stubEnv("VITE_AUTH_GOOGLE_ENABLED", "true");
    vi.stubEnv("VITE_AUTH_APPLE_ENABLED", "false");

    expect(enabledSocialAuthProviders()).toEqual(["google"]);
  });

  it("requires the exact lowercase true value", () => {
    vi.stubEnv("VITE_AUTH_GOOGLE_ENABLED", "TRUE");
    vi.stubEnv("VITE_AUTH_APPLE_ENABLED", "1");

    expect(enabledSocialAuthProviders()).toEqual([]);
  });

  it("can expose both providers after both are explicitly configured", () => {
    vi.stubEnv("VITE_AUTH_GOOGLE_ENABLED", "true");
    vi.stubEnv("VITE_AUTH_APPLE_ENABLED", "true");

    expect(enabledSocialAuthProviders()).toEqual(["google", "apple"]);
  });
});
