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
  v.literal("admin_grant"),
  v.literal("refund")
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
  v.literal("marketplace"),
  v.literal("creator_gift"),
  v.literal("boost_campaign"),
  /** Limited Founding Members Teacher Promotion premium (GHS 30 / 30 seats). */
  v.literal("exam_founding_premium")
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

export const marketplaceFileReviewStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected")
);

export const marketplaceReportReasonValidator = v.union(
  v.literal("scam"),
  v.literal("copyright"),
  v.literal("misleading"),
  v.literal("other")
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

/** GigaSocial DM thread request gate (Phase 2C foundation). */
export const socialDmRequestStatusValidator = v.union(
  v.literal("open"),
  v.literal("accepted"),
  v.literal("declined")
);

export const socialDmDeliveryStateValidator = v.union(
  v.literal("sent"),
  v.literal("delivered")
);

export const socialDmReportStatusValidator = v.union(
  v.literal("open"),
  v.literal("reviewed"),
  v.literal("dismissed")
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
  v.literal("incorrect_info"),
  /** Phase 5 expanded types (clients only send when phase5.feedback is on). */
  v.literal("usability"),
  v.literal("content_report"),
  /** Child-safety / harmful AI reply report (always available when signed in). */
  v.literal("unsafe_ai")
);

export const feedbackPriorityValidator = v.union(
  v.literal("low"),
  v.literal("normal"),
  v.literal("high"),
  v.literal("critical")
);

export const feedbackSubmissionStatusValidator = v.union(
  v.literal("open"),
  v.literal("reviewing"),
  v.literal("resolved"),
  v.literal("closed")
);

/** Phase 5 public-beta cohorts (additive; unused when phase5.beta is off). */
export const betaCohortValidator = v.union(
  v.literal("existing"),
  v.literal("trusted_tester"),
  v.literal("student"),
  v.literal("teacher"),
  v.literal("creator"),
  v.literal("community_leader")
);

export const betaWaitlistStatusValidator = v.union(
  v.literal("pending"),
  v.literal("invited"),
  v.literal("activated"),
  v.literal("rejected")
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
    /**
     * Scoped Teacher Promotion / Exam Practice premium from Founding Members
     * (or similar) offers. Independent of AI credit subscriptions.
     */
    examPracticePremiumExpiresAt: v.optional(v.number()),
    examPracticePremiumOfferId: v.optional(v.string()),
    examPracticePremiumPaymentRef: v.optional(v.string()),
    starterCreditsGranted: v.boolean(),
    /** JSON InterestProfile — built from chat history for personalization */
    interestProfile: v.optional(v.string()),
    /** OAuth / profile fields present in production */
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    /** Google Identity Services `sub` — stable account id, not an email. */
    googleSub: v.optional(v.string()),
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
    /** Engagement email opt-in — undefined means opted in (soft default). */
    emailEngagementOptIn: v.optional(v.boolean()),
    lastEngagementEmailAt: v.optional(v.number()),
    /**
     * Feature-announcement campaign idempotency (separate from digest timing).
     * Digests continue to use lastEngagementEmailAt only.
     */
    lastFeatureAnnouncementAt: v.optional(v.number()),
    lastFeatureAnnouncementCampaignKey: v.optional(v.string()),
    /**
     * Welcome-email delivery tracking (Stage B1). Separate from engagement /
     * announcement campaign keys. undefined = never claimed.
     * sending | sent | uncertain | failed — uncertain is never auto-retried.
     */
    welcomeEmailStatus: v.optional(
      v.union(
        v.literal("sending"),
        v.literal("sent"),
        v.literal("uncertain"),
        v.literal("failed")
      )
    ),
    welcomeEmailAt: v.optional(v.number()),
    emailUnsubscribeToken: v.optional(v.string()),
    /** Session tokens issued before this timestamp are rejected (password reset / sign-out everywhere). */
    sessionsValidAfter: v.optional(v.number()),
    /** Subscription auto-renewal — undefined means on (default for paid plans). */
    autoRenew: v.optional(v.boolean()),
    renewalFailures: v.optional(v.number()),
    lastRenewalAttemptAt: v.optional(v.number()),
    renewalReminderSentAt: v.optional(v.number()),
    /**
     * Child-safety age attestation (month + year only — no government ID).
     * Used to gate social UGC/DM and apply child AI mode. See childSafetyPolicy.ts.
     */
    birthYear: v.optional(v.number()),
    birthMonth: v.optional(v.number()),
    ageAttestedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_googleSub", ["googleSub"])
    .index("by_referralCode", ["referralCode"])
    .index("by_last_engagement_email", ["lastEngagementEmailAt"])
    .index("by_subscription_expiry", ["subscriptionExpiresAt"]),

  /** Reusable Paystack authorizations (cards) captured on successful charges — server-only. */
  billingAuthorizations: defineTable({
    userId: v.string(),
    provider: v.literal("paystack"),
    authorizationCode: v.string(),
    signature: v.optional(v.string()),
    channel: v.string(),
    reusable: v.boolean(),
    brand: v.optional(v.string()),
    cardType: v.optional(v.string()),
    last4: v.optional(v.string()),
    expMonth: v.optional(v.string()),
    expYear: v.optional(v.string()),
    bank: v.optional(v.string()),
    customerEmail: v.string(),
    sourceReference: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_code", ["userId", "authorizationCode"]),

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
    /** How this period was paid — undefined means a regular Paystack checkout. */
    source: v.optional(
      v.union(
        v.literal("checkout"),
        v.literal("renewal"),
        v.literal("complimentary")
      )
    ),
    note: v.optional(v.string()),
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
    /** Creator tip (Paystack) metadata */
    giftType: v.optional(v.string()),
    giftPostId: v.optional(v.id("socialPosts")),
    giftMessage: v.optional(v.string()),
    /** Ad boost (Paystack) metadata */
    boostTargetType: v.optional(
      v.union(
        v.literal("post"),
        v.literal("video"),
        v.literal("marketplace"),
        v.literal("business")
      )
    ),
    boostTargetId: v.optional(v.string()),
    boostDurationDays: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("success"),
      v.literal("failed")
    ),
    paystackResponse: v.optional(v.string()),
    /** Internal platform revenue — admin only; not shown in client payment views. */
    platformFeeGhs: v.optional(v.number()),
    /** True when charged automatically via a saved authorization (renewal). */
    isRenewal: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_reference", ["reference"])
    .index("by_user", ["userId"]),

  /**
   * Fixed 30-slot inventory for Founding Members Teacher Promotion premium.
   * Slots are claimed atomically (reserved → paid). Never trust client counts.
   */
  foundingOfferSlots: defineTable({
    offerId: v.string(),
    slotIndex: v.number(),
    status: v.union(
      v.literal("open"),
      v.literal("reserved"),
      v.literal("paid"),
      v.literal("expired"),
      v.literal("released"),
      v.literal("failed")
    ),
    userId: v.optional(v.string()),
    paymentReference: v.optional(v.string()),
    amountGhs: v.optional(v.number()),
    reservedAt: v.optional(v.number()),
    reservationExpiresAt: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_offer_status", ["offerId", "status"])
    .index("by_offer_slot", ["offerId", "slotIndex"])
    .index("by_offer_user", ["offerId", "userId"])
    .index("by_reference", ["paymentReference"])
    .index("by_reservation_expiry", ["status", "reservationExpiresAt"]),

  /** Lightweight commerce / exam-practice funnel analytics (no secrets). */
  foundingOfferEvents: defineTable({
    offerId: v.string(),
    eventType: v.union(
      v.literal("impression"),
      v.literal("checkout_start"),
      v.literal("payment_success"),
      v.literal("payment_failed"),
      v.literal("checkout_abandon"),
      v.literal("entitlement_activated"),
      v.literal("reservation_expired"),
      v.literal("sold_out_view"),
      v.literal("free_practice_started"),
      v.literal("free_practice_completed"),
      v.literal("upgrade_modal_shown"),
      v.literal("upgrade_modal_dismissed"),
      v.literal("upgrade_ghs30_selected"),
      v.literal("upgrade_ghs60_selected"),
      v.literal("upgrade_credits_selected"),
      v.literal("payment_initiated")
    ),
    userId: v.optional(v.string()),
    paymentReference: v.optional(v.string()),
    meta: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_offer_created", ["offerId", "createdAt"])
    .index("by_offer_type", ["offerId", "eventType"]),

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

  /**
   * Atomic credit holds for paid generation (GigaLearn / book creation).
   * Balance is deducted on reserve; capture keeps the charge; release refunds.
   */
  creditReservations: defineTable({
    userId: v.string(),
    requestId: v.string(),
    action: creditActionValidator,
    amount: v.number(),
    status: v.union(
      v.literal("reserved"),
      v.literal("captured"),
      v.literal("released"),
      /** Stale abandonment — refunded; requestId must not be reused. */
      v.literal("expired")
    ),
    reference: v.optional(v.string()),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_request", ["userId", "requestId"])
    .index("by_status_created", ["status", "createdAt"]),

  conversations: defineTable({
    userId: v.string(),
    title: v.string(),
    mode: aiModeValidator,
    personaId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    /** When true, `shareToken` exposes read-only chat at /chat/share/?t=… */
    sharePublic: v.optional(v.boolean()),
    shareToken: v.optional(v.string()),
    pinned: v.optional(v.boolean()),
    archived: v.optional(v.boolean()),
    isFavorite: v.optional(v.boolean()),
    /**
     * Short-lived JSON of the latest image attachments (data URLs) so follow-up
     * questions can re-run vision after chatReplyJobs rows are deleted.
     */
    lastVisionAttachmentsJson: v.optional(v.string()),
    lastVisionAttachmentsAt: v.optional(v.number()),
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
    metadataJson: v.optional(v.string()),
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
    /** Async video pipeline — provider + live progress (optional for legacy rows). */
    provider: v.optional(v.string()),
    externalId: v.optional(v.string()),
    modelId: v.optional(v.string()),
    progressStage: v.optional(v.string()),
    progressLabel: v.optional(v.string()),
    sourceImageUrl: v.optional(v.string()),
    durationSec: v.optional(v.number()),
    aspectRatio: v.optional(v.string()),
    resolution: v.optional(v.string()),
    creditsRefunded: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status_created", ["status", "createdAt"]),

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
    progressLabel: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status_created", ["status", "createdAt"]),

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
    /** Public sample URL only — never the paid product file. */
    previewUrl: v.optional(v.string()),
    /** Optional ebook preview sections (author-controlled; public when published). */
    previewToc: v.optional(v.string()),
    previewIntro: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    /** Durable cover blob — resolve fresh URLs via storage.getUrl at read time. */
    coverStorageId: v.optional(v.id("_storage")),
    fileStorageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    fileReviewStatus: v.optional(marketplaceFileReviewStatusValidator),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived")
    ),
    ratingAvg: v.number(),
    ratingCount: v.number(),
    purchaseCount: v.number(),
    viewCount: v.number(),
    /** Privacy-conscious promo / preview engagement (not purchase). */
    promoClickCount: v.optional(v.number()),
    previewOpenCount: v.optional(v.number()),
    /** Set after publish confirmation notify+email claim — prevents retry duplicates. */
    publishConfirmationAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_creator", ["creatorId", "updatedAt"])
    .index("by_creator_status", ["creatorId", "status", "updatedAt"])
    .index("by_status", ["status", "updatedAt"])
    .index("by_category", ["category", "updatedAt"]),

  marketplaceUploadIntents: defineTable({
    ownerId: v.string(),
    listingId: v.id("marketplaceListings"),
    purpose: v.union(v.literal("product_file"), v.literal("cover_image")),
    fileName: v.string(),
    contentType: v.string(),
    maxBytes: v.number(),
    expiresAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("uploaded"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("expired")
    ),
    storageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId", "createdAt"])
    .index("by_listing", ["listingId", "createdAt"])
    .index("by_status", ["status", "createdAt"]),

  marketplaceListingReports: defineTable({
    listingId: v.id("marketplaceListings"),
    reporterId: v.string(),
    reason: marketplaceReportReasonValidator,
    details: v.optional(v.string()),
    status: v.union(v.literal("open"), v.literal("reviewed"), v.literal("dismissed")),
    createdAt: v.number(),
  })
    .index("by_listing", ["listingId", "createdAt"])
    .index("by_reporter_listing", ["reporterId", "listingId"])
    .index("by_status", ["status", "createdAt"]),

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
      v.union(v.literal("reply"), v.literal("regenerate"), v.literal("conversational"))
    ),
    regenerateFromMessageId: v.optional(v.id("messages")),
    clientRequestId: v.optional(v.string()),
    chatSystem: v.optional(v.string()),
    /** Optional reply depth: quick | detailed | expert */
    responseDetail: v.optional(v.string()),
    liveWeb: v.optional(v.boolean()),
    liveWebMode: v.optional(
      v.union(v.literal("research"), v.literal("actions"))
    ),
    researchCapability: v.optional(v.string()),
    personaId: v.optional(v.string()),
    liveWebProgress: v.optional(v.string()),
    /** When the background worker began processing (recovery budget anchor). */
    processingStartedAt: v.optional(v.number()),
    /** Updated while the worker is alive — recovery must not finalize during grace. */
    lastActivityAt: v.optional(v.number()),
    /** How many times recovery re-scheduled this job. */
    rescheduleCount: v.optional(v.number()),
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
    repeatSentAt: v.optional(v.number()),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    url: v.optional(v.string()),
    category: v.optional(v.string()),
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
    /** Up to 3 profiles per userId — exactly one should be main. */
    isMain: v.optional(v.boolean()),
    accountLabel: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_handle", ["handle"]),

  socialPosts: defineTable({
    authorId: v.string(),
    /** Optional face for multi-account creators (must belong to authorId). */
    profileId: v.optional(v.id("socialProfiles")),
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
    /** Set by the post author to pin on their profile / float in feeds. */
    pinnedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
    /** Creator-controlled template permission — default off for new posts. */
    templatePolicy: v.optional(
      v.union(
        v.literal("off"),
        v.literal("fans"),
        v.literal("public"),
        v.literal("owner")
      )
    ),
    templateUseCount: v.optional(v.number()),
  })
    .index("by_created", ["createdAt"])
    .index("by_author_created", ["authorId", "createdAt"])
    .index("by_community_created", ["communitySlug", "createdAt"]),

  /** Cached GigaSocial post template analysis — avoids re-processing media. */
  socialTemplateCache: defineTable({
    postId: v.id("socialPosts"),
    analysisJson: v.string(),
    categories: v.optional(v.array(v.string())),
    templateUseCount: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_post", ["postId"]),

  socialComments: defineTable({
    postId: v.id("socialPosts"),
    authorId: v.string(),
    body: v.string(),
    parentId: v.optional(v.id("socialComments")),
    /** Set by the post creator to pin a comment on the thread. */
    pinnedAt: v.optional(v.number()),
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

  /**
   * GigaSocial 1:1 DM threads (Phase 2C — additive; flagged off by default).
   * participantAId is the lexicographically smaller userId for stable pair keys.
   */
  socialDmThreads: defineTable({
    participantAId: v.string(),
    participantBId: v.string(),
    initiatedBy: v.string(),
    requestStatus: socialDmRequestStatusValidator,
    lastMessageAt: v.optional(v.number()),
    lastMessagePreview: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_pair", ["participantAId", "participantBId"])
    .index("by_participantA_updated", ["participantAId", "updatedAt"])
    .index("by_participantB_updated", ["participantBId", "updatedAt"]),

  socialDmMessages: defineTable({
    threadId: v.id("socialDmThreads"),
    senderId: v.string(),
    body: v.string(),
    clientId: v.optional(v.string()),
    deliveryState: socialDmDeliveryStateValidator,
    createdAt: v.number(),
  })
    .index("by_thread_created", ["threadId", "createdAt"])
    .index("by_sender_created", ["senderId", "createdAt"])
    .index("by_thread_client", ["threadId", "clientId"]),

  socialDmReads: defineTable({
    threadId: v.id("socialDmThreads"),
    userId: v.string(),
    lastReadAt: v.number(),
  }).index("by_thread_user", ["threadId", "userId"]),

  socialDmBlocks: defineTable({
    blockerId: v.string(),
    blockedId: v.string(),
    createdAt: v.number(),
  })
    .index("by_blocker", ["blockerId", "createdAt"])
    .index("by_pair", ["blockerId", "blockedId"]),

  socialDmReports: defineTable({
    reporterId: v.string(),
    threadId: v.optional(v.id("socialDmThreads")),
    messageId: v.optional(v.id("socialDmMessages")),
    reason: v.string(),
    details: v.optional(v.string()),
    status: socialDmReportStatusValidator,
    createdAt: v.number(),
  })
    .index("by_reporter_created", ["reporterId", "createdAt"])
    .index("by_status", ["status", "createdAt"]),

  /** UGC reports for GigaSocial posts/comments — moderation queue (not auto-resolving). */
  socialContentReports: defineTable({
    reporterId: v.string(),
    targetType: v.union(v.literal("post"), v.literal("comment"), v.literal("profile")),
    postId: v.optional(v.id("socialPosts")),
    commentId: v.optional(v.id("socialComments")),
    profileUserId: v.optional(v.string()),
    reason: v.string(),
    details: v.optional(v.string()),
    status: socialDmReportStatusValidator,
    createdAt: v.number(),
  })
    .index("by_reporter_created", ["reporterId", "createdAt"])
    .index("by_status", ["status", "createdAt"])
    .index("by_post", ["postId", "createdAt"]),

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
    /** Paystack reference when tip was paid via MoMo/card/etc. */
    paymentReference: v.optional(v.string()),
    /** Set when Paystack tip share was credited to creatorProfiles.payoutBalanceGhs. */
    creditedToPayoutAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_creator_created", ["creatorId", "createdAt"])
    .index("by_sender_created", ["senderId", "createdAt"])
    .index("by_payment_reference", ["paymentReference"]),

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

  /**
   * Creator monetisation applications / review state (Earnings Centre).
   * Fan thresholds alone never grant approval.
   */
  socialMonetizationApplications: defineTable({
    creatorId: v.string(),
    status: v.union(
      v.literal("submitted"),
      v.literal("under_review"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("appeal_available"),
      v.literal("suspended")
    ),
    policyVersion: v.string(),
    fanCountAtSubmit: v.number(),
    statement: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    submittedAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.string()),
    appealSubmittedAt: v.optional(v.number()),
    appealStatement: v.optional(v.string()),
    suspendedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_creator", ["creatorId", "createdAt"])
    .index("by_status_created", ["status", "createdAt"]),

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
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    impressions: v.number(),
    reach: v.number(),
    engagement: v.number(),
    startedAt: v.number(),
    endsAt: v.number(),
    /** Paystack reference when boost was paid via MoMo/card/etc. */
    paymentReference: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_creator_created", ["creatorId", "createdAt"])
    .index("by_target", ["targetType", "targetId"])
    .index("by_status_ends", ["status", "endsAt"])
    .index("by_payment_reference", ["paymentReference"]),

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
    /** Optional secondary CTA (e.g. Promote Product). */
    secondaryHref: v.optional(v.string()),
    secondaryLabel: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    /** Idempotency key — one notification per logical event. */
    dedupeKey: v.optional(v.string()),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_user_read", ["userId", "read"])
    .index("by_dedupe", ["dedupeKey"]),

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
    /** Phase 5 admin priority ranking (optional; defaults inferred). */
    priority: v.optional(feedbackPriorityValidator),
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

  /** Phase 5 — public beta invite codes (gated by phase5.beta). */
  betaInviteCodes: defineTable({
    code: v.string(),
    cohort: betaCohortValidator,
    maxUses: v.number(),
    usedCount: v.number(),
    note: v.optional(v.string()),
    createdByAdmin: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    active: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_cohort_created", ["cohort", "createdAt"]),

  /** Phase 5 — optional waitlist for controlled growth. */
  betaWaitlist: defineTable({
    email: v.string(),
    cohort: betaCohortValidator,
    status: betaWaitlistStatusValidator,
    reason: v.optional(v.string()),
    inviteCodeId: v.optional(v.id("betaInviteCodes")),
    userId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_status_created", ["status", "createdAt"])
    .index("by_cohort_created", ["cohort", "createdAt"]),

  /** Phase 5 — users activated into a beta cohort. */
  betaCohortMembers: defineTable({
    userId: v.string(),
    cohort: betaCohortValidator,
    inviteCode: v.optional(v.string()),
    onboardedAt: v.optional(v.number()),
    activatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_cohort_activated", ["cohort", "activatedAt"]),

  /** Phase 5 — community daily challenges (gated by phase5.community_growth). */
  betaDailyChallenges: defineTable({
    dateKey: v.string(),
    title: v.string(),
    description: v.string(),
    badgeId: v.string(),
    active: v.boolean(),
    createdAt: v.number(),
  }).index("by_dateKey", ["dateKey"]),

  betaChallengeCompletions: defineTable({
    userId: v.string(),
    challengeId: v.id("betaDailyChallenges"),
    dateKey: v.string(),
    completedAt: v.number(),
  })
    .index("by_user_date", ["userId", "dateKey"])
    .index("by_challenge", ["challengeId"]),

  /** View counts + rating aggregates for static editorial blog articles (keyed by slug). */
  blogPostStats: defineTable({
    slug: v.string(),
    viewCount: v.number(),
    /** Sum of all submitted integer ratings (1–5). Optional for legacy rows. */
    ratingSum: v.optional(v.number()),
    ratingCount: v.optional(v.number()),
    ratingAvg: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  /** One rating row per anonymous clientId per blog slug (duplicate-submission safeguard). */
  blogPostRatings: defineTable({
    slug: v.string(),
    clientId: v.string(),
    rating: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_slug_client", ["slug", "clientId"]),

  /** GigaLearn weakness → practice → reassess loop (server sync). */
  gigaLearnProgress: defineTable({
    userId: v.string(),
    topicKey: v.string(),
    subject: v.optional(v.string()),
    curriculum: v.optional(v.string()),
    weakness: v.optional(v.string()),
    practiceCount: v.number(),
    lastScore: v.optional(v.number()),
    lastAssessedAt: v.optional(v.number()),
    needsReassess: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_user_topic", ["userId", "topicKey"])
    .index("by_user_updated", ["userId", "updatedAt"]),

  /**
   * GigaLearn Academy — author-created structured courses (additive).
   * Built-in catalogue courses live in web/lib/gigalearn/academy/courseCatalog.ts.
   * Does not replace curriculumEngine or gigaLearnProgress.
   */
  gigaLearnAcademyCourses: defineTable({
    slug: v.string(),
    title: v.string(),
    description: v.string(),
    subject: v.string(),
    category: v.string(),
    difficulty: v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("advanced")
    ),
    durationMinutes: v.number(),
    learningObjectives: v.array(v.string()),
    prerequisites: v.array(v.string()),
    curriculumPreview: v.string(),
    assessmentDescription: v.string(),
    instructorName: v.optional(v.string()),
    instructorBio: v.optional(v.string()),
    access: v.union(
      v.literal("free"),
      v.literal("credits"),
      v.literal("subscription")
    ),
    creditCost: v.optional(v.number()),
    certificateEligible: v.boolean(),
    completionRequirements: v.string(),
    /** JSON-serialized AcademyModule[] pathway */
    modulesJson: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived")
    ),
    authorUserId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_status_category", ["status", "category"])
    .index("by_author", ["authorUserId", "updatedAt"]),

  /**
   * GigaLearn Academy enrolments — consumer pathway progress.
   * Separate from enterprise orgEnrollments. Does not mutate gigaLearnProgress.
   */
  gigaLearnAcademyEnrolments: defineTable({
    userId: v.string(),
    courseSlug: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("withdrawn"),
      v.literal("completed")
    ),
    enrolledAt: v.number(),
    lastModuleId: v.optional(v.string()),
    lastLessonId: v.optional(v.string()),
    progressPercent: v.number(),
    /** Phase 4 — server-tracked pathway lesson completions (JSON string[]). */
    completedLessonIdsJson: v.optional(v.string()),
    /** Instructor approval timestamp for certificate policies that require it. */
    certificateInstructorApprovedAt: v.optional(v.number()),
    certificateInstructorApprovedBy: v.optional(v.string()),
    /** Optional project approval for certificate policies. */
    certificateProjectApprovedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_course", ["courseSlug"])
    .index("by_user_course", ["userId", "courseSlug"])
    .index("by_user_status", ["userId", "status"]),

  /**
   * GigaLearn Academy assessment attempts (Phase 3).
   * Server-authoritative scores — never trust client-supplied grades.
   * Separate from school-curriculum practice / gigaLearnProgress.
   */
  gigaLearnAcademyAttempts: defineTable({
    userId: v.string(),
    courseSlug: v.string(),
    assessmentId: v.string(),
    attemptNumber: v.number(),
    status: v.union(
      v.literal("in_progress"),
      v.literal("submitted"),
      v.literal("graded"),
      v.literal("pending_review")
    ),
    /** Learner answers only (no official score fields from client). */
    answersJson: v.string(),
    score: v.optional(v.number()),
    maxScore: v.optional(v.number()),
    passed: v.optional(v.boolean()),
    resultsJson: v.optional(v.string()),
    feedbackSummary: v.optional(v.string()),
    revisionHint: v.optional(v.string()),
    gradingMode: v.union(
      v.literal("objective"),
      v.literal("ai_assisted"),
      v.literal("instructor_review")
    ),
    gradedBy: v.optional(
      v.union(
        v.literal("objective"),
        v.literal("ai"),
        v.literal("instructor"),
        v.literal("mixed")
      )
    ),
    idempotencyKey: v.string(),
    startedAt: v.number(),
    submittedAt: v.optional(v.number()),
    gradedAt: v.optional(v.number()),
    reviewerUserId: v.optional(v.string()),
    reviewNotes: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_assessment", ["userId", "assessmentId"])
    .index("by_user_course", ["userId", "courseSlug"])
    .index("by_idempotency", ["userId", "assessmentId", "idempotencyKey"])
    .index("by_status", ["status", "updatedAt"]),

  /**
   * GigaLearn Academy certificates (Phase 4).
   * Server-issued only — never trust client completion/grade payloads.
   * Soft-revoke only; never hard-delete learner certificate history.
   */
  gigaLearnAcademyCertificates: defineTable({
    /** Unpredictable public verification id (not sequential). */
    publicId: v.string(),
    /** Deterministic key userId::courseSlug for idempotent issuance. */
    issuanceKey: v.string(),
    userId: v.string(),
    /** Public-safe display name snapshot (never email). */
    learnerDisplayName: v.string(),
    courseSlug: v.string(),
    courseTitle: v.string(),
    issuingOrganization: v.string(),
    issuedAt: v.number(),
    completedAt: v.number(),
    finalGrade: v.optional(v.number()),
    status: v.union(v.literal("valid"), v.literal("revoked")),
    templateVersion: v.string(),
    verificationUrl: v.string(),
    revokedAt: v.optional(v.number()),
    revokedBy: v.optional(v.string()),
    revocationReason: v.optional(v.string()),
    /** Optional cached PDF in Convex storage (regenerable from record). */
    pdfStorageId: v.optional(v.id("_storage")),
    updatedAt: v.number(),
  })
    .index("by_public_id", ["publicId"])
    .index("by_issuance_key", ["issuanceKey"])
    .index("by_user", ["userId"])
    .index("by_user_course", ["userId", "courseSlug"])
    .index("by_status_issued", ["status", "issuedAt"]),

  /** Lightweight rate limit buckets for public certificate verification. */
  gigaLearnAcademyCertVerifyLimits: defineTable({
    bucketKey: v.string(),
    windowStartedAt: v.number(),
    count: v.number(),
  }).index("by_bucket", ["bucketKey"]),

  /**
   * Technology Learning Hub practice sessions (additive).
   * Question banks live in committed JSON loaded by Convex — answer keys never
   * ship in learner-facing queries until submit/grade rules allow.
   */
  gigaLearnTechSessions: defineTable({
    userId: v.string(),
    courseSlug: v.string(),
    mode: v.union(
      v.literal("learn"),
      v.literal("practice_test"),
      v.literal("timed"),
      v.literal("revision"),
      v.literal("topic"),
      v.literal("random"),
      v.literal("challenge")
    ),
    topicId: v.optional(v.string()),
    questionIdsJson: v.string(),
    /** Selected option index per questionId — learner answers only. */
    answersJson: v.string(),
    /**
     * Optional display→original option permutations per questionId.
     * Absent on legacy sessions (identity order). Additive — never required.
     */
    optionPermutationsJson: v.optional(v.string()),
    status: v.union(
      v.literal("in_progress"),
      v.literal("submitted"),
      v.literal("graded")
    ),
    /** Server-authoritative deadline for timed mode (ms since epoch). */
    endsAt: v.optional(v.number()),
    score: v.optional(v.number()),
    maxScore: v.optional(v.number()),
    resultsJson: v.optional(v.string()),
    /** Non-monetary practice XP granted once per graded session (server-only). */
    rewardXp: v.optional(v.number()),
    rewardLabel: v.optional(v.string()),
    rewardGrantedAt: v.optional(v.number()),
    startedAt: v.number(),
    submittedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_course", ["userId", "courseSlug"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_updated", ["userId", "updatedAt"]),

  /**
   * Aggregated GigaLearn practice stats (XP / sessions). Non-monetary.
   * Never trust client-reported scores — updated only from graded sessions.
   */
  gigaLearnPracticeStats: defineTable({
    userId: v.string(),
    courseSlug: v.string(),
    totalXp: v.number(),
    sessionsCompleted: v.number(),
    questionsAttempted: v.number(),
    correctAnswers: v.number(),
    bestPercent: v.number(),
    lastRewardLabel: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_user_course", ["userId", "courseSlug"])
    .index("by_user_updated", ["userId", "updatedAt"]),

  /** Per-user developer API keys (hashed at rest). */
  apiKeys: defineTable({
    userId: v.string(),
    label: v.string(),
    keyPrefix: v.string(),
    keyHash: v.string(),
    scopes: v.array(v.string()),
    createdAt: v.number(),
    revokedAt: v.optional(v.number()),
    lastUsedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_prefix", ["keyPrefix"])
    .index("by_hash", ["keyHash"]),

  /** Daily API usage metering per key. */
  apiKeyUsageDaily: defineTable({
    apiKeyId: v.id("apiKeys"),
    userId: v.string(),
    dateKey: v.string(),
    requestCount: v.number(),
    updatedAt: v.number(),
  }).index("by_key_date", ["apiKeyId", "dateKey"]),

  /** Admin dashboard email invites (magic link onboarding). */
  adminInvites: defineTable({
    email: v.string(),
    role: v.union(v.literal("tester"), v.literal("creator"), v.literal("admin")),
    invitedBy: v.string(),
    invitedAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("revoked")
    ),
    magicLinkToken: v.string(),
    acceptedAt: v.optional(v.number()),
    lastSentAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_status_invited", ["status", "invitedAt"])
    .index("by_token", ["magicLinkToken"]),

  /**
   * External connector OAuth / token connections.
   * Access and refresh tokens are stored encrypted (AES-GCM); never returned to clients.
   */
  connectorConnections: defineTable({
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
    /** Provider-specific non-secret metadata (JSON string). */
    metadataJson: v.optional(v.string()),
    lastError: v.optional(v.string()),
    connectedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_provider", ["userId", "provider"])
    .index("by_provider_status", ["provider", "status"]),

  /** Short-lived OAuth CSRF state for connector authorization. */
  connectorOAuthStates: defineTable({
    state: v.string(),
    userId: v.string(),
    provider: v.string(),
    returnPath: v.string(),
    codeVerifier: v.optional(v.string()),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_state", ["state"])
    .index("by_expires", ["expiresAt"]),

  /** Confirm-before-act staging for consequential connector operations. */
  connectorPendingActions: defineTable({
    userId: v.string(),
    provider: v.string(),
    actionType: v.string(),
    payloadJson: v.string(),
    summary: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("cancelled"),
      v.literal("executed"),
      v.literal("failed")
    ),
    resultJson: v.optional(v.string()),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_status", ["userId", "status"])
    .index("by_expires", ["expiresAt"]),

  /** Connector audit trail (no secrets). */
  connectorAuditLogs: defineTable({
    userId: v.string(),
    provider: v.string(),
    action: v.string(),
    ok: v.boolean(),
    detail: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_provider_created", ["provider", "createdAt"]),

  /**
   * Social login identities (Google / Apple / Microsoft / GitHub).
   * Stable provider `subject` is the join key — never email alone.
   * Separate from connector OAuth (`connectorConnections`).
   */
  authProviderIdentities: defineTable({
    provider: v.union(
      v.literal("google"),
      v.literal("apple"),
      v.literal("microsoft"),
      v.literal("github")
    ),
    subject: v.string(),
    userId: v.string(),
    emailAtLink: v.optional(v.string()),
    createdAt: v.number(),
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_provider_subject", ["provider", "subject"])
    .index("by_user", ["userId"])
    .index("by_user_provider", ["userId", "provider"]),

  /** Short-lived CSRF/PKCE state for social login OAuth (not connector OAuth). */
  authOAuthStates: defineTable({
    state: v.string(),
    provider: v.union(
      v.literal("google"),
      v.literal("apple"),
      v.literal("microsoft"),
      v.literal("github")
    ),
    codeVerifier: v.optional(v.string()),
    nonce: v.optional(v.string()),
    returnPath: v.string(),
    /** When set, OAuth completes as an explicit link for this signed-in user. */
    linkUserId: v.optional(v.string()),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_state", ["state"])
    .index("by_expires", ["expiresAt"]),

  /** One-time codes that hand a minted session to the browser after OAuth. */
  authExchangeCodes: defineTable({
    code: v.string(),
    email: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
    consumedAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_expires", ["expiresAt"]),

  /**
   * Executive assistant orchestration plans.
   * Steps JSON never stores provider secrets — only operation metadata/results summaries.
   */
  assistantOrchestrationPlans: defineTable({
    userId: v.string(),
    goal: v.string(),
    intent: v.string(),
    status: v.union(
      v.literal("planned"),
      v.literal("awaiting_confirmation"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    stepsJson: v.string(),
    missingHintsJson: v.string(),
    notesJson: v.string(),
    reportJson: v.optional(v.string()),
    conversationId: v.optional(v.string()),
    expiresAt: v.number(),
    /** Monotonic revision for CAS / stale-write rejection. */
    revision: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_user_status", ["userId", "status"])
    .index("by_expires", ["expiresAt"]),

  // ─── GigaSocial Awards ─────────────────────────────────────────────
  awardsSeasons: defineTable({
    slug: v.string(),
    title: v.string(),
    year: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("nominations_open"),
      v.literal("voting_open"),
      v.literal("judging"),
      v.literal("finalists_published"),
      v.literal("results_published"),
      v.literal("archived")
    ),
    nominationOpensAt: v.optional(v.number()),
    nominationClosesAt: v.optional(v.number()),
    votingOpensAt: v.optional(v.number()),
    votingClosesAt: v.optional(v.number()),
    /** When true, Paystack promo package checkout may run (default false). */
    promoPaymentsEnabled: v.boolean(),
    /** When true, UI may offer existing creator tip flow (tips ≠ votes). */
    tipsEnabled: v.boolean(),
    publicRulesMarkdown: v.optional(v.string()),
    operatorDisclosure: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_year", ["year"]),

  awardsCategories: defineTable({
    seasonId: v.id("awardsSeasons"),
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    sortOrder: v.number(),
    eligibilityJson: v.string(),
    /** Scoring weights — locked once voting opens for the season. */
    publicVoteWeight: v.number(),
    judgingWeight: v.number(),
    assessmentWeight: v.number(),
    peoplesChoice: v.boolean(),
    formulaLockedAt: v.optional(v.number()),
    assessmentRubricJson: v.optional(v.string()),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_season", ["seasonId", "sortOrder"])
    .index("by_season_slug", ["seasonId", "slug"]),

  awardsNominations: defineTable({
    seasonId: v.id("awardsSeasons"),
    categoryId: v.id("awardsCategories"),
    nominatorUserId: v.string(),
    nomineeUserId: v.optional(v.string()),
    nomineeDisplayName: v.string(),
    nomineeHandle: v.optional(v.string()),
    nomineeEmail: v.optional(v.string()),
    biography: v.string(),
    portfolioLinksJson: v.string(),
    evidenceJson: v.optional(v.string()),
    selfApplication: v.boolean(),
    nomineeConsentAt: v.optional(v.number()),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("awaiting_consent"),
      v.literal("under_review"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("withdrawn"),
      v.literal("declined")
    ),
    rejectionReason: v.optional(v.string()),
    editCutoffAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_season_status", ["seasonId", "status"])
    .index("by_nominator", ["nominatorUserId", "createdAt"])
    .index("by_nominee", ["nomineeUserId", "createdAt"])
    .index("by_category", ["categoryId", "createdAt"]),

  awardsCandidates: defineTable({
    seasonId: v.id("awardsSeasons"),
    categoryId: v.id("awardsCategories"),
    nominationId: v.id("awardsNominations"),
    creatorUserId: v.string(),
    displayName: v.string(),
    handle: v.optional(v.string()),
    biography: v.string(),
    avatarUrl: v.optional(v.string()),
    portfolioLinksJson: v.string(),
    /** Public display code e.g. GSA-2026-00125 — not an auth credential. */
    displayCode: v.string(),
    /** Non-guessable token embedded in share URLs. */
    shareToken: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("finalist"),
      v.literal("winner"),
      v.literal("disqualified"),
      v.literal("withdrawn")
    ),
    verifiedCreator: v.boolean(),
    disqualificationReason: v.optional(v.string()),
    publishedAt: v.number(),
    voteCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_display_code", ["displayCode"])
    .index("by_share_token", ["shareToken"])
    .index("by_season_category", ["seasonId", "categoryId"])
    .index("by_creator", ["creatorUserId", "seasonId"])
    .index("by_status", ["status", "seasonId"]),

  awardsVotes: defineTable({
    seasonId: v.id("awardsSeasons"),
    categoryId: v.id("awardsCategories"),
    candidateId: v.id("awardsCandidates"),
    voterUserId: v.string(),
    createdAt: v.number(),
    ipHash: v.optional(v.string()),
    userAgentHash: v.optional(v.string()),
    flagged: v.optional(v.boolean()),
    flagReason: v.optional(v.string()),
  })
    .index("by_voter_category", ["seasonId", "categoryId", "voterUserId"])
    .index("by_candidate", ["candidateId", "createdAt"])
    .index("by_season_created", ["seasonId", "createdAt"]),

  awardsJudgeScores: defineTable({
    seasonId: v.id("awardsSeasons"),
    categoryId: v.id("awardsCategories"),
    candidateId: v.id("awardsCandidates"),
    judgeUserId: v.string(),
    scoresJson: v.string(),
    notes: v.optional(v.string()),
    submittedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_candidate_judge", ["candidateId", "judgeUserId"])
    .index("by_category", ["categoryId", "submittedAt"]),

  awardsAssessmentScores: defineTable({
    seasonId: v.id("awardsSeasons"),
    categoryId: v.id("awardsCategories"),
    candidateId: v.id("awardsCandidates"),
    assessorUserId: v.string(),
    scoresJson: v.string(),
    notes: v.optional(v.string()),
    submittedAt: v.number(),
    updatedAt: v.number(),
  }).index("by_candidate", ["candidateId"]),

  awardsPromoPackages: defineTable({
    seasonId: v.id("awardsSeasons"),
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    priceGhs: v.number(),
    benefitsJson: v.string(),
    sortOrder: v.number(),
    active: v.boolean(),
    /** Hard rule: packages never grant votes or score changes. */
    influencesCompetition: v.literal(false),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_season", ["seasonId", "sortOrder"]),

  awardsPromoOrders: defineTable({
    seasonId: v.id("awardsSeasons"),
    packageId: v.id("awardsPromoPackages"),
    buyerUserId: v.string(),
    candidateId: v.optional(v.id("awardsCandidates")),
    amountGhs: v.number(),
    currency: v.literal("GHS"),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("failed"),
      v.literal("refunded")
    ),
    paymentReference: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_reference", ["paymentReference"])
    .index("by_buyer", ["buyerUserId", "createdAt"])
    .index("by_season", ["seasonId", "createdAt"]),

  awardsSponsors: defineTable({
    seasonId: v.id("awardsSeasons"),
    name: v.string(),
    contactEmail: v.optional(v.string()),
    tierLabel: v.optional(v.string()),
    amountGhs: v.optional(v.number()),
    paymentStatus: v.union(
      v.literal("prospect"),
      v.literal("contracted"),
      v.literal("paid"),
      v.literal("fulfilled"),
      v.literal("cancelled")
    ),
    benefitsJson: v.optional(v.string()),
    campaignStartsAt: v.optional(v.number()),
    campaignEndsAt: v.optional(v.number()),
    publicRecognition: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_season", ["seasonId", "createdAt"]),

  awardsPrizes: defineTable({
    seasonId: v.id("awardsSeasons"),
    categoryId: v.optional(v.id("awardsCategories")),
    title: v.string(),
    description: v.string(),
    /** Only advertisable prizes may appear as “confirmed” in public UI. */
    advertisable: v.boolean(),
    fundedOrContracted: v.boolean(),
    sponsorId: v.optional(v.id("awardsSponsors")),
    fulfilmentStatus: v.union(
      v.literal("planned"),
      v.literal("ready"),
      v.literal("awarded"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_season", ["seasonId", "createdAt"]),

  awardsAuditLog: defineTable({
    seasonId: v.optional(v.id("awardsSeasons")),
    actor: v.string(),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    detailJson: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_season_created", ["seasonId", "createdAt"])
    .index("by_created", ["createdAt"]),
});
