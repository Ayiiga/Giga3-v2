import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const aiModeValidator = v.string();

export const subscriptionPlanValidator = v.union(
  v.literal("free"),
  v.literal("basic"),
  v.literal("pro"),
  v.literal("premium")
);

export const paidPlanValidator = v.union(
  v.literal("basic"),
  v.literal("pro"),
  v.literal("premium")
);

export const creditActionValidator = v.union(
  v.literal("chat"),
  v.literal("writing"),
  v.literal("research"),
  v.literal("image"),
  v.literal("video"),
  v.literal("subscription_refill"),
  v.literal("credit_purchase"),
  v.literal("starter_grant"),
  v.literal("admin_grant")
);

export default defineSchema({
  users: defineTable({
    email: v.string(),
    tokens: v.number(),
    plan: v.string(),
    /** @deprecated use subscriptionPlan — kept for legacy clients */
    tier: v.union(v.literal("free"), v.literal("premium")),
    subscriptionPlan: subscriptionPlanValidator,
    credits: v.number(),
    subscriptionExpiresAt: v.optional(v.number()),
    starterCreditsGranted: v.boolean(),
  }).index("by_email", ["email"]),

  subscriptions: defineTable({
    userId: v.string(),
    planId: paidPlanValidator,
    status: v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("cancelled")
    ),
    paystackReference: v.string(),
    paymentId: v.optional(v.id("payments")),
    periodStart: v.number(),
    periodEnd: v.number(),
    creditsGranted: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_reference", ["paystackReference"]),

  payments: defineTable({
    userId: v.string(),
    provider: v.literal("paystack"),
    reference: v.string(),
    productId: v.string(),
    type: v.union(v.literal("subscription"), v.literal("credits")),
    amountGhs: v.number(),
    planId: v.optional(paidPlanValidator),
    creditsGranted: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("success"),
      v.literal("failed")
    ),
    paystackResponse: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_reference", ["reference"])
    .index("by_user", ["userId"]),

  creditLogs: defineTable({
    userId: v.string(),
    action: creditActionValidator,
    amount: v.number(),
    balanceAfter: v.number(),
    reference: v.optional(v.string()),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_created", ["userId", "createdAt"]),

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

  usageDaily: defineTable({
    userId: v.string(),
    dateKey: v.string(),
    chatsUsed: v.number(),
    imagesUsed: v.number(),
  }).index("by_user_date", ["userId", "dateKey"]),

  mediaJobs: defineTable({
    userId: v.string(),
    mediaType: v.union(v.literal("image"), v.literal("video")),
    category: v.string(),
    prompt: v.string(),
    replicatePredictionId: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("succeeded"),
      v.literal("failed")
    ),
    outputUrl: v.optional(v.string()),
    creditsCharged: v.number(),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

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
