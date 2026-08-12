const AUTH_RETURN_INTENT_KEY = "movprompt.auth.return-intent.v1";

/** Only an in-app path may be used after authentication. */
export function safeAuthReturnPath(value: string | null | undefined, fallback = "/create"): string {
  if (!value) return fallback;
  const candidate = value.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) return fallback;
  try {
    const parsed = new URL(candidate, window.location.origin);
    if (parsed.origin !== window.location.origin) return fallback;
    if (parsed.pathname === "/auth" || parsed.pathname === "/reset-password") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
export function rememberAuthReturnIntent(path: string): string {
  const safePath = safeAuthReturnPath(path);
  try {
    sessionStorage.setItem(AUTH_RETURN_INTENT_KEY, safePath);
  } catch {
    // Redirect still carries the callback URL; storage is recovery only.
  }
  return safePath;
}

export function readAuthReturnIntent(fallback = "/create"): string {
  try {
    return safeAuthReturnPath(sessionStorage.getItem(AUTH_RETURN_INTENT_KEY), fallback);
  } catch {
    return fallback;
  }
}

export function consumeAuthReturnIntent(fallback = "/create"): string {
  const path = readAuthReturnIntent(fallback);
  try {
    sessionStorage.removeItem(AUTH_RETURN_INTENT_KEY);
  } catch {
    // Non-fatal in privacy-restricted browsers.
  }
  return path;
}

export function authCallbackUrl(path: string): string {
  const safePath = rememberAuthReturnIntent(path);
  const callback = new URL("/auth/callback", window.location.origin);
  callback.searchParams.set("next", safePath);
  return callback.toString();
}
