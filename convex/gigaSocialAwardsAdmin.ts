/**
 * GigaSocial Awards — privileged admin operations (ensureAdminAccess).
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_PACKAGES,
  OPERATOR_DISCLOSURE,
  computeCategoryRankings,
  formatDisplayCode,
  writeAudit,
} from "./gigaSocialAwards";
import { assertWeightsSane } from "./gigaSocialAwardsMath";
import {
  parseAndClampRubricScores,
  seasonStatusLocksFormula,
  secureRandomToken,
} from "./gigaSocialAwardsPolicy";

function now() {
  return Date.now();
}

async function nextDisplaySequence(
  ctx: { db: import("./_generated/server").MutationCtx["db"] },
  year: number
): Promise<number> {
  const prefix = `GSA-${year}-`;
  const all = await ctx.db.query("awardsCandidates").collect();
  let max = 0;
  for (const c of all) {
    if (!c.displayCode.startsWith(prefix)) continue;
    const n = Number(c.displayCode.slice(prefix.length));
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return max + 1;
}

function randomShareToken(): string {
  return secureRandomToken("st_", 26);
}

/** Create a draft season with default categories + free/paid package catalogue. */
export const bootstrapSeason = mutation({
  args: {
    ...adminCredentialArgs,
    year: v.number(),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const year = Math.floor(args.year);
    if (year < 2024 || year > 2100) throw new Error("Invalid year.");
    const slug = (args.slug?.trim() || `gsa-${year}`).toLowerCase();
    const existing = await ctx.db
      .query("awardsSeasons")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    // Bootstrap is intentionally idempotent: a retry or repeat click must not
    // create duplicate seasons/categories or surface a scary server error.
    if (existing) {
      return {
        ok: true as const,
        seasonId: existing._id,
        slug: existing.slug,
        alreadyExists: true as const,
      };
    }

    const t = now();
    const seasonId = await ctx.db.insert("awardsSeasons", {
      slug,
      title: args.title?.trim() || `GigaSocial Awards ${year}`,
      year,
      status: "draft",
      promoPaymentsEnabled: false,
      tipsEnabled: false,
      publicRulesMarkdown:
        "## Rules\n\n- Free nominations and free voting.\n- Packages never generate votes or change scores.\n- Tips are voluntary and do not affect rankings.\n- Prizes are only shown when funded or contractually guaranteed.\n",
      operatorDisclosure: OPERATOR_DISCLOSURE,
      createdAt: t,
      updatedAt: t,
    });

    for (const cat of DEFAULT_CATEGORIES) {
      await ctx.db.insert("awardsCategories", {
        seasonId,
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        sortOrder: cat.sortOrder,
        eligibilityJson: JSON.stringify({
          regionHint: "Ghana-first, Africa expansion",
          requiresConsent: true,
          minBiographyChars: 40,
        }),
        publicVoteWeight: 40,
        judgingWeight: 40,
        assessmentWeight: 20,
        peoplesChoice: false,
        assessmentRubricJson: JSON.stringify({
          dimensions: ["quality", "originality", "impact", "consistency"],
        }),
        active: true,
        createdAt: t,
        updatedAt: t,
      });
    }

    for (const pkg of DEFAULT_PACKAGES) {
      await ctx.db.insert("awardsPromoPackages", {
        seasonId,
        slug: pkg.slug,
        name: pkg.name,
        description: pkg.description,
        priceGhs: pkg.priceGhs,
        benefitsJson: JSON.stringify(pkg.benefits),
        sortOrder: pkg.sortOrder,
        active: true,
        influencesCompetition: false,
        createdAt: t,
        updatedAt: t,
      });
    }

    await writeAudit(ctx, {
      seasonId,
      actor: "admin",
      action: "season_bootstrapped",
      entityType: "awardsSeasons",
      entityId: seasonId,
      detail: { slug, year },
    });

    return { ok: true as const, seasonId, slug };
  },
});

