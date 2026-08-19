export interface AuthEnvironment {
  baseUrl: string;
  secret: string;
  trustedOrigins: string[];
  requireEmailVerification: boolean;
  google?: {
    clientId: string;
    clientSecret: string;
  };
  apple?: {
    clientId: string;
    clientSecret: string;
    appBundleIdentifier?: string;
  };
}

function booleanSetting(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: boolean,
): boolean {
  const value = env[key]?.trim().toLowerCase();
  if (!value) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${key} must be true or false`);
}

function optionalPair(
  env: NodeJS.ProcessEnv,
  idKey: string,
  secretKey: string,
): { clientId: string; clientSecret: string } | undefined {
  const clientId = env[idKey]?.trim();
  const clientSecret = env[secretKey]?.trim();
  if (Boolean(clientId) !== Boolean(clientSecret)) {
    throw new Error(`${idKey} and ${secretKey} must be configured together`);
  }
  return clientId && clientSecret ? { clientId, clientSecret } : undefined;
}

export function authEnvironmentFromEnv(env: NodeJS.ProcessEnv = process.env): AuthEnvironment {
  const baseUrl = env.BETTER_AUTH_URL?.trim();
  const secret = env.BETTER_AUTH_SECRET?.trim();
  if (!baseUrl) throw new Error("BETTER_AUTH_URL is required");
  if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");

  let baseOrigin: string;
  try {
    const parsed = new URL(baseUrl);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error("unsupported protocol");
    baseOrigin = parsed.origin;
  } catch {
    throw new Error("BETTER_AUTH_URL must be an absolute HTTP(S) URL");
  }

  const trustedOrigins = new Set([baseOrigin]);
  for (const rawOrigin of (env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(",")) {
    const origin = rawOrigin.trim();
    if (!origin) continue;
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`Invalid trusted origin: ${origin}`);
    }
    if (!/^https?:$/.test(parsed.protocol)) throw new Error(`Trusted origin must use HTTP(S): ${origin}`);
    trustedOrigins.add(parsed.origin);
  }

  const google = optionalPair(env, "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET");
  const appleCredentials = optionalPair(env, "APPLE_CLIENT_ID", "APPLE_CLIENT_SECRET");

  return {
    baseUrl,
    secret,
    trustedOrigins: [...trustedOrigins],
    requireEmailVerification: booleanSetting(
      env,
      "AUTH_REQUIRE_EMAIL_VERIFICATION",
      env.APP_ENV?.trim().toLowerCase() !== "local",
    ),
    google,
    apple: appleCredentials
      ? {
          ...appleCredentials,
          appBundleIdentifier: env.APPLE_APP_BUNDLE_IDENTIFIER?.trim() || undefined,
        }
      : undefined,
  };
}
