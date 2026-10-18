/** Creator monetisation policy — versioned for server-side acceptance records. */

export const CREATOR_MONETIZATION_POLICY_VERSION = "giga-creator-monetisation-v1";

export const CREATOR_MONETIZATION_POLICY_TITLE =
  "GigaSocial Creator Monetisation Rules";

export const CREATOR_MONETIZATION_POLICY_SECTIONS: {
  heading: string;
  body: string;
}[] = [
  {
    heading: "Original content and intellectual property",
    body: "You must only monetise content you own or are licensed to use. Do not upload or sell others’ work without permission.",
  },
  {
    heading: "Copyright and prohibited content",
    body: "Content that infringes copyright, promotes illegal activity, or violates Giga3 community standards may be removed and earnings withheld.",
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
