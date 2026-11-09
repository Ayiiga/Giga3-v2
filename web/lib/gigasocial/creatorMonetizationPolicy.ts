/** Creator monetisation policy — versioned for server-side acceptance records. */

export const CREATOR_MONETIZATION_POLICY_VERSION = "giga-creator-monetisation-v3";

export const CREATOR_MONETIZATION_POLICY_TITLE =
  "GigaSocial Creator Monetisation Rules";

export const CREATOR_MONETIZATION_POLICY_SECTIONS: {
  heading: string;
  body: string;
}[] = [
  {
    heading: "Original content and intellectual property",
    body: "To apply, you need at least 5 active posts from the previous rolling 45 days. Declare whether each is your original work or licensed with permission evidence. A declaration is recorded but does not itself verify ownership.",
  },
  {
    heading: "Copyright and prohibited content",
    body: "Declared posts undergo independent screening. Possible matches are flagged for human review, not automatically treated as proven infringement. You may appeal a screening decision; only posts cleared by an authorised reviewer count toward eligibility.",
  },
  {
    heading: "Authentic engagement",
    body: "Fake fans, purchased likes, view bots, or other artificial engagement are prohibited and may lead to account restrictions.",
  },
  {
    heading: "Fraud and payment abuse",
    body: "Fraudulent tips, chargebacks abuse, self-dealing, or payment manipulation is forbidden. Giga3 may reverse or withhold related earnings.",
  },
  {
    heading: "Community standards and moderation",
    body: "You are responsible for complying with Giga3 and GigaSocial policies. Moderated content may lose eligibility for rewards.",
  },
  {
    heading: "Earnings, payments, and withdrawals",
    body: "Tips, boosts, affiliate commissions, and other earnings follow configured platform rates. Withdrawals require eligibility checks, available balance, and payment verification. Minimum withdrawal amounts and processing times may apply.",
  },
  {
    heading: "Withholding and account restrictions",
    body: "Giga3 may delay, withhold, or reverse earnings when fraud, policy violations, or payment failures are suspected, and may restrict monetisation features accordingly.",
  },
  {
    heading: "Your responsibility",
    body: "By accepting, you confirm you have read these rules and applicable platform policies, and that you will keep your account and payout details accurate.",
  },
];