export const setSeasonStatus = mutation({
  args: {
    ...adminCredentialArgs,
    seasonId: v.id("awardsSeasons"),
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
    confirm: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    if (!args.confirm) throw new Error("Set confirm=true for season status changes.");
    const season = await ctx.db.get(args.seasonId);
    if (!season) throw new Error("Season not found.");

    const t = now();
    if (seasonStatusLocksFormula(args.status)) {
      const cats = await ctx.db
        .query("awardsCategories")
        .withIndex("by_season", (q) => q.eq("seasonId", season._id))
        .collect();
      for (const cat of cats) {
        if (!cat.formulaLockedAt) {
          await ctx.db.patch(cat._id, { formulaLockedAt: t, updatedAt: t });
        }
      }
    }

    await ctx.db.patch(season._id, {
      status: args.status,
      nominationOpensAt: args.nominationOpensAt ?? season.nominationOpensAt,
      nominationClosesAt: args.nominationClosesAt ?? season.nominationClosesAt,
      votingOpensAt: args.votingOpensAt ?? season.votingOpensAt,
      votingClosesAt: args.votingClosesAt ?? season.votingClosesAt,
      updatedAt: t,
    });

    await writeAudit(ctx, {
      seasonId: season._id,
      actor: "admin",
      action: "season_status_changed",
      entityType: "awardsSeasons",
      entityId: season._id,
      detail: { from: season.status, to: args.status },
    });
    return { ok: true as const };
  },
});

export const updateCategoryFormula = mutation({
  args: {
    ...adminCredentialArgs,
    categoryId: v.id("awardsCategories"),
    publicVoteWeight: v.number(),
    judgingWeight: v.number(),
    assessmentWeight: v.number(),
    peoplesChoice: v.boolean(),
    confirm: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    if (!args.confirm) throw new Error("Set confirm=true to change scoring formula.");
    const cat = await ctx.db.get(args.categoryId);
    if (!cat) throw new Error("Category not found.");
    const season = await ctx.db.get(cat.seasonId);
    if (cat.formulaLockedAt || (season && seasonStatusLocksFormula(season.status))) {
      throw new Error(
        "Scoring formula is locked after voting opened. Create an audited exception process before changing."
      );
    }
    assertWeightsSane({
      publicVoteWeight: args.publicVoteWeight,
      judgingWeight: args.judgingWeight,
      assessmentWeight: args.assessmentWeight,
      peoplesChoice: args.peoplesChoice,
    });
    const t = now();
    await ctx.db.patch(cat._id, {
      publicVoteWeight: args.publicVoteWeight,
      judgingWeight: args.judgingWeight,
      assessmentWeight: args.assessmentWeight,
      peoplesChoice: args.peoplesChoice,
      updatedAt: t,
    });
    await writeAudit(ctx, {
      seasonId: cat.seasonId,
      actor: "admin",
      action: "formula_updated",
      entityType: "awardsCategories",
      entityId: cat._id,
      detail: {
        publicVoteWeight: args.publicVoteWeight,
        judgingWeight: args.judgingWeight,
        assessmentWeight: args.assessmentWeight,
        peoplesChoice: args.peoplesChoice,
      },
    });
    return { ok: true as const };
  },
});

export const setPromoPaymentsEnabled = mutation({
  args: {
    ...adminCredentialArgs,
    seasonId: v.id("awardsSeasons"),
    enabled: v.boolean(),
    confirm: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    if (!args.confirm) throw new Error("Set confirm=true.");
    const season = await ctx.db.get(args.seasonId);
    if (!season) throw new Error("Season not found.");
    await ctx.db.patch(season._id, {
      promoPaymentsEnabled: args.enabled,
      updatedAt: now(),
    });
    await writeAudit(ctx, {
      seasonId: season._id,
      actor: "admin",
      action: "promo_payments_toggled",
      entityType: "awardsSeasons",
      entityId: season._id,
      detail: { enabled: args.enabled },
    });
    return { ok: true as const };
  },
});

export const setTipsEnabled = mutation({
  args: {
    ...adminCredentialArgs,
    seasonId: v.id("awardsSeasons"),
    enabled: v.boolean(),
    confirm: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    if (!args.confirm) throw new Error("Set confirm=true.");
    const season = await ctx.db.get(args.seasonId);
    if (!season) throw new Error("Season not found.");
    await ctx.db.patch(season._id, {
      tipsEnabled: args.enabled,
      updatedAt: now(),
    });
    await writeAudit(ctx, {
      seasonId: season._id,
      actor: "admin",
      action: "tips_toggled",
      entityType: "awardsSeasons",
      entityId: season._id,
      detail: { enabled: args.enabled },
    });
    return { ok: true as const };
  },
});

