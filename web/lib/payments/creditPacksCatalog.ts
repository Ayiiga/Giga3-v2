/** Mirror of convex/creditPacks.ts — 1 GHS = 1 credit for top-ups */

export const CREDIT_PACK_CATALOG = {
  credits_60: {
    id: "credits_60" as const,
    label: "60 Credits",
    amountGhs: 60,
    credits: 60,
    description: "1 GHS = 1 credit · top-up for any plan.",
    highlighted: true,
  },
  credits_150: {
    id: "credits_150" as const,
    label: "150 Credits",
    amountGhs: 150,
    credits: 150,
    description: "1 GHS = 1 credit · larger top-up pack.",
    highlighted: false,
  },
  credits_500: {
    id: "credits_500" as const,
    label: "500 Credits",
    amountGhs: 500,
    credits: 500,
    description: "1 GHS = 1 credit · studio / heavy usage.",
    highlighted: false,
  },
} as const;

export const CREDIT_PACK_LIST = Object.values(CREDIT_PACK_CATALOG);
