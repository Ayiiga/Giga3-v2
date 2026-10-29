/**
 * GigaSocial Awards — public queries and creator/session mutations.
 * Admin mutations live in gigaSocialAwardsAdmin.ts.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import {
  assertWeightsSane,
  averageRubricScore,
  combineWeightedScore,
  compareCandidatesForRanking,
  formatDisplayCode,
  publicVoteComponent,
  type ScoreWeights,
} from "./gigaSocialAwardsMath";
import { assertCanRespondToNomination } from "./gigaSocialAwardsPolicy";

const OPERATOR_DISCLOSURE =
  "GigaSocial Awards is operated by Giga3 AI. It is not government-endorsed unless a documented endorsement is published.";

const DEFAULT_CATEGORIES = [
  {
    slug: "creator-of-the-year",
    name: "GigaSocial Creator of the Year",
    description: "Outstanding all-round creators who consistently deliver valuable content.",
    sortOrder: 1,
  },
  {
    slug: "musician-of-the-year",
    name: "GigaSocial Musician of the Year",
    description: "Musicians recognised for quality, originality, performance, and verified achievements.",
    sortOrder: 2,
  },
  {
    slug: "most-influential",
    name: "GigaSocial Most Influential Creator",
    description: "Creators with responsible influence and verified community impact.",
    sortOrder: 3,
  },
  {
    slug: "best-comedy",
    name: "GigaSocial Best Comedy Creator",
    description: "Comedy creators recognised for originality, delivery, and creative quality.",
    sortOrder: 4,
  },
  {
    slug: "emerging-creator",
    name: "GigaSocial Emerging Creator of the Year",
    description: "Rising creators recognised for originality, consistency, and potential.",
    sortOrder: 5,
  },
] as const;

const DEFAULT_PACKAGES = [
  {
    slug: "free",
    name: "Free Candidate",
    priceGhs: 0,
    description: "Full entry and free public voting — no purchase required.",
    benefits: ["Public candidate profile", "Free votes", "Shareable voting link"],
    sortOrder: 1,
  },
  {
    slug: "spotlight",
    name: "Creator Spotlight",
    priceGhs: 20,
    description: "Optional promotion. Does not generate votes or change scores.",
    benefits: ["Profile customisation", "Campaign graphic templates"],
    sortOrder: 2,
  },
  {
    slug: "pro",
    name: "Creator Pro",
    priceGhs: 50,
    description: "Optional promotion tools. Never unlocks easier judging or wins.",
    benefits: ["Spotlight benefits", "Promotional analytics", "Eligible placements"],
    sortOrder: 3,
  },
  {
    slug: "campaign",
    name: "Creator Campaign",
    priceGhs: 100,
    description: "Optional campaign management. Cannot circumvent eligibility.",
    benefits: ["Pro benefits", "Campaign-management tools", "Priority editorial review queue (not score boost)"],
    sortOrder: 4,
  },
] as const;

function now() {
  return Date.now();
}

function parseLinks(json: string): string[] {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);
  } catch {
    return [];
  }
}

async function writeAudit(
  ctx: { db: import("./_generated/server").MutationCtx["db"] },
  args: {
    seasonId?: Id<"awardsSeasons">;
    actor: string;
    action: string;
    entityType: string;
    entityId?: string;
    detail?: Record<string, unknown>;
  }
) {
  await ctx.db.insert("awardsAuditLog", {
    seasonId: args.seasonId,
    actor: args.actor,
    action: args.action,
    entityType: args.entityType,
    entityId: args.entityId,
    detailJson: args.detail ? JSON.stringify(args.detail) : undefined,
    createdAt: now(),
  });
}

function seasonPublic(season: Doc<"awardsSeasons">) {
  return {
    seasonId: season._id,
    slug: season.slug,
    title: season.title,
    year: season.year,
    status: season.status,
    nominationOpensAt: season.nominationOpensAt ?? null,
    nominationClosesAt: season.nominationClosesAt ?? null,
    votingOpensAt: season.votingOpensAt ?? null,
    votingClosesAt: season.votingClosesAt ?? null,
    promoPaymentsEnabled: season.promoPaymentsEnabled,
    tipsEnabled: season.tipsEnabled,
    publicRulesMarkdown: season.publicRulesMarkdown ?? null,
    operatorDisclosure: season.operatorDisclosure,
  };
}

function categoryPublic(cat: Doc<"awardsCategories">) {
  const weights: ScoreWeights = {
    publicVoteWeight: cat.publicVoteWeight,
    judgingWeight: cat.judgingWeight,
    assessmentWeight: cat.assessmentWeight,
    peoplesChoice: cat.peoplesChoice,
  };
  return {
    categoryId: cat._id,
    slug: cat.slug,
    name: cat.name,
    description: cat.description,
    sortOrder: cat.sortOrder,
    peoplesChoice: cat.peoplesChoice,
    formula: {
      publicVoteWeight: cat.publicVoteWeight,
      judgingWeight: cat.judgingWeight,
      assessmentWeight: cat.assessmentWeight,
      peoplesChoice: cat.peoplesChoice,
      locked: Boolean(cat.formulaLockedAt),
    },
    eligibilityJson: cat.eligibilityJson,
    assessmentRubricJson: cat.assessmentRubricJson ?? null,
    weights,
  };
}

function nominationsOpen(season: Doc<"awardsSeasons">, t = now()): boolean {
  if (season.status !== "nominations_open") return false;
  if (season.nominationOpensAt && t < season.nominationOpensAt) return false;
  if (season.nominationClosesAt && t > season.nominationClosesAt) return false;
  return true;
}

function votingOpen(season: Doc<"awardsSeasons">, t = now()): boolean {
  if (season.status !== "voting_open") return false;
  if (season.votingOpensAt && t < season.votingOpensAt) return false;
  if (season.votingClosesAt && t > season.votingClosesAt) return false;
  return true;
}

/** Public: list published / active seasons (never drafts). */
export const listPublicSeasons = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("awardsSeasons").collect();
    return all
      .filter((s) => s.status !== "draft" && s.status !== "archived")
      .sort((a, b) => b.year - a.year)
      .map(seasonPublic);
  },
});

