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
    /** JSON InterestProfile — built from chat history for personalization */
    interestProfile: v.optional(v.string()),
    /** OAuth / profile fields present in production */
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
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
    /** When true, `shareToken` exposes read-only chat at /chat/share/?t=… */
    sharePublic: v.optional(v.boolean()),
    shareToken: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"])
    .index("by_share_token", ["shareToken"]),

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

  qualityMetricsDaily: defineTable({
    dateKey: v.string(),
    totalResponses: v.number(),
    highConfidenceResponses: v.number(),
    lowConfidenceResponses: v.number(),
    citedResponses: v.number(),
    hallucinationRiskResponses: v.number(),
    verificationResponses: v.number(),
    verificationPassedResponses: v.number(),
    updatedAt: v.number(),
  }).index("by_dateKey", ["dateKey"]),

  qualityFeedback: defineTable({
    dateKey: v.string(),
    userId: v.optional(v.string()),
    satisfactionScore: v.number(),
    usefulnessScore: v.number(),
    note: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_dateKey", ["dateKey"]),

  feedbackRateLimits: defineTable({
    bucketKey: v.string(),
    windowStartMs: v.number(),
    count: v.number(),
  }).index("by_bucket", ["bucketKey"]),

  usageDaily: defineTable({
    userId: v.string(),
    dateKey: v.string(),
    chatsUsed: v.number(),
    imagesUsed: v.number(),
    filesUploaded: v.optional(v.number()),
    uploadImagesUsed: v.optional(v.number()),
    uploadBytes: v.optional(v.number()),
  }).index("by_user_date", ["userId", "dateKey"]),

  uploadLimitSettings: defineTable({
    planId: subscriptionPlanValidator,
    filesPerDay: v.number(),
    imagesPerDay: v.number(),
    maxFileBytes: v.number(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.string()),
  }).index("by_plan", ["planId"]),

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