export const updatePromoPackage = mutation({
  args: {
    ...adminCredentialArgs,
    packageId: v.id("awardsPromoPackages"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    priceGhs: v.optional(v.number()),
    active: v.optional(v.boolean()),
    benefits: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) throw new Error("Package not found.");
    if (args.priceGhs !== undefined && (!Number.isFinite(args.priceGhs) || args.priceGhs < 0)) {
      throw new Error("Invalid price.");
    }
    await ctx.db.patch(pkg._id, {
      name: args.name?.trim() || pkg.name,
      description: args.description?.trim() || pkg.description,
      priceGhs: args.priceGhs ?? pkg.priceGhs,
      active: args.active ?? pkg.active,
      benefitsJson: args.benefits
        ? JSON.stringify(args.benefits.map((b) => b.trim()).filter(Boolean))
        : pkg.benefitsJson,
      influencesCompetition: false,
      updatedAt: now(),
    });
    return { ok: true as const };
  },
});

/** Approve nomination → public candidate with display code + share token. */
export const approveNomination = mutation({
  args: {
    ...adminCredentialArgs,
    nominationId: v.id("awardsNominations"),
    confirm: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    if (!args.confirm) throw new Error("Set confirm=true to approve.");
    const nomination = await ctx.db.get(args.nominationId);
    if (!nomination) throw new Error("Nomination not found.");
    if (nomination.status !== "under_review" && nomination.status !== "submitted") {
      throw new Error(`Cannot approve nomination in status ${nomination.status}.`);
    }
    if (!nomination.nomineeConsentAt || !nomination.nomineeUserId) {
      throw new Error("Nominee consent is required before publishing a candidate.");
    }

    const season = await ctx.db.get(nomination.seasonId);
    if (!season) throw new Error("Season not found.");

    const existing = await ctx.db
      .query("awardsCandidates")
      .withIndex("by_creator", (q) =>
        q.eq("creatorUserId", nomination.nomineeUserId!).eq("seasonId", nomination.seasonId)
      )
      .collect();
    if (existing.some((c) => c.categoryId === nomination.categoryId && c.status !== "withdrawn")) {
      throw new Error("Creator already has a candidate in this category.");
    }

    const profile = await ctx.db
      .query("socialProfiles")
      .withIndex("by_user", (q) => q.eq("userId", nomination.nomineeUserId!))
      .first();
    const creatorProfile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", nomination.nomineeUserId!))
      .first();

    const t = now();
    const seq = await nextDisplaySequence(ctx, season.year);
    const displayCode = formatDisplayCode(season.year, seq);
    const shareToken = randomShareToken();

    const candidateId = await ctx.db.insert("awardsCandidates", {
      seasonId: nomination.seasonId,
      categoryId: nomination.categoryId,
      nominationId: nomination._id,
      creatorUserId: nomination.nomineeUserId!,
      displayName: nomination.nomineeDisplayName,
      handle: nomination.nomineeHandle ?? profile?.handle,
      biography: nomination.biography,
      avatarUrl: profile?.avatarUrl,
      portfolioLinksJson: nomination.portfolioLinksJson,
      displayCode,
      shareToken,
      status: "active",
      verifiedCreator: Boolean(creatorProfile?.verified),
      publishedAt: t,
      voteCount: 0,
      createdAt: t,
      updatedAt: t,
    });

    await ctx.db.patch(nomination._id, {
      status: "approved",
      updatedAt: t,
    });

    await ctx.db.insert("socialNotifications", {
      recipientId: nomination.nomineeUserId!,
      type: "creator",
      message: `You are an official GigaSocial Awards candidate (${displayCode}). Share your voting link.`,
      createdAt: t,
      read: false,
    });

    await writeAudit(ctx, {
      seasonId: nomination.seasonId,
      actor: "admin",
      action: "nomination_approved",
      entityType: "awardsCandidates",
      entityId: candidateId,
      detail: { displayCode, nominationId: nomination._id },
    });

    return { ok: true as const, candidateId, displayCode, shareToken };
  },
});

