import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import {
  assertWeightsSane,
  averageRubricScore,
  combineWeightedScore,
  compareCandidatesForRanking,
  DEFAULT_GENERAL_WEIGHTS,
  formatDisplayCode,
  normalizeComponentScore,
  packageInfluencesCompetition,
  publicVoteComponent,
} from "../../convex/gigaSocialAwardsMath";
import { assertPackageOrderSafe } from "../../convex/gigaSocialAwardsAdmin";
import {
  assertCanRespondToNomination,
  parseAndClampRubricScores,
  seasonStatusLocksFormula,
} from "../../convex/gigaSocialAwardsPolicy";
import {
  AWARDS_PATHS,
  PACKAGE_DISCLAIMER,
  TIP_DISCLAIMER,
  candidateSharePath,
} from "../../web/lib/gigasocial/awards/constants";

const root = resolve(__dirname, "../..");

describe("gigaSocialAwards — scoring and safety", () => {
  it("formats display codes without treating them as secrets", () => {
    expect(formatDisplayCode(2026, 125)).toBe("GSA-2026-00125");
    expect(formatDisplayCode(2026, 1)).toBe("GSA-2026-00001");
  });

  it("applies the default 40/40/20 formula and peoples-choice override", () => {
    assertWeightsSane(DEFAULT_GENERAL_WEIGHTS);
    const general = combineWeightedScore({
      weights: DEFAULT_GENERAL_WEIGHTS,
      publicVote: 50,
      judging: 80,
      assessment: 20,
    });
    // (50*40 + 80*40 + 20*20) / 100 = 56
    expect(general).toBe(56);

    const peoples = combineWeightedScore({
      weights: { ...DEFAULT_GENERAL_WEIGHTS, peoplesChoice: true },
      publicVote: 70,
      judging: 10,
      assessment: 10,
    });
    expect(peoples).toBe(70);
  });

  it("handles zero votes, missing scores, ties, and invalid weights", () => {
    expect(publicVoteComponent({ candidateVotes: 0, maxVotesInCategory: 0 })).toBe(0);
    expect(averageRubricScore([])).toBe(0);
    expect(averageRubricScore([Number.NaN, 120, -5])).toBe(50);
    expect(normalizeComponentScore(Number.POSITIVE_INFINITY)).toBe(0);
    expect(
      combineWeightedScore({
        weights: {
          publicVoteWeight: 0,
          judgingWeight: 0,
          assessmentWeight: 0,
          peoplesChoice: false,
        },
        publicVote: 90,
        judging: 90,
        assessment: 90,
      })
    ).toBe(0);
    expect(() =>
      assertWeightsSane({
        publicVoteWeight: -1,
        judgingWeight: 40,
        assessmentWeight: 20,
        peoplesChoice: false,
      })
    ).toThrow(/non-negative/i);

    const tiedA = {
      finalScore: 80,
      publicVotes: 10,
      judging: 50,
      publishedAt: 100,
      displayCode: "GSA-2026-00002",
    };
    const tiedB = { ...tiedA, displayCode: "GSA-2026-00001", publishedAt: 200 };
    // Same score/votes/judging → earlier publishedAt wins (a before b).
    expect(compareCandidatesForRanking(tiedA, tiedB)).toBeLessThan(0);
  });

  it("normalises public vote share against the category max", () => {
    expect(
      publicVoteComponent({ candidateVotes: 25, maxVotesInCategory: 50 })
    ).toBe(50);
    expect(publicVoteComponent({ candidateVotes: 10, maxVotesInCategory: 0 })).toBe(0);
  });

  it("tie-breaks with votes, judging, publishedAt, then displayCode", () => {
    const a = {
      finalScore: 80,
      publicVotes: 10,
      judging: 50,
      publishedAt: 100,
      displayCode: "GSA-2026-00002",
    };
    const b = { ...a, publicVotes: 12 };
    expect(compareCandidatesForRanking(a, b)).toBeGreaterThan(0);
  });

  it("hard-codes packages as non-influential", () => {
    expect(packageInfluencesCompetition()).toBe(false);
    expect(() =>
      assertPackageOrderSafe({ influencesVotes: true })
    ).toThrow(/never influence/i);
  });

  it("blocks nomination consent hijack when nominee is unlinked", () => {
    expect(() =>
      assertCanRespondToNomination({ actorUserId: "attacker@x.com", nomineeUserId: null })
    ).toThrow(/not linked/i);
    expect(() =>
      assertCanRespondToNomination({
        actorUserId: "attacker@x.com",
        nomineeUserId: "real@x.com",
      })
    ).toThrow(/Only the nominee/i);
    expect(() =>
      assertCanRespondToNomination({
        actorUserId: "real@x.com",
        nomineeUserId: "real@x.com",
      })
    ).not.toThrow();
  });

  it("clamps rubric scores and locks formulas after voting opens", () => {
    expect(JSON.parse(parseAndClampRubricScores(JSON.stringify({ quality: 150, impact: -2 })))).toEqual(
      { quality: 100, impact: 0 }
    );
    expect(() => parseAndClampRubricScores("{}")).toThrow(/at least one/i);
    expect(seasonStatusLocksFormula("voting_open")).toBe(true);
    expect(seasonStatusLocksFormula("judging")).toBe(true);
    expect(seasonStatusLocksFormula("nominations_open")).toBe(false);
  });

  it("keeps tip and package disclaimers and share path helpers", () => {
    expect(PACKAGE_DISCLAIMER.toLowerCase()).toContain("never generate votes");
    expect(TIP_DISCLAIMER.toLowerCase()).toContain("do not purchase votes");
    expect(candidateSharePath({ displayCode: "GSA-2026-00001", shareToken: "st_x" })).toContain(
      "code=GSA-2026-00001"
    );
    expect(AWARDS_PATHS.home).toBe("/gigasocial/awards/");
  });

  it("wires Convex awards modules and static routes", () => {
    const awards = readFileSync(resolve(root, "convex/gigaSocialAwards.ts"), "utf8");
    const admin = readFileSync(resolve(root, "convex/gigaSocialAwardsAdmin.ts"), "utf8");
    const schema = readFileSync(resolve(root, "convex/schema.ts"), "utf8");
    const panel = readFileSync(
      resolve(root, "web/components/gigasocial/economy/GigaSocialCreatorPanel.tsx"),
      "utf8"
    );
    const page = readFileSync(
      resolve(root, "web/app/(marketing)/gigasocial/awards/page.tsx"),
      "utf8"
    );
    const nominate = readFileSync(
      resolve(root, "web/components/gigasocial/awards/AwardsNominateClient.tsx"),
      "utf8"
    );

    expect(awards).toContain("castVote");
    expect(awards).toContain("submitNomination");
    expect(awards).toContain("You already have an active nomination in this category for this season.");
    expect(awards).toContain("requireSession");
    expect(awards).toContain("You cannot vote for yourself");
    expect(awards).toContain("assertCanRespondToNomination");
    expect(awards).toContain("Nominee GigaSocial handle is required");
    expect(awards).not.toMatch(/shareToken:\s*c\.shareToken/);
    expect(admin).toContain("ensureAdminAccess");
    expect(admin).toContain("formulaLockedAt");
    expect(admin).toContain("seasonStatusLocksFormula");
    expect(admin).toContain("submitAssessmentScore");
    expect(admin).toContain("Cannot advertise a prize that is not funded");
    expect(admin).toContain("promoPaymentsEnabled");
    // No checkout / order fulfilment path yet — schema only until payments are enabled.
    expect(admin).not.toContain("awardsPromoOrders");
    expect(awards).not.toContain("awardsPromoOrders");
    expect(schema).toContain("awardsSeasons");
    expect(schema).toContain("awardsVotes");
    expect(schema).toContain("influencesCompetition: v.literal(false)");
    expect(panel).toContain('"awards"');
    expect(panel).toContain("GigaSocialAwardsCentre");
    expect(page).toContain("AwardsHubClient");
    expect(page).toContain("ProductSeoHeader");
    expect(nominate).toContain("minimum 40 characters");
    expect(nominate).toContain("Your recent submissions");
  });

  it("documents Phase 0 plan and deploy ordering", () => {
    const doc = readFileSync(resolve(root, "docs/gigasocial-awards-phase0.md"), "utf8");
    expect(doc).toContain("requireSession");
    expect(doc).toContain("promoPaymentsEnabled");
    expect(doc).toContain("static export");
  });
});
