import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const hasCredentialsInternal = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const row = await ctx.db
      .query("userCredentials")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    return Boolean(row);
  },
});

export const getCredentialsInternal = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    return await ctx.db
      .query("userCredentials")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  },
});

export const setCredentialsInternal = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const now = Date.now();
    const existing = await ctx.db
      .query("userCredentials")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        passwordHash: args.passwordHash,
        passwordResetTokenHash: undefined,
        passwordResetExpiresAt: undefined,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("userCredentials", {
      email,
      passwordHash: args.passwordHash,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setPasswordResetInternal = internalMutation({
  args: {
    email: v.string(),
    tokenHash: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const row = await ctx.db
      .query("userCredentials")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!row) return { ok: false as const };
    await ctx.db.patch(row._id, {
      passwordResetTokenHash: args.tokenHash,
      passwordResetExpiresAt: args.expiresAt,
      updatedAt: Date.now(),
    });
    return { ok: true as const };
  },
});

export const clearPasswordResetInternal = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const row = await ctx.db
      .query("userCredentials")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!row) return;
    await ctx.db.patch(row._id, {
      passwordResetTokenHash: undefined,
      passwordResetExpiresAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const updatePasswordHashInternal = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const row = await ctx.db
      .query("userCredentials")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!row) throw new Error("Account not found");
    await ctx.db.patch(row._id, {
      passwordHash: args.passwordHash,
      passwordResetTokenHash: undefined,
      passwordResetExpiresAt: undefined,
      updatedAt: Date.now(),
    });
  },
});
