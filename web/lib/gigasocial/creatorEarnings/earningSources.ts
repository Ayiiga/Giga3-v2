/**
 * Configurable earning-source catalogue.
 * Only sources with verified integrations are marked active.
 */

export type EarningSourceAvailability = "active" | "coming_soon" | "not_available";

export type EarningSourceId =
  | "viewer_tips_gifts"
  | "marketplace_sales"
  | "affiliate"
  | "creator_subscriptions"
  | "advertising_revenue_share"
  | "paid_sponsorships"
  | "brand_partnerships"
  | "platform_cash_bonuses"
  | "competitions_awards"
  | "boost_spend";

export type EarningSourceDefinition = {
  id: EarningSourceId;
  name: string;
  description: string;
  availability: EarningSourceAvailability;
  /** When true, amounts may appear in withdrawable cash after validation. */
  canBeWithdrawable: boolean;
  notes: string;
};

export const EARNING_SOURCES: EarningSourceDefinition[] = [
  {
    id: "viewer_tips_gifts",
    name: "Viewer tips & gifts",
    description: "Fans send GH₵ tips via Paystack (MoMo, card, or bank).",
    availability: "active",
    canBeWithdrawable: true,
    notes: "Creator share is configurable (default 80%). Credited after verified payment.",
  },
  {
    id: "marketplace_sales",
    name: "Marketplace digital sales",
    description: "Earnings from sold listings after platform fee.",
    availability: "active",
    canBeWithdrawable: true,
    notes: "Balance lives on creatorProfiles.payoutBalanceGhs.",
  },
  {
    id: "affiliate",
    name: "Affiliate conversions",
    description: "Commission when your affiliate code drives a qualified conversion.",
    availability: "active",
    canBeWithdrawable: false,
    notes: "Tracked separately until conversion cash settlement is verified into payout balance.",
  },
  {
    id: "creator_subscriptions",
    name: "Creator subscriptions",
    description: "Recurring fan subscriptions to your channel.",
    availability: "coming_soon",
    canBeWithdrawable: false,
    notes: "Not available until billing product and allocation policy ship.",
  },
  {
    id: "advertising_revenue_share",
    name: "Advertising revenue share",
    description: "Share of verified platform advertising revenue attributable to your content.",
    availability: "not_available",
    canBeWithdrawable: false,
    notes: "Requires real ad inventory and an approved allocation policy. No fictional rates.",
  },
  {
    id: "paid_sponsorships",
    name: "Paid sponsorships",
    description: "Brand deals brokered or fulfilled through GigaSocial.",
    availability: "coming_soon",
    canBeWithdrawable: false,
    notes: "Marketplace for sponsorships is not live.",
  },
  {
    id: "brand_partnerships",
    name: "Brand partnership campaigns",
    description: "Multi-post brand campaigns with platform mediation.",
    availability: "coming_soon",
    canBeWithdrawable: false,
    notes: "Coming soon.",
  },
  {
    id: "platform_cash_bonuses",
    name: "Platform-funded cash bonuses",
    description: "Cash rewards from an approved, budgeted programme.",
    availability: "not_available",
    canBeWithdrawable: false,
    notes: "No cash reward is offered until a budget is approved and funded.",
  },
  {
    id: "competitions_awards",
    name: "Competitions & awards",
    description: "Prize purses for judged awards.",
    availability: "coming_soon",
    canBeWithdrawable: false,
    notes: "Award definitions may exist; cash prizes require approved funding.",
  },
  {
    id: "boost_spend",
    name: "Boost campaigns (spend)",
    description: "Money you spend to promote posts — not creator income.",
    availability: "active",
    canBeWithdrawable: false,
    notes: "Shown as spend for transparency; never counted as earnings.",
  },
];

export function availabilityLabel(a: EarningSourceAvailability): string {
  switch (a) {
    case "active":
      return "Active";
    case "coming_soon":
      return "Coming soon";
    default:
      return "Not available";
  }
}
