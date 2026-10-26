/**
 * Ops-only Awards activation (deploy-key / `npx convex run`).
 * Does not expose admin session APIs.
 */
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_PACKAGES,
  OPERATOR_DISCLOSURE,
  writeAudit,
} from "./gigaSocialAwards";

function now() {
  return Date.now();
}

/**
 * Bootstrap the year season if missing, activate every category/package,
 * and open nominations so Awards is publicly live.
 *
 * Promo Paystack checkout stays OFF (packages never buy votes).
 * Tips stay OFF unless explicitly enabled later.
 *
 * Run:
 *   npx convex run gigaSocialAwardsOps:activateLiveSeason '{"year":2026,"confirm":true}' --prod
 */
export const activateLiveSeason = internalMutation({
  args: {
    year: v.optional(v.number()),
    confirm: v.boolean(),
    /** When true, also open voting (locks formulas). Default false = nominations_open. */
    openVoting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!args.confirm) {
      throw new Error("Set confirm=true to activate the live Awards season.");
    }
    const year = Math.floor(args.year ?? new Date().getFullYear());
    if (year < 2024 || year > 2100) throw new Error("Invalid year.");
    const slug = `gsa-${year}`;
    const t = now();

    let season = await ctx.db
      .query("awardsSeasons")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    let created = false;
    if (!season) {
      const seasonId = await ctx.db.insert("awardsSeasons", {
        slug,
        title: `GigaSocial Awards ${year}`,
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
      season = await ctx.db.get(seasonId);
      created = true;
      if (!season) throw new Error("Failed to create season.");
      await writeAudit(ctx, {
        seasonId: season._id,
        actor: "ops",
        action: "season_bootstrapped",
        entityType: "awardsSeasons",
        entityId: season._id,
        detail: { slug, year, via: "activateLiveSeason" },
      });
    }

    const cats = await ctx.db
      .query("awardsCategories")
      .withIndex("by_season", (q) => q.eq("seasonId", season._id))
      .collect();
    for (const cat of cats) {
      if (!cat.active) {
        await ctx.db.patch(cat._id, { active: true, updatedAt: t });
      }
    }

    const packages = await ctx.db
      .query("awardsPromoPackages")
      .withIndex("by_season", (q) => q.eq("seasonId", season._id))
      .collect();
    for (const pkg of packages) {
      if (!pkg.active) {
        await ctx.db.patch(pkg._id, { active: true, updatedAt: t });
      }
    }

    const nextStatus = args.openVoting ? "voting_open" : "nominations_open";
    if (seasonStatusLocksForOps(nextStatus)) {
      for (const cat of cats) {
        if (!cat.formulaLockedAt) {
          await ctx.db.patch(cat._id, { formulaLockedAt: t, updatedAt: t });
        }
      }
    }

    const from = season.status;
    await ctx.db.patch(season._id, {
      status: nextStatus,
      nominationOpensAt: season.nominationOpensAt ?? t,
      nominationClosesAt: undefined,
      votingOpensAt: args.openVoting ? (season.votingOpensAt ?? t) : season.votingOpensAt,
      votingClosesAt: args.openVoting ? undefined : season.votingClosesAt,
      // Keep payments off — activation = competition live, not Paystack promos.
      promoPaymentsEnabled: false,
      updatedAt: t,
    });

    await writeAudit(ctx, {
      seasonId: season._id,
      actor: "ops",
      action: "season_status_changed",
      entityType: "awardsSeasons",
      entityId: season._id,
      detail: { from, to: nextStatus, via: "activateLiveSeason", created },
    });

    return {
      ok: true as const,
      created,
      seasonId: season._id,
      slug,
      status: nextStatus,
      categoriesActivated: cats.length,
      packagesActivated: packages.length,
      promoPaymentsEnabled: false,
    };
  },
});

function seasonStatusLocksForOps(status: string): boolean {
  return (
    status === "voting_open" ||
    status === "judging" ||
    status === "finalists_published" ||
    status === "results_published"
  );
}
