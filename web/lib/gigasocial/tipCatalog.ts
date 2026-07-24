/** Paystack tip tiers (GHS) — mobile money, cards, and other channels. */

export type CreatorTipTier = {
  id: string;
  label: string;
  emoji: string;
  amountGhs: number;
};

export const CREATOR_TIP_CATALOG: CreatorTipTier[] = [
  { id: "spark", label: "Spark", emoji: "✨", amountGhs: 1 },
  { id: "fire", label: "Fire", emoji: "🔥", amountGhs: 2 },
  { id: "crown", label: "Crown", emoji: "👑", amountGhs: 5 },
  { id: "rocket", label: "Rocket", emoji: "🚀", amountGhs: 10 },
  { id: "diamond", label: "Diamond", emoji: "💎", amountGhs: 20 },
];

export function getCreatorTipTier(giftType: string): CreatorTipTier | null {
  return CREATOR_TIP_CATALOG.find((tier) => tier.id === giftType) ?? null;
}