export const rejectNomination = mutation({
  args: {
    ...adminCredentialArgs,
    nominationId: v.id("awardsNominations"),
    reason: v.string(),
    confirm: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    if (!args.confirm) throw new Error("Set confirm=true.");
    const nomination = await ctx.db.get(args.nominationId);
    if (!nomination) throw new Error("Nomination not found.");
    const reason = args.reason.trim().slice(0, 500);
    if (reason.length < 5) throw new Error("Provide a rejection reason.");
    await ctx.db.patch(nomination._id, {
      status: "rejected",
      rejectionReason: reason,
      updatedAt: now(),
    });
    await writeAudit(ctx, {
      seasonId: nomination.seasonId,
      actor: "admin",
      action: "nomination_rejected",
      entityType: "awardsNominations",
      entityId: nomination._id,
      detail: { reason },
    });
    return { ok: true as const };
  },
});

export const disqualifyCandidate = mutation({
  args: {
    ...adminCredentialArgs,
    candidateId: v.id("awardsCandidates"),
    reason: v.string(),
    confirm: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    if (!args.confirm) throw new Error("Set confirm=true.");
    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate) throw new Error("Candidate not found.");
    const reason = args.reason.trim().slice(0, 500);
    await ctx.db.patch(candidate._id, {
      status: "disqualified",
      disqualificationReason: reason,
      updatedAt: now(),
    });
    await writeAudit(ctx, {
      seasonId: candidate.seasonId,
      actor: "admin",
      action: "candidate_disqualified",
      entityType: "awardsCandidates",
      entityId: candidate._id,
      detail: { reason },
    });
    return { ok: true as const };
  },
});

export const upsertPrize = mutation({
  args: {
    ...adminCredentialArgs,
    seasonId: v.id("awardsSeasons"),
    prizeId: v.optional(v.id("awardsPrizes")),
    categoryId: v.optional(v.id("awardsCategories")),
    title: v.string(),
    description: v.string(),
    fundedOrContracted: v.boolean(),
    advertisable: v.boolean(),
    fulfilmentStatus: v.union(
      v.literal("planned"),
      v.literal("ready"),
      v.literal("awarded"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
    confirm: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    if (!args.confirm) throw new Error("Set confirm=true.");
    if (args.advertisable && !args.fundedOrContracted) {
      throw new Error("Cannot advertise a prize that is not funded or contractually guaranteed.");
    }
    const t = now();
    if (args.prizeId) {
      const existing = await ctx.db.get(args.prizeId);
      if (!existing) throw new Error("Prize not found.");
      await ctx.db.patch(existing._id, {
        title: args.title.trim().slice(0, 120),
        description: args.description.trim().slice(0, 2000),
        categoryId: args.categoryId,
        fundedOrContracted: args.fundedOrContracted,
        advertisable: args.advertisable,
        fulfilmentStatus: args.fulfilmentStatus,
        updatedAt: t,
      });
      await writeAudit(ctx, {
        seasonId: args.seasonId,
        actor: "admin",
        action: "prize_updated",
        entityType: "awardsPrizes",
        entityId: existing._id,
      });
      return { ok: true as const, prizeId: existing._id };
    }
    const prizeId = await ctx.db.insert("awardsPrizes", {
      seasonId: args.seasonId,
      categoryId: args.categoryId,
      title: args.title.trim().slice(0, 120),
      description: args.description.trim().slice(0, 2000),
      fundedOrContracted: args.fundedOrContracted,
      advertisable: args.advertisable,
      fulfilmentStatus: args.fulfilmentStatus,
      createdAt: t,
      updatedAt: t,
    });
    await writeAudit(ctx, {
      seasonId: args.seasonId,
      actor: "admin",
      action: "prize_created",
      entityType: "awardsPrizes",
      entityId: prizeId,
    });
    return { ok: true as const, prizeId };
  },
});

export const upsertSponsor = mutation({
  args: {
    ...adminCredentialArgs,
    seasonId: v.id("awardsSeasons"),
    sponsorId: v.optional(v.id("awardsSponsors")),
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
    publicRecognition: v.boolean(),
    confirm: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    if (!args.confirm) throw new Error("Set confirm=true.");
    const t = now();
    if (args.sponsorId) {
      const existing = await ctx.db.get(args.sponsorId);
      if (!existing) throw new Error("Sponsor not found.");
      await ctx.db.patch(existing._id, {
        name: args.name.trim().slice(0, 120),
        contactEmail: args.contactEmail?.trim().toLowerCase(),
        tierLabel: args.tierLabel?.trim(),
        amountGhs: args.amountGhs,
        paymentStatus: args.paymentStatus,
        publicRecognition: args.publicRecognition,
        updatedAt: t,
      });
      return { ok: true as const, sponsorId: existing._id };
    }
    const sponsorId = await ctx.db.insert("awardsSponsors", {
      seasonId: args.seasonId,
      name: args.name.trim().slice(0, 120),
      contactEmail: args.contactEmail?.trim().toLowerCase(),
      tierLabel: args.tierLabel?.trim(),
      amountGhs: args.amountGhs,
      paymentStatus: args.paymentStatus,
      publicRecognition: args.publicRecognition,
      createdAt: t,
      updatedAt: t,
    });
    await writeAudit(ctx, {
      seasonId: args.seasonId,
      actor: "admin",
      action: "sponsor_created",
      entityType: "awardsSponsors",
      entityId: sponsorId,
    });
    return { ok: true as const, sponsorId };
  },
});

export const submitJudgeScore = mutation({
  args: {
    ...adminCredentialArgs,
    candidateId: v.id("awardsCandidates"),
    judgeUserId: v.string(),
    /** JSON object of rubric dimension → 0–100 score. */
    scoresJson: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate) throw new Error("Candidate not found.");
    const scoresJson = parseAndClampRubricScores(args.scoresJson);
    const t = now();
    const existing = await ctx.db
      .query("awardsJudgeScores")
      .withIndex("by_candidate_judge", (q) =>
        q.eq("candidateId", candidate._id).eq("judgeUserId", args.judgeUserId.trim())
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        scoresJson,
        notes: args.notes?.trim().slice(0, 1000),
        updatedAt: t,
      });
      return { ok: true as const, scoreId: existing._id };
    }
    const scoreId = await ctx.db.insert("awardsJudgeScores", {
      seasonId: candidate.seasonId,
      categoryId: candidate.categoryId,
      candidateId: candidate._id,
      judgeUserId: args.judgeUserId.trim(),
      scoresJson,
      notes: args.notes?.trim().slice(0, 1000),
      submittedAt: t,
      updatedAt: t,
    });
    await writeAudit(ctx, {
      seasonId: candidate.seasonId,
      actor: "admin",
      action: "judge_score_submitted",
      entityType: "awardsJudgeScores",
      entityId: scoreId,
    });
    return { ok: true as const, scoreId };
  },
});