export const getPublicSeason = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const season = await ctx.db
      .query("awardsSeasons")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug.trim()))
      .first();
    if (!season || season.status === "draft") return null;
    const categories = (
      await ctx.db
        .query("awardsCategories")
        .withIndex("by_season", (q) => q.eq("seasonId", season._id))
        .collect()
    )
      .filter((c) => c.active)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(categoryPublic);

    const prizes = (
      await ctx.db
        .query("awardsPrizes")
        .withIndex("by_season", (q) => q.eq("seasonId", season._id))
        .collect()
    )
      .filter((p) => p.advertisable && p.fundedOrContracted)
      .map((p) => ({
        prizeId: p._id,
        title: p.title,
        description: p.description,
        categoryId: p.categoryId ?? null,
        fulfilmentStatus: p.fulfilmentStatus,
      }));

    const packages = (
      await ctx.db
        .query("awardsPromoPackages")
        .withIndex("by_season", (q) => q.eq("seasonId", season._id))
        .collect()
    )
      .filter((p) => p.active)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => ({
        packageId: p._id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        priceGhs: p.priceGhs,
        benefits: parseLinks(p.benefitsJson),
        influencesCompetition: false as const,
        checkoutAvailable: season.promoPaymentsEnabled && p.priceGhs > 0,
      }));

    return {
      ...seasonPublic(season),
      categories,
      prizes,
      packages,
      nominationsOpen: nominationsOpen(season),
      votingOpen: votingOpen(season),
    };
  },
});

