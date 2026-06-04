/**
 * One-time credit top-ups. Default: 1 GHS = 1 credit (amountGhs === credits).
 * Override amounts via PAYSTACK_CREDITS_*_GHS env vars on Convex.
 */

export const CREDIT_PACK_IDS = ["credits_60", "credits_150", "credits_500"] as const;
export type CreditPackId = (typeof CREDIT_PACK_IDS)[number];

type CreditPackDef = {
  id: CreditPackId;
  label: string;
  credits: number;
  defaultAmountGhs: number;
  description: string;
  envKey: string;
};

const PACKS: CreditPackDef[] = [
  {
    id: "credits_60",
    label: "60 Credits",
    credits: 60,
    defaultAmountGhs: 60,
    description: "1 GHS = 1 credit · top-up for any plan.",
    envKey: "PAYSTACK_CREDITS_60_GHS",
  },
  {
    id: "credits_150",
    label: "150 Credits",
    credits: 150,
    defaultAmountGhs: 150,
    description: "1 GHS = 1 credit · larger top-up pack.",
    envKey: "PAYSTACK_CREDITS_150_GHS",
  },
  {
    id: "credits_500",
    label: "500 Credits",
    credits: 500,
    defaultAmountGhs: 500,
    description: "1 GHS = 1 credit · studio / heavy usage.",
    envKey: "PAYSTACK_CREDITS_500_GHS",
  },
];

function amountFromEnv(envKey: string, fallback: number): number {
  const raw = process.env[envKey];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getCreditPackAmountGhs(pack: CreditPackDef): number {
  return amountFromEnv(pack.envKey, pack.defaultAmountGhs);
}

/** Credits granted always match the GHS charged (1:1). */
export function getCreditPack(productId: string) {
  const id =
    productId === "credits_50" ? ("credits_60" as const) : productId;
  const pack = PACKS.find((p) => p.id === id);
  if (!pack) return null;

  const amountGhs = getCreditPackAmountGhs(pack);
  return {
    label: pack.label,
    amountGhs,
    credits: amountGhs,
    description: pack.description,
    type: "credits" as const,
  };
}

export function listCreditPackIds(): CreditPackId[] {
  return [...CREDIT_PACK_IDS];
}
