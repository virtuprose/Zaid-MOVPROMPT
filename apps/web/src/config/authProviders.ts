export type SocialAuthProvider = "google" | "apple";

const providerEnvNames: Record<SocialAuthProvider, string> = {
  google: "VITE_AUTH_GOOGLE_ENABLED",
  apple: "VITE_AUTH_APPLE_ENABLED",
};

export function isSocialAuthProviderEnabled(provider: SocialAuthProvider) {
  return import.meta.env[providerEnvNames[provider]] === "true";
}

export function enabledSocialAuthProviders(): SocialAuthProvider[] {
  return (["google", "apple"] as const).filter(isSocialAuthProviderEnabled);
}