export const listPublicCandidates = query({
  args: {
    seasonSlug: v.string(),
    categorySlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const season = await ctx.db
      .query("awardsSeasons")
      .withIndex("by_slug", (q) => q.eq("slug", args.seasonSlug.trim()))
      .first();
    if (!season || season.status === "draft") return [];

    let categoryId: Id<"awardsCategories"> | null = null;
    if (args.categorySlug) {
      const cat = await ctx.db
        .query("awardsCategories")
        .withIndex("by_season_slug", (q) =>
          q.eq("seasonId", season._id).eq("slug", args.categorySlug!.trim())
        )
        .first();
      if (!cat) return [];
      categoryId = cat._id;
    }

    const rows = await ctx.db
      .query("awardsCandidates")
      .withIndex("by_season_category", (q) => q.eq("seasonId", season._id))
      .collect();

    const publishResults =
      season.status === "finalists_published" || season.status === "results_published";

    return rows
      .filter((c) => (categoryId ? c.categoryId === categoryId : true))
      .filter((c) => c.status !== "disqualified" && c.status !== "withdrawn")
      .map((c) => ({
        candidateId: c._id,
        displayCode: c.displayCode,
        displayName: c.displayName,
        handle: c.handle ?? null,
        avatarUrl: c.avatarUrl ?? null,
        categoryId: c.categoryId,
        verifiedCreator: c.verifiedCreator,
        status: c.status,
        voteCount: publishResults || season.status === "voting_open" ? c.voteCount : null,
        votingClosesAt: season.votingClosesAt ?? null,
      }));
  },
});

export const getPublicCandidate = query({
  args: {
    displayCode: v.optional(v.string()),
    shareToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let candidate: Doc<"awardsCandidates"> | null = null;
    if (args.shareToken?.trim()) {
      candidate = await ctx.db
        .query("awardsCandidates")
        .withIndex("by_share_token", (q) => q.eq("shareToken", args.shareToken!.trim()))
        .first();
    } else if (args.displayCode?.trim()) {
      candidate = await ctx.db
        .query("awardsCandidates")
        .withIndex("by_display_code", (q) =>
          q.eq("displayCode", args.displayCode!.trim().toUpperCase())
        )
        .first();
    }
    if (!candidate) return null;
    if (candidate.status === "disqualified" || candidate.status === "withdrawn") {
      return {
        unavailable: true as const,
        reason: "This candidate is no longer active in the competition.",
      };
    }

    const season = await ctx.db.get(candidate.seasonId);
    const category = await ctx.db.get(candidate.categoryId);
    if (!season || season.status === "draft" || !category) return null;

    const publishResults =
      season.status === "finalists_published" || season.status === "results_published";

    return {
      unavailable: false as const,
      candidateId: candidate._id,
      displayCode: candidate.displayCode,
      shareToken: candidate.shareToken,
      displayName: candidate.displayName,
      handle: candidate.handle ?? null,
      avatarUrl: candidate.avatarUrl ?? null,
      biography: candidate.biography,
      portfolioLinks: parseLinks(candidate.portfolioLinksJson),
      verifiedCreator: candidate.verifiedCreator,
      status: candidate.status,
      season: seasonPublic(season),
      category: categoryPublic(category),
      voteCount: publishResults || season.status === "voting_open" ? candidate.voteCount : null,
      votingOpen: votingOpen(season),
      votingClosesAt: season.votingClosesAt ?? null,
      tipsEnabled: season.tipsEnabled,
      supportCreatorUserId: season.tipsEnabled ? candidate.creatorUserId : null,
      operatorDisclosure: season.operatorDisclosure,
      scoringCriteria: {
        publicVoteWeight: category.publicVoteWeight,
        judgingWeight: category.judgingWeight,
        assessmentWeight: category.assessmentWeight,
        peoplesChoice: category.peoplesChoice,
      },
    };
  },
});

