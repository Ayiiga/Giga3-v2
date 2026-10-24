/**
 * Configurable reward / award catalogue.
 * Cash rewards stay inactive until budgetApproved && budgetRemainingGhs > 0.
 */

export type RewardType =
  | "badge"
  | "certificate"
  | "spotlight"
  | "training"
  | "platform_credit"
  | "competition_entry"
  | "cash_bonus";

export type RewardCategory =
  | "consistency"
  | "content_quality"
  | "creator_development"
  | "community"
  | "awards";

export type RewardDefinition = {
  id: string;
  name: string;
  description: string;
  category: RewardCategory;
  rewardType: RewardType;
  cashAmountGhs: number | null;
  maxClaimsPerUser: number;
  programBudgetGhs: number;
  currentExpenditureGhs: number;
  budgetApproved: boolean;
  active: boolean;
  terms: string;
};

export const REWARD_CATALOGUE: RewardDefinition[] = [
  {
    id: "badge_first_100_fans",
    name: "First 100 genuine fans",
    description: "Recognition badge when you reach 100 fans.",
    category: "creator_development",
    rewardType: "badge",
    cashAmountGhs: null,
    maxClaimsPerUser: 1,
    programBudgetGhs: 0,
    currentExpenditureGhs: 0,
    budgetApproved: true,
    active: true,
    terms: "Non-cash recognition only. Fans must come from socialFollows.",
  },
  {
    id: "badge_500_fans",
    name: "500 fans — monetisation milestone",
    description: "Badge for reaching the monetisation fan threshold.",
    category: "creator_development",
    rewardType: "badge",
    cashAmountGhs: null,
    maxClaimsPerUser: 1,
    programBudgetGhs: 0,
    currentExpenditureGhs: 0,
    budgetApproved: true,
    active: true,
    terms: "Does not automatically approve monetisation; policy checks still apply.",
  },
  {
    id: "badge_weekly_streak",
    name: "Weekly publishing streak",
    description: "Badge for publishing original public posts across consecutive weeks.",
    category: "consistency",
    rewardType: "badge",
    cashAmountGhs: null,
    maxClaimsPerUser: 52,
    programBudgetGhs: 0,
    currentExpenditureGhs: 0,
    budgetApproved: true,
    active: true,
    terms: "Empty spam posts do not qualify.",
  },
  {
    id: "award_rising_creator_month",
    name: "Rising Creator of the Month",
    description: "Judged award for emerging creators with original, valuable content.",
    category: "awards",
    rewardType: "spotlight",
    cashAmountGhs: null,
    maxClaimsPerUser: 1,
    programBudgetGhs: 0,
    currentExpenditureGhs: 0,
    budgetApproved: false,
    active: false,
    terms: "Human judging required. Cash prize not offered until funding is approved.",
  },
  {
    id: "cash_bonus_placeholder",
    name: "Platform cash bonus (unfunded)",
    description: "Reserved catalogue entry for future funded cash bonuses.",
    category: "creator_development",
    rewardType: "cash_bonus",
    cashAmountGhs: 0,
    maxClaimsPerUser: 1,
    programBudgetGhs: 0,
    currentExpenditureGhs: 0,
    budgetApproved: false,
    active: false,
    terms: "Inactive. No cash is promised.",
  },
];

export function isRewardClaimable(def: RewardDefinition): boolean {
  if (!def.active) return false;
  if (def.rewardType === "cash_bonus") {
    return (
      def.budgetApproved &&
      (def.cashAmountGhs ?? 0) > 0 &&
      def.currentExpenditureGhs + (def.cashAmountGhs ?? 0) <= def.programBudgetGhs
    );
  }
  return true;
}

export const AWARD_CATEGORIES = [
  {
    id: "rising_creator_month",
    name: "Rising Creator of the Month",
    criteria:
      "Originality, genuine engagement, consistency, and community value — not raw views alone.",
  },
  {
    id: "most_consistent",
    name: "Most Consistent Creator",
    criteria: "Sustained original publishing without spam or engagement manipulation.",
  },
  {
    id: "outstanding_educator",
    name: "Outstanding Educator",
    criteria: "Helpful educational posts with clear audience benefit.",
  },
  {
    id: "original_storyteller",
    name: "Original Storyteller",
    criteria: "Original narrative or creative excellence.",
  },
  {
    id: "community_impact",
    name: "Community Impact Award",
    criteria: "Constructive community participation and support for other creators.",
  },
  {
    id: "outstanding_african_creator",
    name: "Outstanding African Creator",
    criteria: "Exceptional work rooted in African stories, culture, or public value.",
  },
  {
    id: "creator_of_the_year",
    name: "Creator of the Year",
    criteria: "Annual judged recognition across quality, consistency, and impact.",
  },
] as const;