export const submitAssessmentScore = mutation({
  args: {
    ...adminCredentialArgs,
    candidateId: v.id("awardsCandidates"),
    assessorUserId: v.string(),
    scoresJson: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate) throw new Error("Candidate not found.");
    const scoresJson = parseAndClampRubricScores(args.scoresJson);
    const t = now();
    const assessorUserId = args.assessorUserId.trim();
    if (!assessorUserId) throw new Error("assessorUserId is required.");
    const rows = await ctx.db
      .query("awardsAssessmentScores")
      .withIndex("by_candidate", (q) => q.eq("candidateId", candidate._id))
      .collect();
    const existing = rows.find((r) => r.assessorUserId === assessorUserId) ?? null;
    if (existing) {
      await ctx.db.patch(existing._id, {
        scoresJson,
        notes: args.notes?.trim().slice(0, 1000),
        updatedAt: t,
      });
      return { ok: true as const, scoreId: existing._id };
    }
    const scoreId = await ctx.db.insert("awardsAssessmentScores", {
      seasonId: candidate.seasonId,
      categoryId: candidate.categoryId,
      candidateId: candidate._id,
      assessorUserId,
      scoresJson,
      notes: args.notes?.trim().slice(0, 1000),
      submittedAt: t,
      updatedAt: t,
    });
    await writeAudit(ctx, {
      seasonId: candidate.seasonId,
      actor: "admin",
      action: "assessment_score_submitted",
      entityType: "awardsAssessmentScores",
      entityId: scoreId,
    });
    return { ok: true as const, scoreId };
  },
});

