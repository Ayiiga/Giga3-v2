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

export const socialPostTypeValidator = v.union(
  v.literal("text"),
  v.literal("image"),
  v.literal("video"),
  v.literal("ai"),
  v.literal("education"),
  v.literal("creator")
);

export const socialMediaTypeValidator = v.union(
  v.literal("none"),
  v.literal("image"),
  v.literal("video"),
  v.literal("gallery")
);

export const socialPostMediaItemValidator = v.object({
  url: v.string(),
  type: v.union(v.literal("image"), v.literal("video"), v.literal("audio")),
  durationSec: v.optional(v.number()),
  thumbnailUrl: v.optional(v.string()),
  storagePath: v.optional(v.string()),
  storageBucket: v.optional(v.string()),
  filterId: v.optional(v.string()),
});

export const socialNotificationTypeValidator = v.union(
  v.literal("like"),
  v.literal("comment"),
  v.literal("reply"),
  v.literal("mention"),
  v.literal("follow"),
  v.literal("community"),
  v.literal("learning"),
  v.literal("creator")
);

/** Enterprise / education workspace — isolated from consumer users table. */
export const orgTypeValidator = v.union(
  v.literal("school"),
  v.literal("enterprise")
);

export const orgRoleValidator = v.union(
  v.literal("org_admin"),
  v.literal("school_admin"),
  v.literal("teacher"),
  v.literal("parent"),
  v.literal("student"),
  v.literal("creator"),
  v.literal("standard_user")
);

export const orgMemberStatusValidator = v.union(
  v.literal("active"),
  v.literal("invited"),
  v.literal("removed")
);

export const orgClassStatusValidator = v.union(
  v.literal("active"),
  v.literal("archived")
);

export const orgAssignmentStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("closed")
);

export const orgSubmissionStatusValidator = v.union(
  v.literal("pending"),
  v.literal("submitted"),
  v.literal("graded"),
  v.literal("late")
);

export const userRoleValidator = v.union(
  v.literal("student"),
  v.literal("teacher"),
  v.literal("parent"),
  v.literal("creator"),
  v.literal("business"),
  v.literal("developer"),
  v.literal("enterprise"),
  v.literal("general")
);

export const platformNotificationCategoryValidator = v.union(
  v.literal("ai_task"),
  v.literal("marketplace"),
  v.literal("wallet"),
  v.literal("learning"),
  v.literal("creator"),
  v.literal("system"),
  v.literal("security"),
  v.literal("social"),
  v.literal("announcement")
);

export const feedbackSubmissionTypeValidator = v.union(
  v.literal("general"),
  v.literal("bug"),
  v.literal("feature"),
  v.literal("ai_rating"),
  v.literal("incorrect_info")
);