/** Submit self-application or nominate another creator. */
export const submitNomination = mutation({
  args: {
    sessionToken: v.string(),
    seasonSlug: v.string(),
    categorySlug: v.string(),
    selfApplication: v.boolean(),
    nomineeDisplayName: v.string(),
    nomineeHandle: v.optional(v.string()),
    nomineeEmail: v.optional(v.string()),
    biography: v.string(),
    portfolioLinks: v.array(v.string()),
    evidence: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    const season = await ctx.db
      .query("awardsSeasons")
      .withIndex("by_slug", (q) => q.eq("slug", args.seasonSlug.trim()))
      .first();
    if (!season) throw new Error("Award season not found.");
    if (!nominationsOpen(season)) {
      throw new Error("Nominations are not open for this season.");
    }

    const category = await ctx.db
      .query("awardsCategories")
      .withIndex("by_season_slug", (q) =>
        q.eq("seasonId", season._id).eq("slug", args.categorySlug.trim())
      )
      .first();
    if (!category || !category.active) throw new Error("Category not found.");

    const displayName = args.nomineeDisplayName.trim().slice(0, 80);
    const biography = args.biography.trim().slice(0, 4000);
    if (displayName.length < 2) throw new Error("Display name is required.");
    if (biography.length < 40) {
      throw new Error("Please provide a biography of at least 40 characters.");
    }

    const links = args.portfolioLinks
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 12);

    // Prevent duplicate active submissions by the same nominator for the same season/category.
    const existingByNominator = await ctx.db
      .query("awardsNominations")
      .withIndex("by_nominator", (q) => q.eq("nominatorUserId", userId))
      .collect();
    const hasActiveDuplicate = existingByNominator.some(
      (row) =>
        row.seasonId === season._id &&
        row.categoryId === category._id &&
        row.status !== "rejected" &&
        row.status !== "declined" &&
        row.status !== "withdrawn"
    );
    if (hasActiveDuplicate) {
      throw new Error(
        "You already have an active nomination in this category for this season."
      );
    }

    const t = now();
    let nomineeUserId: string | undefined;
    let status: Doc<"awardsNominations">["status"] = "under_review";
    let nomineeConsentAt: number | undefined;

    if (args.selfApplication) {
      nomineeUserId = userId;
      nomineeConsentAt = t;
      status = "under_review";
      const profile = await ctx.db
        .query("socialProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      if (!profile) {
        throw new Error("Create a GigaSocial profile before applying.");
      }
    } else {
      status = "awaiting_consent";
      const handle = args.nomineeHandle?.trim().replace(/^@/, "").toLowerCase();
      if (!handle) {
        throw new Error(
          "Nominee GigaSocial handle is required so the nominee can consent."
        );
      }
      const profile = await ctx.db
        .query("socialProfiles")
        .withIndex("by_handle", (q) => q.eq("handle", handle))
        .first();
      if (!profile) {
        throw new Error("No GigaSocial profile found for that handle.");
      }
      if (profile.userId === userId) {
        throw new Error("Use self-application to nominate yourself.");
      }
      nomineeUserId = profile.userId;
    }

    const nominationId = await ctx.db.insert("awardsNominations", {
      seasonId: season._id,
      categoryId: category._id,
      nominatorUserId: userId,
      nomineeUserId,
      nomineeDisplayName: displayName,
      nomineeHandle: args.nomineeHandle?.trim().replace(/^@/, "").slice(0, 40),
      nomineeEmail: args.nomineeEmail?.trim().toLowerCase().slice(0, 120),
      biography,
      portfolioLinksJson: JSON.stringify(links),
      evidenceJson: args.evidence?.trim().slice(0, 4000),
      selfApplication: args.selfApplication,
      nomineeConsentAt,
      status,
      editCutoffAt: season.nominationClosesAt,
      createdAt: t,
      updatedAt: t,
    });

    await writeAudit(ctx, {
      seasonId: season._id,
      actor: userId,
      action: "nomination_submitted",
      entityType: "awardsNominations",
      entityId: nominationId,
      detail: { selfApplication: args.selfApplication, category: category.slug },
    });

    if (nomineeUserId && nomineeUserId !== userId) {
      await ctx.db.insert("socialNotifications", {
        recipientId: nomineeUserId,
        type: "creator",
        message: `You were nominated for ${category.name}. Open Awards to accept or decline.`,
        createdAt: t,
        read: false,
      });
    }

    return { ok: true as const, nominationId, status };
  },
});

