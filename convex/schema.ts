import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const aiModeValidator = v.string();

export default defineSchema({
  users: defineTable({
    email: v.string(),
    tokens: v.number(),
    plan: v.string(),
  }).index("by_email", ["email"]),

  conversations: defineTable({
    userId: v.string(),
    title: v.string(),
    mode: aiModeValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system")
    ),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_conversation", ["conversationId", "createdAt"]),

  /** @deprecated Legacy flat chat log — use conversations + messages */
  chats: defineTable({
    userId: v.string(),
    message: v.string(),
    role: v.string(),
    createdAt: v.number(),
  }),

  transactions: defineTable({
    userId: v.string(),
    amount: v.number(),
    reference: v.string(),
    tokens: v.number(),
  }),
});