export const getAdminSeasonOverview = query({
  args: {
    ...adminCredentialArgs,
    seasonId: v.optional(v.id("awardsSeasons")),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const seasons = await ctx.db.query("awardsSeasons").collect();
    const season =
      (args.seasonId && (await ctx.db.get(args.seasonId))) ||
      seasons.sort((a, b) => b.year - a.year)[0] ||
      null;
    if (!season) {
      return { seasons: [], season: null, nominations: [], candidates: [], packages: [], prizes: [], sponsors: [] };
    }
    const nominations = await ctx.db
      .query("awardsNominations")
      .withIndex("by_season_status", (q) => q.eq("seasonId", season._id))
      .collect();
    const candidates = await ctx.db
      .query("awardsCandidates")
      .withIndex("by_season_category", (q) => q.eq("seasonId", season._id))
      .collect();
    const packages = await ctx.db
      .query("awardsPromoPackages")
      .withIndex("by_season", (q) => q.eq("seasonId", season._id))
      .collect();
    const prizes = await ctx.db
      .query("awardsPrizes")
      .withIndex("by_season", (q) => q.eq("seasonId", season._id))
      .collect();
    const sponsors = await ctx.db
      .query("awardsSponsors")
      .withIndex("by_season", (q) => q.eq("seasonId", season._id))
      .collect();
    return {
      seasons: seasons.map((s) => ({
        seasonId: s._id,
        slug: s.slug,
        title: s.title,
        year: s.year,
        status: s.status,
        promoPaymentsEnabled: s.promoPaymentsEnabled,
        tipsEnabled: s.tipsEnabled,
      })),
      season: {
        seasonId: season._id,
        slug: season.slug,
        title: season.title,
        year: season.year,
        status: season.status,
        promoPaymentsEnabled: season.promoPaymentsEnabled,
        tipsEnabled: season.tipsEnabled,
      },
      nominations: nominations
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 100)
        .map((n) => ({
          nominationId: n._id,
          status: n.status,
          displayName: n.nomineeDisplayName,
          selfApplication: n.selfApplication,
          hasConsent: Boolean(n.nomineeConsentAt),
          categoryId: n.categoryId,
          createdAt: n.createdAt,
        })),
      candidates: candidates.map((c) => ({
        candidateId: c._id,
        displayCode: c.displayCode,
        displayName: c.displayName,
        status: c.status,
        voteCount: c.voteCount,
        categoryId: c.categoryId,
      })),
      packages: packages.map((p) => ({
        packageId: p._id,
        slug: p.slug,
        name: p.name,
        priceGhs: p.priceGhs,
        active: p.active,
        influencesCompetition: false as const,
      })),
      prizes: prizes.map((p) => ({
        prizeId: p._id,
        title: p.title,
        advertisable: p.advertisable,
        fundedOrContracted: p.fundedOrContracted,
        fulfilmentStatus: p.fulfilmentStatus,
      })),
      sponsors: sponsors.map((s) => ({
        sponsorId: s._id,
        name: s.name,
        paymentStatus: s.paymentStatus,
        amountGhs: s.amountGhs ?? null,
        publicRecognition: s.publicRecognition,
      })),
    };
  },
});

export const getProvisionalRankings = query({
  args: {
    ...adminCredentialArgs,
    categoryId: v.id("awardsCategories"),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error("Category not found.");
    return await computeCategoryRankings(ctx, category);
  },
});

export const publishFinalists = mutation({
  args: {
    ...adminCredentialArgs,
    categoryId: v.id("awardsCategories"),
    candidateIds: v.array(v.id("awardsCandidates")),
    confirm: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    if (!args.confirm) throw new Error("Set confirm=true.");
    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error("Category not found.");
    const t = now();
    for (const id of args.candidateIds) {
      const c = await ctx.db.get(id);
      if (!c || c.categoryId !== category._id) continue;
      await ctx.db.patch(c._id, { status: "finalist", updatedAt: t });
    }
    await writeAudit(ctx, {
      seasonId: category.seasonId,
      actor: "admin",
      action: "finalists_published",
      entityType: "awardsCategories",
      entityId: category._id,
      detail: { candidateIds: args.candidateIds },
    });
    return { ok: true as const };
  },
});

/** Guard used in tests: package fulfilment must never touch votes/scores. */
export function assertPackageOrderSafe(order: {
  influencesVotes?: boolean;
  influencesScores?: boolean;
}): void {
  if (order.influencesVotes || order.influencesScores) {
    throw new Error("Promo packages must never influence votes or scores.");
  }
}