export const respondToNomination = mutation({
  args: {
    sessionToken: v.string(),
    nominationId: v.id("awardsNominations"),
    accept: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    const nomination = await ctx.db.get(args.nominationId);
    if (!nomination) throw new Error("Nomination not found.");
    assertCanRespondToNomination({
      actorUserId: userId,
      nomineeUserId: nomination.nomineeUserId,
    });
    if (nomination.status !== "awaiting_consent") {
      throw new Error("This nomination is not awaiting consent.");
    }

    const t = now();
    if (!args.accept) {
      await ctx.db.patch(nomination._id, {
        status: "declined",
        updatedAt: t,
      });
      await writeAudit(ctx, {
        seasonId: nomination.seasonId,
        actor: userId,
        action: "nomination_declined",
        entityType: "awardsNominations",
        entityId: nomination._id,
      });
      return { ok: true as const, status: "declined" as const };
    }

    await ctx.db.patch(nomination._id, {
      nomineeUserId: userId,
      nomineeConsentAt: t,
      status: "under_review",
      updatedAt: t,
    });
    await writeAudit(ctx, {
      seasonId: nomination.seasonId,
      actor: userId,
      action: "nomination_accepted",
      entityType: "awardsNominations",
      entityId: nomination._id,
    });
    return { ok: true as const, status: "under_review" as const };
  },
});

export const listMyNominations = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    const asNominator = await ctx.db
      .query("awardsNominations")
      .withIndex("by_nominator", (q) => q.eq("nominatorUserId", userId))
      .collect();
    const asNominee = await ctx.db
      .query("awardsNominations")
      .withIndex("by_nominee", (q) => q.eq("nomineeUserId", userId))
      .collect();
    const map = new Map<string, Doc<"awardsNominations">>();
    for (const n of [...asNominator, ...asNominee]) map.set(n._id, n);
    return [...map.values()]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50)
      .map((n) => ({
        nominationId: n._id,
        seasonId: n.seasonId,
        categoryId: n.categoryId,
        status: n.status,
        selfApplication: n.selfApplication,
        displayName: n.nomineeDisplayName,
        createdAt: n.createdAt,
        awaitingMyConsent:
          n.status === "awaiting_consent" && n.nomineeUserId === userId,
      }));
  },
});

export const castVote = mutation({
  args: {
    sessionToken: v.string(),
    candidateId: v.id("awardsCandidates"),
  },
  handler: async (ctx, args) => {
    const voterUserId = await requireSession(args.sessionToken, ctx);
    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate || candidate.status === "disqualified" || candidate.status === "withdrawn") {
      throw new Error("Candidate not available for voting.");
    }
    const season = await ctx.db.get(candidate.seasonId);
    if (!season || !votingOpen(season)) {
      throw new Error("Voting is closed for this season.");
    }
    if (candidate.creatorUserId === voterUserId) {
      throw new Error("You cannot vote for yourself.");
    }

    const existing = await ctx.db
      .query("awardsVotes")
      .withIndex("by_voter_category", (q) =>
        q
          .eq("seasonId", candidate.seasonId)
          .eq("categoryId", candidate.categoryId)
          .eq("voterUserId", voterUserId)
      )
      .first();
    if (existing) {
      throw new Error("You have already voted in this category for this season.");
    }

    // Simple rate signal: >20 votes across seasons in 10 minutes → flag (still record).
    const recent = await ctx.db
      .query("awardsVotes")
      .withIndex("by_season_created", (q) => q.eq("seasonId", candidate.seasonId))
      .order("desc")
      .take(40);
    const tenMinAgo = now() - 10 * 60 * 1000;
    const recentByVoter = recent.filter(
      (v) => v.voterUserId === voterUserId && v.createdAt >= tenMinAgo
    ).length;
    const flagged = recentByVoter >= 8;

    const t = now();
    await ctx.db.insert("awardsVotes", {
      seasonId: candidate.seasonId,
      categoryId: candidate.categoryId,
      candidateId: candidate._id,
      voterUserId,
      createdAt: t,
      flagged: flagged || undefined,
      flagReason: flagged ? "elevated_vote_velocity" : undefined,
    });
    await ctx.db.patch(candidate._id, {
      voteCount: candidate.voteCount + 1,
      updatedAt: t,
    });

    return { ok: true as const, flagged };
  },
});

