import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { requireEntitlementForEmail } from "./entitlements";
import { sessionArgs } from "./validators";

export const API_KEY_SCOPES = [
  "chat:read",
  "chat:write",
  "gigalearn:read",
  "gigalearn:write",
  "media:read",
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export const listMyKeys = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const rows = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .order("desc")
      .take(20);

    return rows.map((row) => ({
      id: row._id,
      label: row.label,
      keyPrefix: row.keyPrefix,
      scopes: row.scopes,
      createdAt: row.createdAt,
      revokedAt: row.revokedAt,
      lastUsedAt: row.lastUsedAt,
    }));
  },
});

export const revokeKey = mutation({
  args: {
    sessionToken: v.string(),
    keyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const row = await ctx.db.get(args.keyId);
    if (!row || row.userId !== email) throw new Error("API key not found");
    if (row.revokedAt) return;
    await ctx.db.patch(args.keyId, { revokedAt: Date.now() });
  },
});

export const assertApiAccessInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await requireEntitlementForEmail(
      ctx,
      args.userId,
      "api_access",
      "Developer API access requires a Premium subscription."
    );
  },
});

export const insertKeyInternal = internalMutation({
  args: {
    userId: v.string(),
    label: v.string(),
    keyPrefix: v.string(),
    keyHash: v.string(),
    scopes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const active = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("revokedAt"), undefined))
      .take(10);
    if (active.length >= 5) {
      throw new Error("Maximum of 5 active API keys. Revoke an unused key first.");
    }

    return await ctx.db.insert("apiKeys", {
      userId: args.userId,
      label: args.label,
      keyPrefix: args.keyPrefix,
      keyHash: args.keyHash,
      scopes: args.scopes,
      createdAt: Date.now(),
    });
  },
});

export const verifyKeyInternal = internalQuery({
  args: { keyHash: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("apiKeys")
      .withIndex("by_hash", (q) => q.eq("keyHash", args.keyHash))
      .first();
    if (!row || row.revokedAt) return null;
    return {
      apiKeyId: row._id,
      userId: row.userId,
      scopes: row.scopes,
      keyPrefix: row.keyPrefix,
    };
  },
});

export const recordUsageInternal = internalMutation({
  args: {
    apiKeyId: v.id("apiKeys"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const dateKey = todayKey();
    const existing = await ctx.db
      .query("apiKeyUsageDaily")
      .withIndex("by_key_date", (q) =>
        q.eq("apiKeyId", args.apiKeyId).eq("dateKey", dateKey)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        requestCount: existing.requestCount + 1,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("apiKeyUsageDaily", {
        apiKeyId: args.apiKeyId,
        userId: args.userId,
        dateKey,
        requestCount: 1,
        updatedAt: now,
      });
    }

    await ctx.db.patch(args.apiKeyId, { lastUsedAt: now });
  },
});
