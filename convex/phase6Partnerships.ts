import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { isPhase6FlagEnabled } from "./phase6Controls";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";
import { RateLimitError } from "./securityErrors";

const PARTNER_TYPES = [
  "school",
  "creator",
  "business",
  "ambassador",
  "community",
] as const;

async function enforcePartnerRate(ctx: { db: any }, key: string) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const existing = await ctx.db
    .query("feedbackRateLimits")
    .withIndex("by_bucket", (q: any) => q.eq("bucketKey", key))
    .first();
  if (!existing || now - existing.windowStartMs >= windowMs) {
    if (existing) await ctx.db.patch(existing._id, { windowStartMs: now, count: 1 });
    else
      await ctx.db.insert("feedbackRateLimits", {
        bucketKey: key,
        windowStartMs: now,
        count: 1,
      });
    return;
  }
  if (existing.count >= 5) throw new RateLimitError();
  await ctx.db.patch(existing._id, { count: existing.count + 1 });
}

/** Partnership interest — stored as waitlist-like feedback rows when tables absent. */
export const submitPartnershipInterest = mutation({
  args: {
    ...sessionArgs,
    partnerType: v.union(
      v.literal("school"),
      v.literal("creator"),
      v.literal("business"),
      v.literal("ambassador"),
      v.literal("community")
    ),
    organizationName: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await isPhase6FlagEnabled(ctx, "phase6.partnerships"))) {
      throw new Error("Partnerships program is not open yet.");
    }
    const userId = await requireSession(args.sessionToken);
    await enforcePartnerRate(ctx, `phase6-partner:${userId}`);

    // Reuse feedback submissions to avoid a new table in this wave.
    const id = await ctx.db.insert("userFeedbackSubmissions", {
      userId,
      type: "feature",
      status: "open",
      title: `Partnership: ${args.partnerType}`,
      body: [
        `Type: ${args.partnerType}`,
        args.organizationName ? `Org: ${args.organizationName}` : null,
        args.notes?.trim() || "Partnership interest via Phase 6.",
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 4000),
      priority: "normal",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { id, partnerTypes: PARTNER_TYPES };
  },
});

export const getPartnershipsProgram = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    if (!(await isPhase6FlagEnabled(ctx, "phase6.partnerships"))) {
      return { enabled: false as const };
    }
    await requireSession(args.sessionToken);
    return {
      enabled: true as const,
      tracks: PARTNER_TYPES.map((id) => ({
        id,
        label:
          id === "ambassador"
            ? "Community ambassador"
            : id.charAt(0).toUpperCase() + id.slice(1) + " partnership",
      })),
      referralExpansion: true,
      abuseControls: ["rate_limit", "session_required", "admin_review"],
    };
  },
});

export const listPartnershipInterestsAdmin = query({
  args: adminCredentialArgs,
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    if (!(await isPhase6FlagEnabled(ctx, "phase6.partnerships"))) {
      return { enabled: false as const, items: [] };
    }
    const rows = await ctx.db
      .query("userFeedbackSubmissions")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .order("desc")
      .take(80);
    const items = rows
      .filter((r) => r.title.startsWith("Partnership:"))
      .slice(0, 40)
      .map((r) => ({
        _id: r._id,
        title: r.title,
        body: r.body.slice(0, 200),
        createdAt: r.createdAt,
      }));
    return { enabled: true as const, items };
  },
});