export const getMyVoteForCategory = query({
  args: {
    sessionToken: v.string(),
    seasonId: v.id("awardsSeasons"),
    categoryId: v.id("awardsCategories"),
  },
  handler: async (ctx, args) => {
    const voterUserId = await requireSession(args.sessionToken, ctx);
    const vote = await ctx.db
      .query("awardsVotes")
      .withIndex("by_voter_category", (q) =>
        q
          .eq("seasonId", args.seasonId)
          .eq("categoryId", args.categoryId)
          .eq("voterUserId", voterUserId)
      )
      .first();
    if (!vote) return null;
    return { candidateId: vote.candidateId, createdAt: vote.createdAt };
  },
});

/** Compute provisional rankings for a category (admin publish gates results). */
export async function computeCategoryRankings(
  ctx: { db: import("./_generated/server").QueryCtx["db"] },
  category: Doc<"awardsCategories">
) {
  assertWeightsSane({
    publicVoteWeight: category.publicVoteWeight,
    judgingWeight: category.judgingWeight,
    assessmentWeight: category.assessmentWeight,
    peoplesChoice: category.peoplesChoice,
  });

  const candidates = (
    await ctx.db
      .query("awardsCandidates")
      .withIndex("by_season_category", (q) =>
        q.eq("seasonId", category.seasonId).eq("categoryId", category._id)
      )
      .collect()
  ).filter((c) => c.status !== "disqualified" && c.status !== "withdrawn");

  const maxVotes = candidates.reduce((m, c) => Math.max(m, c.voteCount), 0);

  const rows = [];
  for (const c of candidates) {
    const judgeDocs = await ctx.db
      .query("awardsJudgeScores")
      .withIndex("by_candidate_judge", (q) => q.eq("candidateId", c._id))
      .collect();
    const judgeAvgs = judgeDocs.map((j) => {
      try {
        const obj = JSON.parse(j.scoresJson) as Record<string, number>;
        return averageRubricScore(Object.values(obj));
      } catch {
        return 0;
      }
    });
    const judging = averageRubricScore(judgeAvgs);

    const assessDocs = await ctx.db
      .query("awardsAssessmentScores")
      .withIndex("by_candidate", (q) => q.eq("candidateId", c._id))
      .collect();
    const assessAvgs = assessDocs.map((a) => {
      try {
        const obj = JSON.parse(a.scoresJson) as Record<string, number>;
        return averageRubricScore(Object.values(obj));
      } catch {
        return 0;
      }
    });
    const assessment = averageRubricScore(assessAvgs);

    const publicVote = publicVoteComponent({
      candidateVotes: c.voteCount,
      maxVotesInCategory: maxVotes,
    });
    const finalScore = combineWeightedScore({
      weights: {
        publicVoteWeight: category.publicVoteWeight,
        judgingWeight: category.judgingWeight,
        assessmentWeight: category.assessmentWeight,
        peoplesChoice: category.peoplesChoice,
      },
      publicVote,
      judging,
      assessment,
    });

    rows.push({
      candidateId: c._id,
      displayCode: c.displayCode,
      displayName: c.displayName,
      publicVotes: c.voteCount,
      publicVote,
      judging,
      assessment,
      finalScore,
      publishedAt: c.publishedAt,
      status: c.status,
    });
  }

  rows.sort((a, b) =>
    compareCandidatesForRanking(
      {
        finalScore: a.finalScore,
        publicVotes: a.publicVotes,
        judging: a.judging,
        publishedAt: a.publishedAt,
        displayCode: a.displayCode,
      },
      {
        finalScore: b.finalScore,
        publicVotes: b.publicVotes,
        judging: b.judging,
        publishedAt: b.publishedAt,
        displayCode: b.displayCode,
      }
    )
  );
  return rows;
}

export { DEFAULT_CATEGORIES, DEFAULT_PACKAGES, OPERATOR_DISCLOSURE, formatDisplayCode, writeAudit, nominationsOpen, votingOpen, seasonPublic, categoryPublic };
