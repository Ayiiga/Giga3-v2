/** Plain-English Creator Earnings Guide for Ghanaian / African creators. */

export type GuideSection = { id: string; title: string; paragraphs: string[] };

export const CREATOR_EARNINGS_GUIDE: GuideSection[] = [
  {
    id: "qualify",
    title: "How creators qualify",
    paragraphs: [
      "You need a GigaSocial profile, at least 500 genuine fans, and an account in good standing.",
      "When you meet the fan count, you can accept the creator monetisation rules and apply. Reaching 500 fans does not guarantee approval.",
      "Giga3 AI may still review originality, policy compliance, and payment readiness before activating monetisation.",
    ],
  },
  {
    id: "earnings",
    title: "How earnings are calculated",
    paragraphs: [
      "Verified earnings today come mainly from viewer tips (Paystack) after the creator share, and from Marketplace sales after platform fees.",
      "Estimated content bonuses based on views are labels only until a funded programme exists. They are not withdrawable cash.",
      "Advertising revenue share is not available until GigaSocial has real advertising income and an approved allocation policy.",
    ],
  },
  {
    id: "engagement",
    title: "What counts as eligible engagement",
    paragraphs: [
      "Genuine fans, likes, comments, shares, and watch time from real people matter for growth and future programmes.",
      "Fake views, bots, bought followers, and self-referral schemes do not qualify and can lead to suspension.",
    ],
  },
  {
    id: "revenue-share",
    title: "How revenue is shared",
    paragraphs: [
      "For tips, creators receive a configurable share of the paid amount (default eighty percent). The rest supports platform costs.",
      "Marketplace sales use the Marketplace fee rules already published for sellers.",
      "Percentages are configured centrally — they are not hard-coded into random UI components.",
    ],
  },
  {
    id: "rewards-awards",
    title: "Rewards and awards",
    paragraphs: [
      "Badges and spotlights may be granted for milestones. They are not cash.",
      "Cash rewards and award prize money only run when a budget is approved and funded. Unfunded prizes are shown as not available.",
      "Awards use published criteria and human review where required. Raw follower counts alone do not pick winners.",
    ],
  },
  {
    id: "estimates",
    title: "Why estimated earnings may change",
    paragraphs: [
      "Estimates can change when engagement is invalidated, refunds happen, or a programme is not yet funded.",
      "Only amounts marked available for withdrawal after validation can be requested for payout.",
    ],
  },
  {
    id: "withdrawals",
    title: "Withdrawals and fees",
    paragraphs: [
      "Withdrawals use Ghana cedi (GH₵). You will see fees and the expected net amount before you confirm — when automated payouts go live.",
      "Today, payout requests create an audited pending record. Automated Mobile Money or bank Transfers are not marked paid until Paystack confirms the transfer.",
      "Delays can happen during reviews, bank holidays, or failed recipient details.",
    ],
  },
  {
    id: "suspension",
    title: "Rejection, suspension, and appeals",
    paragraphs: [
      "Applications can be rejected for policy reasons. You will see a clear explanation when available.",
      "Suspension pauses monetisation while issues are investigated. Legitimate balances are not silently deleted.",
      "Where an appeal is available, submit new facts once. Appeals are reviewed by humans and logged.",
    ],
  },
  {
    id: "aspiration",
    title: "About the GH₵100,000 goal",
    paragraphs: [
      "GH₵100,000 a year is an ambitious personal goal some creators may pursue — about GH₵8,333.33 per month.",
      "It is not a promise, typical outcome, or guarantee from Giga3 AI. Use the planner with your own verified numbers and assumptions.",
    ],
  },
];
