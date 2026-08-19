import { describe, expect, it } from "vitest";

import { authEnvironmentFromEnv } from "../src/config";

const base = {
  BETTER_AUTH_URL: "https://app.movprompt.test",
  BETTER_AUTH_SECRET: "a-secure-auth-secret-with-more-than-32-characters",
};

describe("Better Auth environment", () => {
  it("enables only completely configured OAuth providers", () => {
    const config = authEnvironmentFromEnv({
      ...base,
      BETTER_AUTH_TRUSTED_ORIGINS: "https://www.movprompt.test,http://127.0.0.1:8080",
      GOOGLE_CLIENT_ID: "google-client",
      GOOGLE_CLIENT_SECRET: "google-secret",
    });

    expect(config.google?.clientId).toBe("google-client");
    expect(config.apple).toBeUndefined();
    expect(config.trustedOrigins).toContain("https://app.movprompt.test");
    expect(config.trustedOrigins).toContain("http://127.0.0.1:8080");
    expect(config.requireEmailVerification).toBe(true);
  });

  it("allows local private beta to defer email verification", () => {
    const config = authEnvironmentFromEnv({
      ...base,
      APP_ENV: "local",
      AUTH_REQUIRE_EMAIL_VERIFICATION: "false",
    });

    expect(config.requireEmailVerification).toBe(false);
  });

  it("rejects an invalid email verification policy", () => {
    expect(() => authEnvironmentFromEnv({
      ...base,
      AUTH_REQUIRE_EMAIL_VERIFICATION: "later",
    })).toThrow(/must be true or false/);
  });

  it("rejects partially configured providers", () => {
    expect(() => authEnvironmentFromEnv({ ...base, APPLE_CLIENT_ID: "services-id" })).toThrow(
      /configured together/,
    );
  });
});
