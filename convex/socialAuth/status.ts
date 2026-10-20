import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireSession } from "../auth";
import {
  SOCIAL_AUTH_PROVIDER_CONFIGS,
  isSocialProviderConfigured,
  missingEnvKeysForSocialProvider,
  socialOAuthCallbackUrl,
} from "./registry";

/** Ops readiness for social login (key names only — never secret values). */
export const getSocialAuthDeploymentReadiness = query({
  args: {},
  handler: async () => {
    const providers = SOCIAL_AUTH_PROVIDER_CONFIGS.map((provider) => {
      const missingEnvKeys = missingEnvKeysForSocialProvider(provider);
      return {
        id: provider.id,
        label: provider.label,
        authKind: provider.authKind,
        configured: isSocialProviderConfigured(provider),
        missingEnvKeys,
        scopes: provider.scopes,
      };
    });
    return {
      oauthCallbackUrl: socialOAuthCallbackUrl() || null,
      providers,
      readyProviderCount: providers.filter((p) => p.configured).length,
      needsConfigurationCount: providers.filter((p) => !p.configured).length,
      note: "Social login credentials must stay separate from *_CONNECTOR_* secrets.",
    };
  },
});

/** Linked providers for the signed-in user (no tokens). */
export const listLinkedSocialProviders = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    let userId: string;
    try {
      userId = await requireSession(args.sessionToken, ctx);
    } catch {
      return { authenticated: false, providers: [] as string[] };
    }
    const rows = await ctx.db
      .query("authProviderIdentities")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const providers = new Set(rows.map((r) => r.provider));
    // Legacy Google GIS link on users.googleSub
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", userId))
      .first();
    if (user?.googleSub) providers.add("google");
    return { authenticated: true, providers: [...providers] };
  },
});
