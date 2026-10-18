import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

export const getConnectionInternal = internalQuery({
  args: { userId: v.string(), provider: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("connectorConnections")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", args.provider)
      )
      .first();
  },
});

export const listConnectionsForUserInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("connectorConnections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const upsertConnectionInternal = internalMutation({
  args: {
    userId: v.string(),
    provider: v.string(),
    status: v.union(
      v.literal("connected"),
      v.literal("needs_reauth"),
      v.literal("revoked"),
      v.literal("error")
    ),
    accountLabel: v.optional(v.string()),
    scopes: v.array(v.string()),
    accessTokenEnc: v.string(),
    refreshTokenEnc: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
    metadataJson: v.optional(v.string()),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("connectorConnections")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", args.provider)
      )
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        accountLabel: args.accountLabel,
        scopes: args.scopes,
        accessTokenEnc: args.accessTokenEnc,
        refreshTokenEnc: args.refreshTokenEnc,
        tokenExpiresAt: args.tokenExpiresAt,
        metadataJson: args.metadataJson,
        lastError: args.lastError,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("connectorConnections", {
      userId: args.userId,
      provider: args.provider,
      status: args.status,
      accountLabel: args.accountLabel,
      scopes: args.scopes,
      accessTokenEnc: args.accessTokenEnc,
      refreshTokenEnc: args.refreshTokenEnc,
      tokenExpiresAt: args.tokenExpiresAt,
      metadataJson: args.metadataJson,
      lastError: args.lastError,
      connectedAt: now,
      updatedAt: now,
    });
  },
});

export const markConnectionStatusInternal = internalMutation({
  args: {
    connectionId: v.id("connectorConnections"),
    status: v.union(
      v.literal("connected"),
      v.literal("needs_reauth"),
      v.literal("revoked"),
      v.literal("error")
    ),
    lastError: v.optional(v.string()),
    accessTokenEnc: v.optional(v.string()),
    refreshTokenEnc: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };
    if (args.lastError !== undefined) patch.lastError = args.lastError;
    if (args.accessTokenEnc !== undefined) patch.accessTokenEnc = args.accessTokenEnc;
    if (args.refreshTokenEnc !== undefined) patch.refreshTokenEnc = args.refreshTokenEnc;
    if (args.tokenExpiresAt !== undefined) patch.tokenExpiresAt = args.tokenExpiresAt;
    await ctx.db.patch(args.connectionId, patch);
  },
});

export const deleteConnectionInternal = internalMutation({
  args: { userId: v.string(), provider: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("connectorConnections")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", args.provider)
      )
      .first();
    if (existing) await ctx.db.delete(existing._id);
    return { deleted: Boolean(existing) };
  },
});

export const createOAuthStateInternal = internalMutation({
  args: {
    state: v.string(),
    userId: v.string(),
    provider: v.string(),
    returnPath: v.string(),
    codeVerifier: v.optional(v.string()),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("connectorOAuthStates", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const consumeOAuthStateInternal = internalMutation({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("connectorOAuthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();
    if (!row) return null;
    await ctx.db.delete(row._id);
    if (row.expiresAt < Date.now()) return null;
    return row;
  },
});

export const writeAuditInternal = internalMutation({
  args: {
    userId: v.string(),
    provider: v.string(),
    action: v.string(),
    ok: v.boolean(),
    detail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("connectorAuditLogs", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const createPendingActionInternal = internalMutation({
  args: {
    userId: v.string(),
    provider: v.string(),
    actionType: v.string(),
    payloadJson: v.string(),
    summary: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("connectorPendingActions", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const getPendingActionInternal = internalQuery({
  args: { actionId: v.id("connectorPendingActions") },
  handler: async (ctx, args) => ctx.db.get(args.actionId),
});

export const updatePendingActionInternal = internalMutation({
  args: {
    actionId: v.id("connectorPendingActions"),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("cancelled"),
      v.literal("executed"),
      v.literal("failed")
    ),
    resultJson: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.actionId, {
      status: args.status,
      resultJson: args.resultJson,
      updatedAt: Date.now(),
    });
  },
});
