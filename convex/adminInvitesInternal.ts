import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";

const inviteRoleValidator = v.union(
  v.literal("tester"),
  v.literal("creator"),
  v.literal("admin")
);

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const ensureAdminAccessInternal = internalMutation({
  args: adminCredentialArgs,
  handler: async (_ctx, args) => {
    await ensureAdminAccess(args);
  },
});

export const getInviteInternal = internalQuery({
  args: { inviteId: v.id("adminInvites") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.inviteId);
  },
});

export const touchInviteSentInternal = internalMutation({
  args: { inviteId: v.id("adminInvites") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.inviteId, { lastSentAt: Date.now() });
  },
});

export const createInviteRecordInternal = internalMutation({
  args: {
    ...adminCredentialArgs,
    email: v.string(),
    role: inviteRoleValidator,
    invitedBy: v.string(),
    magicLinkToken: v.string(),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const email = normalizeEmail(args.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Enter a valid email address.");
    }
    const existing = await ctx.db
      .query("adminInvites")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    const now = Date.now();
    if (existing && existing.status === "pending") {
      await ctx.db.patch(existing._id, {
        role: args.role,
        invitedBy: args.invitedBy,
        magicLinkToken: args.magicLinkToken,
        lastSentAt: now,
      });
      return { inviteId: existing._id, email, magicLinkToken: args.magicLinkToken };
    }
    const inviteId = await ctx.db.insert("adminInvites", {
      email,
      role: args.role,
      invitedBy: args.invitedBy,
      invitedAt: now,
      status: "pending",
      magicLinkToken: args.magicLinkToken,
      lastSentAt: now,
    });
    return { inviteId, email, magicLinkToken: args.magicLinkToken };
  },
});
