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

export const videoCreditActionValidator = v.union(
  v.literal("video_generation"),
  v.literal("video_generation_refund"),
  v.literal("video_subscription_refill"),
  v.literal("video_pack_purchase"),
  v.literal("starter_grant")
);

export const paymentTypeValidator = v.union(
  v.literal("subscription"),
  v.literal("credits"),
  v.literal("video_subscription"),
  v.literal("video_credits"),
  v.literal("marketplace")
);

export const marketplaceProductTypeValidator = v.union(
  v.literal("ebook"),
  v.literal("lesson_notes"),
  v.literal("sermon"),
  v.literal("project"),
  v.literal("research_paper"),
  v.literal("ai_prompt"),
  v.literal("template"),
  v.literal("source_code"),
  v.literal("poster"),
  v.literal("flyer"),
  v.literal("brochure"),
  v.literal("business_document"),
  v.literal("educational_resource"),
  v.literal("motivational_book"),
  v.literal("other")
);

export const marketplaceLicenseValidator = v.union(
  v.literal("personal"),
  v.literal("commercial"),
  v.literal("extended"),
  v.literal("exclusive")
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
    /** Independent Video AI wallet — never mixed with chat `credits`. */
    videoCredits: v.optional(v.number()),
    videoSubscriptionPlan: v.optional(v.string()),
    videoSubscriptionExpiresAt: v.optional(v.number()),
  }).index("by_email", ["email"]),

  /** Email + password credentials (scrypt hash). Separate from users for security. */
  userCredentials: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    passwordResetTokenHash: v.optional(v.string()),
    passwordResetExpiresAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
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
    type: paymentTypeValidator,
    amountGhs: v.number(),
    planId: v.optional(paidPlanValidator),
    creditsGranted: v.optional(v.number()),
    videoCreditsGranted: v.optional(v.number()),
    videoPlanId: v.optional(v.string()),
    marketplaceListingId: v.optional(v.id("marketplaceListings")),
    creatorId: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("success"),
      v.literal("failed")
    ),
    paystackResponse: v.optional(v.string()),
    /** Internal platform revenue — admin only; not shown in client payment views. */
    platformFeeGhs: v.optional(v.number()),
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
    pinned: v.optional(v.boolean()),
    archived: v.optional(v.boolean()),
    isFavorite: v.optional(v.boolean()),
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

  /** Active visitors — heartbeat for online-now counts. */
  presenceSessions: defineTable({
    clientId: v.string(),
    userId: v.optional(v.string()),
    isPwa: v.boolean(),
    lastSeenAt: v.number(),
    deviceType: v.optional(v.string()),
    browser: v.optional(v.string()),
    os: v.optional(v.string()),
    country: v.optional(v.string()),
  })
    .index("by_client", ["clientId"])
    .index("by_lastSeen", ["lastSeenAt"]),

  /** Per-user daily activity for DAU / retention. */
  userActivityDaily: defineTable({
    userId: v.string(),
    dateKey: v.string(),
    lastSeenAt: v.number(),
  }).index("by_date_user", ["dateKey", "userId"]),

  /** Rolling platform metrics bucketed by UTC date. */
  platformStatsDaily: defineTable({
    dateKey: v.string(),
    messages: v.number(),
    conversations: v.number(),
    aiRequests: v.number(),
    aiFailures: v.number(),
    newUsers: v.number(),
    totalLatencyMs: v.number(),
    latencySamples: v.number(),
    peakConcurrent: v.number(),
    updatedAt: v.number(),
  }).index("by_dateKey", ["dateKey"]),

  platformCounters: defineTable({
    key: v.string(),
    value: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

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

  securityEvents: defineTable({
    eventType: v.string(),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    message: v.string(),
    emailHash: v.optional(v.string()),
    metadata: v.optional(v.string()),
    dateKey: v.string(),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_dateKey", ["dateKey"]),

  usageDaily: defineTable({
    userId: v.string(),
    dateKey: v.string(),
    chatsUsed: v.number(),
    imagesUsed: v.number(),
    filesUploaded: v.optional(v.number()),
    uploadImagesUsed: v.optional(v.number()),
    uploadBytes: v.optional(v.number()),
  }).index("by_user_date", ["userId", "dateKey"]),

  aiUsageEvents: defineTable({
    userId: v.string(),
    providerId: v.string(),
    requestKind: v.string(),
    mode: v.string(),
    tier: v.string(),
    latencyMs: v.number(),
    usedFallback: v.boolean(),
    cached: v.boolean(),
    usedWebSearch: v.boolean(),
    estimatedTokens: v.optional(v.number()),
    conversationId: v.optional(v.string()),
    dateKey: v.string(),
    createdAt: v.number(),
  })
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_dateKey", ["dateKey"]),

  aiUsageDaily: defineTable({
    dateKey: v.string(),
    providerId: v.string(),
    requestCount: v.number(),
    fallbackCount: v.number(),
    cacheHitCount: v.number(),
    totalLatencyMs: v.number(),
    updatedAt: v.number(),
  }).index("by_dateKey_provider", ["dateKey", "providerId"]),

  aiResponseCache: defineTable({
    promptHash: v.string(),
    content: v.string(),
    providerId: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_promptHash", ["promptHash"])
    .index("by_expiresAt", ["expiresAt"]),

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

  videoCreditLogs: defineTable({
    userId: v.string(),
    action: videoCreditActionValidator,
    amount: v.number(),
    balanceAfter: v.number(),
    category: v.optional(v.string()),
    reference: v.optional(v.string()),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_created", ["userId", "createdAt"]),

  videoSubscriptions: defineTable({
    userId: v.string(),
    planId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("cancelled")
    ),
    paystackReference: v.string(),
    paymentId: v.optional(v.id("payments")),
    periodStart: v.number(),
    periodEnd: v.number(),
    videoCreditsGranted: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_reference", ["paystackReference"]),

  videoJobs: defineTable({
    userId: v.string(),
    category: v.string(),
    mode: v.string(),
    prompt: v.string(),
    sourceImageUrl: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("succeeded"),
      v.literal("failed")
    ),
    outputUrl: v.optional(v.string()),
    provider: v.optional(v.string()),
    externalId: v.optional(v.string()),
    videoCreditsCharged: v.number(),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  creatorProfiles: defineTable({
    userId: v.string(),
    displayName: v.string(),
    handle: v.string(),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    website: v.optional(v.string()),
    verified: v.boolean(),
    verificationStatus: v.optional(
      v.union(
        v.literal("none"),
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected")
      )
    ),
    nationalIdNumber: v.optional(v.string()),
    idDocumentStorageId: v.optional(v.id("_storage")),
    idDocumentFileName: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    locationCapturedAt: v.optional(v.number()),
    locationAccuracyMeters: v.optional(v.number()),
    verificationSubmittedAt: v.optional(v.number()),
    verificationReviewedAt: v.optional(v.number()),
    verificationRejectionReason: v.optional(v.string()),
    totalSales: v.number(),
    totalEarningsGhs: v.number(),
    payoutBalanceGhs: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_handle", ["handle"])
    .index("by_verification_status", ["verificationStatus"]),

  marketplaceListings: defineTable({
    creatorId: v.string(),
    title: v.string(),
    description: v.string(),
    category: v.string(),
    productType: marketplaceProductTypeValidator,
    priceGhs: v.number(),
    license: marketplaceLicenseValidator,
    copyrightNotice: v.optional(v.string()),
    tags: v.array(v.string()),
    previewText: v.optional(v.string()),
    previewUrl: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    fileStorageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived")
    ),
    ratingAvg: v.number(),
    ratingCount: v.number(),
    purchaseCount: v.number(),
    viewCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_creator", ["creatorId", "updatedAt"])
    .index("by_status", ["status", "updatedAt"])
    .index("by_category", ["category", "updatedAt"]),

  marketplacePurchases: defineTable({
    buyerId: v.string(),
    listingId: v.id("marketplaceListings"),
    creatorId: v.string(),
    amountGhs: v.number(),
    platformFeeGhs: v.number(),
    creatorEarningsGhs: v.number(),
    paymentReference: v.string(),
    license: marketplaceLicenseValidator,
    createdAt: v.number(),
  })
    .index("by_buyer", ["buyerId", "createdAt"])
    .index("by_listing", ["listingId"])
    .index("by_creator", ["creatorId", "createdAt"])
    .index("by_reference", ["paymentReference"]),

  marketplaceReviews: defineTable({
    listingId: v.id("marketplaceListings"),
    buyerId: v.string(),
    rating: v.number(),
    comment: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_listing", ["listingId", "createdAt"])
    .index("by_buyer_listing", ["buyerId", "listingId"]),

  creatorPayouts: defineTable({
    creatorId: v.string(),
    amountGhs: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("paid"),
      v.literal("failed")
    ),
    method: v.optional(v.string()),
    reference: v.optional(v.string()),
    note: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_creator", ["creatorId", "createdAt"]),

  /** Queued chat AI replies — client returns immediately on slow networks. */
  chatReplyJobs: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(),
    mode: v.string(),
    content: v.string(),
    attachmentsJson: v.optional(v.string()),
    kind: v.optional(
      v.union(v.literal("reply"), v.literal("regenerate"))
    ),
    regenerateFromMessageId: v.optional(v.id("messages")),
    clientRequestId: v.optional(v.string()),
    chatSystem: v.optional(v.string()),
    cancelled: v.optional(v.boolean()),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("done"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId", "createdAt"])
    .index("by_clientRequest", ["clientRequestId"]),

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

  /** Cached headlines per category — refreshed daily by cron (live news module). */
  liveNewsCache: defineTable({
    category: v.string(),
    itemsJson: v.string(),
    fetchedAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_expiresAt", ["expiresAt"]),

  /** Web push endpoints for news/sports alerts (optional, feature-flagged). */
  pushSubscriptions: defineTable({
    userId: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    newsAlerts: v.boolean(),
    sportsAlerts: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_endpoint", ["endpoint"]),
});
