import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { isPhase6FlagEnabled } from "./phase6Controls";

const SUPPORTED = ["GH", "NG", "KE", "ZA", "UG", "TZ", "RW", "CI", "SN", "EG"] as const;

const REGION_META: Record<
  string,
  { name: string; timeZone: string; locale: string; currency: string }
> = {
  GH: { name: "Ghana", timeZone: "Africa/Accra", locale: "en-GH", currency: "GHS" },
  NG: { name: "Nigeria", timeZone: "Africa/Lagos", locale: "en-NG", currency: "NGN" },
  KE: { name: "Kenya", timeZone: "Africa/Nairobi", locale: "en-KE", currency: "KES" },
  ZA: {
    name: "South Africa",
    timeZone: "Africa/Johannesburg",
    locale: "en-ZA",
    currency: "ZAR",
  },
  UG: { name: "Uganda", timeZone: "Africa/Kampala", locale: "en-UG", currency: "UGX" },
  TZ: {
    name: "Tanzania",
    timeZone: "Africa/Dar_es_Salaam",
    locale: "en-TZ",
    currency: "TZS",
  },
  RW: { name: "Rwanda", timeZone: "Africa/Kigali", locale: "en-RW", currency: "RWF" },
  CI: { name: "Côte d’Ivoire", timeZone: "Africa/Abidjan", locale: "fr-CI", currency: "XOF" },
  SN: { name: "Senegal", timeZone: "Africa/Dakar", locale: "fr-SN", currency: "XOF" },
  EG: { name: "Egypt", timeZone: "Africa/Cairo", locale: "en-EG", currency: "EGP" },
};

function readPrefs(raw?: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Public region catalog (flag-gated). */
export const listRegions = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isPhase6FlagEnabled(ctx, "phase6.multi_region"))) {
      return { enabled: false as const, regions: [] };
    }
    return {
      enabled: true as const,
      regions: SUPPORTED.map((id) => ({ id, ...REGION_META[id]! })),
      defaultRegion: "GH",
    };
  },
});

/** Current user's region preference (stored in userPreferences JSON — no schema change). */
export const getMyRegionPreference = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    if (!(await isPhase6FlagEnabled(ctx, "phase6.multi_region"))) {
      return { enabled: false as const };
    }
    const email = await requireSession(args.sessionToken);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    const prefs = readPrefs(user?.userPreferences);
    const regionId =
      typeof prefs.regionId === "string" && SUPPORTED.includes(prefs.regionId as any)
        ? (prefs.regionId as string)
        : "GH";
    const meta = REGION_META[regionId]!;
    return {
      enabled: true as const,
      regionId,
      ...meta,
      onboardingHint: `Localized for ${meta.name} (${meta.timeZone}).`,
    };
  },
});

export const setMyRegionPreference = mutation({
  args: {
    ...sessionArgs,
    regionId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!(await isPhase6FlagEnabled(ctx, "phase6.multi_region"))) {
      throw new Error("Multi-region preferences are not enabled.");
    }
    const email = await requireSession(args.sessionToken);
    if (!SUPPORTED.includes(args.regionId as (typeof SUPPORTED)[number])) {
      throw new Error("Unsupported region.");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) throw new Error("User not found.");
    const prefs = readPrefs(user.userPreferences);
    prefs.regionId = args.regionId;
    await ctx.db.patch(user._id, {
      userPreferences: JSON.stringify(prefs),
    });
    return { ok: true, regionId: args.regionId };
  },
});

/** Regional discovery hints — aggregates public posts by recent activity (no PII). */
export const getRegionalDiscovery = query({
  args: {
    ...sessionArgs,
    regionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await isPhase6FlagEnabled(ctx, "phase6.multi_region"))) {
      return { enabled: false as const };
    }
    await requireSession(args.sessionToken);
    const regionId =
      args.regionId && SUPPORTED.includes(args.regionId as any) ? args.regionId : "GH";
    const posts = await ctx.db
      .query("socialPosts")
      .withIndex("by_created")
      .order("desc")
      .take(40);
    const trending = posts
      .filter((p) => !p.deletedAt)
      .slice(0, 8)
      .map((p) => ({
        postId: p._id,
        excerpt: p.body.slice(0, 120),
        likeCount: p.likeCount,
        commentCount: p.commentCount,
      }));
    return {
      enabled: true as const,
      regionId,
      regionName: REGION_META[regionId]?.name ?? regionId,
      trending,
      note: "Trending is platform-wide until per-region tags are adopted; region preference still drives onboarding/TZ.",
    };
  },
});
