import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

const providerValidator = v.union(
  v.literal("google"),
  v.literal("apple"),
  v.literal("microsoft"),
  v.literal("github")
);

export const getIdentityBySubjectInternal = internalQuery({
  args: {
    provider: providerValidator,
    subject: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("authProviderIdentities")
      .withIndex("by_provider_subject", (q) =>
        q.eq("provider", args.provider).eq("subject", args.subject.trim())
      )
      .first();
  },
});

export const getIdentityForUserProviderInternal = internalQuery({
  args: {
    userId: v.string(),
    provider: providerValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("authProviderIdentities")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", args.userId.trim().toLowerCase()).eq("provider", args.provider)
      )
      .first();
  },
});

export const listIdentitiesForUserInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("authProviderIdentities")
      .withIndex("by_user", (q) => q.eq("userId", args.userId.trim().toLowerCase()))
      .collect();
  },
});

export const upsertIdentityInternal = internalMutation({
  args: {
    provider: providerValidator,
    subject: v.string(),
    userId: v.string(),
    emailAtLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const subject = args.subject.trim();
    const userId = args.userId.trim().toLowerCase();
    const now = Date.now();
    const existing = await ctx.db
      .query("authProviderIdentities")
      .withIndex("by_provider_subject", (q) =>
        q.eq("provider", args.provider).eq("subject", subject)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        userId,
        lastLoginAt: now,
        ...(args.emailAtLink ? { emailAtLink: args.emailAtLink.trim().toLowerCase() } : {}),
      });
      return existing._id;
    }
    return await ctx.db.insert("authProviderIdentities", {
      provider: args.provider,
      subject,
      userId,
      emailAtLink: args.emailAtLink?.trim().toLowerCase(),
      createdAt: now,
      lastLoginAt: now,
    });
  },
});

export const createOAuthStateInternal = internalMutation({
  args: {
    state: v.string(),
    provider: providerValidator,
    returnPath: v.string(),
    codeVerifier: v.optional(v.string()),
    nonce: v.optional(v.string()),
    linkUserId: v.optional(v.string()),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("authOAuthStates", {
      state: args.state,
      provider: args.provider,
      returnPath: args.returnPath,
      codeVerifier: args.codeVerifier,
      nonce: args.nonce,
      linkUserId: args.linkUserId?.trim().toLowerCase(),
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
    });
  },
});

export const consumeOAuthStateInternal = internalMutation({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("authOAuthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();
    if (!row) return null;
    await ctx.db.delete(row._id);
    if (row.expiresAt < Date.now()) return null;
    return row;
  },
});

export const createExchangeCodeInternal = internalMutation({
  args: {
    code: v.string(),
    email: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("authExchangeCodes", {
      code: args.code,
      email: args.email.trim().toLowerCase(),
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
    });
  },
});

export const consumeExchangeCodeInternal = internalMutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("authExchangeCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
    if (!row) return null;
    if (row.consumedAt || row.expiresAt < Date.now()) {
      await ctx.db.delete(row._id);
      return null;
    }
    await ctx.db.patch(row._id, { consumedAt: Date.now() });
    await ctx.db.delete(row._id);
    return { email: row.email };
  },
});
