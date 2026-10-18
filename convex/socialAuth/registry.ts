/**
 * Social login provider registry.
 * Credentials and callbacks here are for USER AUTHENTICATION only.
 * Never use GOOGLE_CONNECTOR_* / MICROSOFT_CONNECTOR_* / etc.
 */

import type { SocialAuthProvider } from "./types";
import { SOCIAL_AUTH_PROVIDERS } from "./types";

export type SocialProviderConfig = {
  id: SocialAuthProvider;
  label: string;
  authKind: "oidc_id_token" | "oauth2_oidc" | "oauth2";
  requiredEnvKeys: string[];
  scopes: string[];
  setupNotes: string;
};

export const SOCIAL_AUTH_PROVIDER_CONFIGS: SocialProviderConfig[] = [
  {
    id: "google",
    label: "Google",
    authKind: "oidc_id_token",
    requiredEnvKeys: [], // resolved via googleClientIdCandidates (GOOGLE_CLIENT_ID / AUTH_*)
    scopes: ["openid", "email", "profile"],
    setupNotes:
      "Google Identity Services web client. Set GOOGLE_CLIENT_ID on Convex and NEXT_PUBLIC_GOOGLE_CLIENT_ID for the button. Separate from GOOGLE_CONNECTOR_*.",
  },
  {
    id: "apple",
    label: "Apple",
    authKind: "oauth2_oidc",
    requiredEnvKeys: [
      "AUTH_APPLE_CLIENT_ID",
      "AUTH_APPLE_TEAM_ID",
      "AUTH_APPLE_KEY_ID",
      "AUTH_APPLE_PRIVATE_KEY",
    ],
    scopes: ["name", "email"],
    setupNotes:
      "Apple Services ID with Return URL https://<deployment>.convex.site/auth/oauth/callback. Sign in with Apple key (Team ID + Key ID + .p8).",
  },
  {
    id: "microsoft",
    label: "Microsoft",
    authKind: "oauth2_oidc",
    requiredEnvKeys: ["AUTH_MICROSOFT_CLIENT_ID", "AUTH_MICROSOFT_CLIENT_SECRET"],
    scopes: ["openid", "email", "profile", "offline_access"],
    setupNotes:
      "Entra app registration (web) with redirect https://<deployment>.convex.site/auth/oauth/callback. Separate from MICROSOFT_CONNECTOR_*.",
  },
  {
    id: "github",
    label: "GitHub",
    authKind: "oauth2",
    requiredEnvKeys: ["AUTH_GITHUB_CLIENT_ID", "AUTH_GITHUB_CLIENT_SECRET"],
    scopes: ["read:user", "user:email"],
    setupNotes:
      "GitHub OAuth App with Authorization callback URL https://<deployment>.convex.site/auth/oauth/callback.",
  },
];

/** Public GIS / OIDC audience candidates for Google sign-in (never connector client ids). */
export function googleClientIdCandidates(
  env: NodeJS.ProcessEnv = process.env
): string[] {
  const raw = [
    env.GOOGLE_CLIENT_ID,
    env.AUTH_GOOGLE_CLIENT_ID,
    env.AUTH_GOOGLE_ID,
  ]
    .filter(Boolean)
    .join(",");
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function missingEnvKeysForSocialProvider(
  provider: SocialProviderConfig,
  env: NodeJS.ProcessEnv = process.env
): string[] {
  if (provider.id === "google") {
    return googleClientIdCandidates(env).length > 0 ? [] : ["GOOGLE_CLIENT_ID"];
  }
  return provider.requiredEnvKeys.filter((key) => !env[key]?.trim());
}

export function isSocialProviderConfigured(
  provider: SocialProviderConfig,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return missingEnvKeysForSocialProvider(provider, env).length === 0;
}

export function getSocialProviderConfig(
  id: string
): SocialProviderConfig | undefined {
  return SOCIAL_AUTH_PROVIDER_CONFIGS.find((p) => p.id === id);
}

export function convexSiteBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const site =
    env.CONVEX_SITE_URL?.replace(/\/$/, "") ||
    env.NEXT_PUBLIC_CONVEX_SITE_URL?.replace(/\/$/, "");
  if (site) return site;
  const cloud = env.CONVEX_URL?.replace(/\/$/, "") || "";
  if (cloud.includes(".convex.cloud")) {
    return cloud.replace(".convex.cloud", ".convex.site");
  }
  return "";
}

export function frontendBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return env.FRONTEND_URL?.replace(/\/$/, "") || "https://www.giga3ai.com";
}

/** Social login callback — must never equal the connector callback path. */
export function socialOAuthCallbackUrl(
  env: NodeJS.ProcessEnv = process.env
): string {
  const base = convexSiteBaseUrl(env);
  return base ? `${base}/auth/oauth/callback` : "";
}

export function listSocialProviderIds(): SocialAuthProvider[] {
  return [...SOCIAL_AUTH_PROVIDERS];
}