export const feedbackSubmissionStatusValidator = v.union(
  v.literal("open"),
  v.literal("reviewing"),
  v.literal("resolved"),
  v.literal("closed")
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
    /** Platform v1.0.1 — user role for onboarding & personalization */
    userRole: v.optional(userRoleValidator),
    /** JSON OnboardingState */
    onboardingState: v.optional(v.string()),
    /** JSON UserPreferences — privacy-respecting personalization */
    userPreferences: v.optional(v.string()),
    /** Consumer account moderation — undefined means active */
    accountStatus: v.optional(v.union(v.literal("active"), v.literal("suspended"))),
    onboardingCompletedAt: v.optional(v.number()),
    referralCode: v.optional(v.string()),
    referredByUserId: v.optional(v.string()),
    learningStreakDays: v.optional(v.number()),
    lastActiveDateKey: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_referralCode", ["referralCode"]),

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
    /** When true, suppress all push categories for this subscription. */
    muteAll: v.optional(v.boolean()),
    socialAlerts: v.optional(v.boolean()),
    commentAlerts: v.optional(v.boolean()),
    mentionAlerts: v.optional(v.boolean()),
    followAlerts: v.optional(v.boolean()),
    generationAlerts: v.optional(v.boolean()),
    announcementAlerts: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_endpoint", ["endpoint"]),

  /** Prevents duplicate push notifications within a short window. */
  pushNotificationDedup: defineTable({
    userId: v.string(),
    tag: v.string(),
    sentAt: v.number(),
  }).index("by_user_tag", ["userId", "tag"]),

  /** Failed push deliveries queued for retry when device is temporarily offline. */
  pushNotificationQueue: defineTable({
    userId: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    payloadJson: v.string(),
    tag: v.string(),
    category: v.string(),
    attempts: v.number(),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]),

  /** GigaSocial — user profiles (additive; separate from users / creatorProfiles). */
  socialProfiles: defineTable({
    userId: v.string(),
    displayName: v.string(),
    handle: v.string(),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    coverUrl: v.optional(v.string()),
    skills: v.array(v.string()),
    interests: v.array(v.string()),
    achievementsJson: v.optional(v.string()),
    gamificationJson: v.optional(v.string()),
    privacySettingsJson: v.optional(v.string()),
    economyJson: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_handle", ["handle"]),

  socialPosts: defineTable({
    authorId: v.string(),
    body: v.string(),
    mediaUrl: v.optional(v.string()),
    mediaUrls: v.optional(v.array(v.string())),
    mediaType: v.optional(socialMediaTypeValidator),
    videoDurationSec: v.optional(v.number()),
    videoThumbnailUrl: v.optional(v.string()),
    hashtags: v.optional(v.array(v.string())),
    mentions: v.optional(v.array(v.string())),
    mediaMetaJson: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal("public"), v.literal("followers"))),
    viewCount: v.optional(v.number()),
    postType: socialPostTypeValidator,
    communitySlug: v.optional(v.string()),
    likeCount: v.number(),
    commentCount: v.number(),
    shareCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_created", ["createdAt"])
    .index("by_author_created", ["authorId", "createdAt"])
    .index("by_community_created", ["communitySlug", "createdAt"]),

  socialComments: defineTable({
    postId: v.id("socialPosts"),
    authorId: v.string(),
    body: v.string(),
    parentId: v.optional(v.id("socialComments")),
    createdAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_post_created", ["postId", "createdAt"])
    .index("by_parent", ["parentId"]),

  socialReactions: defineTable({
    postId: v.id("socialPosts"),
    userId: v.string(),
    createdAt: v.number(),
  })
    .index("by_post", ["postId"])
    .index("by_post_user", ["postId", "userId"])
    .index("by_user", ["userId"]),

  socialBookmarks: defineTable({
    postId: v.id("socialPosts"),
    userId: v.string(),
    createdAt: v.number(),
  })
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_post_user", ["postId", "userId"]),

  socialCommunityMembers: defineTable({
    communitySlug: v.string(),
    userId: v.string(),
    joinedAt: v.number(),
  })
    .index("by_slug", ["communitySlug"])
    .index("by_user", ["userId"])
    .index("by_slug_user", ["communitySlug", "userId"]),

  socialNotifications: defineTable({
    recipientId: v.string(),
    type: socialNotificationTypeValidator,
    actorId: v.optional(v.string()),
    postId: v.optional(v.id("socialPosts")),
    communitySlug: v.optional(v.string()),
    message: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_recipient_created", ["recipientId", "createdAt"])
    .index("by_recipient_read", ["recipientId", "read"]),

  socialFollows: defineTable({
    followerId: v.string(),
    followingId: v.string(),
    createdAt: v.number(),
  })
    .index("by_follower", ["followerId"])
    .index("by_following", ["followingId"])
    .index("by_pair", ["followerId", "followingId"]),

  socialLiveStreams: defineTable({
    hostId: v.string(),
    title: v.string(),
    mode: v.union(v.literal("video"), v.literal("audio"), v.literal("screen")),
    status: v.union(v.literal("scheduled"), v.literal("live"), v.literal("ended")),
    scheduledAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    viewerCount: v.number(),
    peakViewers: v.number(),
    coHostIds: v.optional(v.array(v.string())),
    mutedUserIds: v.optional(v.array(v.string())),
    reactionCountsJson: v.optional(v.string()),
    captionLinesJson: v.optional(v.string()),
    replayUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status_created", ["status", "createdAt"])
    .index("by_host_created", ["hostId", "createdAt"]),

  socialLiveChat: defineTable({
    streamId: v.id("socialLiveStreams"),
    authorId: v.string(),
    body: v.string(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_stream_created", ["streamId", "createdAt"]),

  socialLiveGifts: defineTable({
    streamId: v.id("socialLiveStreams"),
    senderId: v.string(),
    giftType: v.string(),
    amount: v.number(),
    createdAt: v.number(),
  }).index("by_stream_created", ["streamId", "createdAt"]),

  /** GigaSocial creator economy — profile gifts (live + direct). */
  socialCreatorGifts: defineTable({
    creatorId: v.string(),
    senderId: v.string(),
    giftType: v.string(),
    credits: v.number(),
    amountGhs: v.number(),
    message: v.optional(v.string()),
    postId: v.optional(v.id("socialPosts")),
    streamId: v.optional(v.id("socialLiveStreams")),
    createdAt: v.number(),
  })
    .index("by_creator_created", ["creatorId", "createdAt"])
    .index("by_sender_created", ["senderId", "createdAt"]),

  /** GigaSocial creator affiliate tracking. */
  socialAffiliateEvents: defineTable({
    creatorId: v.string(),
    affiliateCode: v.string(),
    eventType: v.union(v.literal("click"), v.literal("conversion")),
    visitorId: v.optional(v.string()),
    amountGhs: v.optional(v.number()),
    metadataJson: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_creator_created", ["creatorId", "createdAt"])
    .index("by_code", ["affiliateCode"]),

  /** GigaSocial paid post / product boost campaigns. */
  socialPostBoosts: defineTable({
    creatorId: v.string(),
    targetType: v.union(
      v.literal("post"),
      v.literal("video"),
      v.literal("marketplace"),
      v.literal("business")
    ),
    targetId: v.string(),
    budgetGhs: v.number(),
    durationDays: v.number(),
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("cancelled")),
    impressions: v.number(),
    reach: v.number(),
    engagement: v.number(),
    startedAt: v.number(),
    endsAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_creator_created", ["creatorId", "createdAt"])
    .index("by_target", ["targetType", "targetId"])
    .index("by_status_ends", ["status", "endsAt"]),

  /** Enterprise & education — org-scoped data isolated from consumer chat history. */
  organizations: defineTable({
    slug: v.string(),
    name: v.string(),
    type: orgTypeValidator,
    description: v.optional(v.string()),
    settingsJson: v.optional(v.string()),
    creditPool: v.number(),
    status: v.union(v.literal("active"), v.literal("suspended")),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  orgMembers: defineTable({
    orgId: v.id("organizations"),
    userId: v.string(),
    role: orgRoleValidator,
    status: orgMemberStatusValidator,
    displayName: v.optional(v.string()),
    invitedBy: v.optional(v.string()),
    joinedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_user", ["userId"])
    .index("by_org_user", ["orgId", "userId"])
    .index("by_org_role", ["orgId", "role"]),

  orgClasses: defineTable({
    orgId: v.id("organizations"),
    name: v.string(),
    subject: v.optional(v.string()),
    gradeLevel: v.optional(v.string()),
    teacherId: v.string(),
    description: v.optional(v.string()),
    academicYear: v.optional(v.string()),
    status: orgClassStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_teacher", ["teacherId"])
    .index("by_org_teacher", ["orgId", "teacherId"]),

  orgEnrollments: defineTable({
    orgId: v.id("organizations"),
    classId: v.id("orgClasses"),
    studentId: v.string(),
    parentId: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("withdrawn")),
    enrolledAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_class", ["classId"])
    .index("by_student", ["studentId"])
    .index("by_org_student", ["orgId", "studentId"])
    .index("by_parent", ["parentId"])
    .index("by_class_student", ["classId", "studentId"]),

  orgAssignments: defineTable({
    orgId: v.id("organizations"),
    classId: v.id("orgClasses"),
    teacherId: v.string(),
    title: v.string(),
    description: v.string(),
    dueAt: v.optional(v.number()),
    status: orgAssignmentStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_class", ["classId"])
    .index("by_org", ["orgId"])
    .index("by_teacher", ["teacherId"])
    .index("by_org_status", ["orgId", "status"]),

  orgAssignmentSubmissions: defineTable({
    orgId: v.id("organizations"),
    assignmentId: v.id("orgAssignments"),
    studentId: v.string(),
    content: v.optional(v.string()),
    status: orgSubmissionStatusValidator,
    score: v.optional(v.number()),
    feedback: v.optional(v.string()),
    submittedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_assignment", ["assignmentId"])
    .index("by_student", ["studentId"])
    .index("by_assignment_student", ["assignmentId", "studentId"])
    .index("by_org", ["orgId"]),

  orgAuditLogs: defineTable({
    orgId: v.id("organizations"),
    actorId: v.string(),
    action: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    metadataJson: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_org_created", ["orgId", "createdAt"]),

  orgUsageDaily: defineTable({
    orgId: v.id("organizations"),
    dateKey: v.string(),
    aiRequests: v.number(),
    learningSessions: v.number(),
    assignmentsSubmitted: v.number(),
    creditsUsed: v.number(),
    updatedAt: v.number(),
  }).index("by_org_date", ["orgId", "dateKey"]),

  platformNotifications: defineTable({
    userId: v.string(),
    category: platformNotificationCategoryValidator,
    title: v.string(),
    body: v.string(),
    href: v.optional(v.string()),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_user_read", ["userId", "read"]),

  userFeedbackSubmissions: defineTable({
    userId: v.optional(v.string()),
    type: feedbackSubmissionTypeValidator,
    status: feedbackSubmissionStatusValidator,
    title: v.string(),
    body: v.string(),
    screenshotDataUrl: v.optional(v.string()),
    messageId: v.optional(v.string()),
    conversationId: v.optional(v.string()),
    rating: v.optional(v.number()),
    adminNote: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_status", ["status", "createdAt"]),

  userAchievements: defineTable({
    userId: v.string(),
    badgeId: v.string(),
    label: v.string(),
    description: v.string(),
    earnedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_badge", ["userId", "badgeId"]),

  referralEvents: defineTable({
    referrerUserId: v.string(),
    referredUserId: v.string(),
    referralCode: v.string(),
    rewardCredits: v.number(),
    createdAt: v.number(),
  })
    .index("by_referrer", ["referrerUserId"])
    .index("by_referred", ["referredUserId"]),

  remoteConfigEntries: defineTable({
    key: v.string(),
    value: v.string(),
    description: v.optional(v.string()),
    enabled: v.boolean(),
    rolloutPercent: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  systemHealthSnapshots: defineTable({
    service: v.string(),
    status: v.union(v.literal("healthy"), v.literal("degraded"), v.literal("down")),
    latencyMs: v.optional(v.number()),
    errorRate: v.optional(v.number()),
    message: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_service_created", ["service", "createdAt"]),
});
