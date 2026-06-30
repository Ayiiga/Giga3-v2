import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";

export const saveMessage = mutation({
  args: {
    ...sessionArgs,
    message: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    await ctx.db.insert("chats", {
      userId,
      message: args.message,
      role: args.role,
      createdAt: Date.now(),
    });
  },
});

export const getMessages = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    return await ctx.db
      .query("chats")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
  },
});
