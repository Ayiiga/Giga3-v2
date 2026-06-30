/**
 * Independent Video AI billing — subscriptions and credit packs ($15–$300 USD equivalents in GHS).
 * Configure via PAYSTACK_VIDEO_* env vars on Convex.
 */

const USD_TO_GHS = Number(process.env.USD_TO_GHS_RATE) || 15;

export const VIDEO_SUBSCRIPTION_IDS = [
  "video_sub_creator",
  "video_sub_pro",
  "video_sub_studio",
] as const;

export const VIDEO_PACK_IDS = [
  "video_pack_15",
  "video_pack_50",
  "video_pack_150",
  "video_pack_300",
] as const;

export type VideoSubscriptionId = (typeof VIDEO_SUBSCRIPTION_IDS)[number];
export type VideoPackId = (typeof VIDEO_PACK_IDS)[number];

/** Legacy Paystack product ids from the previous $10–$100 catalog. */
const LEGACY_PACK_ALIASES: Record<string, VideoPackId> = {
  video_pack_10: "video_pack_15",
  video_pack_25: "video_pack_50",
  video_pack_50: "video_pack_150",
  video_pack_100: "video_pack_300",
};

type VideoSubDef = {
  id: VideoSubscriptionId;
  label: string;
  usdPrice: number;
  videoCredits: number;
  periodDays: number;
  description: string;
  envKey: string;
};

type VideoPackDef = {
  id: VideoPackId;
  label: string;
  usdPrice: number;
  videoCredits: number;
  expiryDays: number;
  description: string;
  envKey: string;
};

const VIDEO_SUBS: VideoSubDef[] = [
  {
    id: "video_sub_creator",
    label: "Video Creator",
    usdPrice: 15,
    videoCredits: 50,
    periodDays: 30,
    description: "Monthly video credits for reels, ads, and social clips.",
    envKey: "PAYSTACK_VIDEO_SUB_CREATOR_GHS",
  },
  {
    id: "video_sub_pro",
    label: "Video Pro",
    usdPrice: 75,
    videoCredits: 280,
    periodDays: 30,
    description: "Professional video generation for campaigns and education.",
    envKey: "PAYSTACK_VIDEO_SUB_PRO_GHS",
  },
  {
    id: "video_sub_studio",
    label: "Video Studio",
    usdPrice: 300,
    videoCredits: 1200,
    periodDays: 30,
    description: "Studio-grade volume for agencies and cinematic storytelling.",
    envKey: "PAYSTACK_VIDEO_SUB_STUDIO_GHS",
  },
];

const VIDEO_PACKS: VideoPackDef[] = [
  {
    id: "video_pack_15",
    label: "Video Pack $15",
    usdPrice: 15,
    videoCredits: 50,
    expiryDays: 90,
    description: "One-time video credits (~$15). Valid 90 days.",
    envKey: "PAYSTACK_VIDEO_PACK_15_GHS",
  },
  {
    id: "video_pack_50",
    label: "Video Pack $50",
    usdPrice: 50,
    videoCredits: 180,
    expiryDays: 120,
    description: "One-time video credits (~$50). Valid 120 days.",
    envKey: "PAYSTACK_VIDEO_PACK_50_GHS",
  },
  {
    id: "video_pack_150",
    label: "Video Pack $150",
    usdPrice: 150,
    videoCredits: 550,
    expiryDays: 180,
    description: "One-time video credits (~$150). Valid 180 days.",
    envKey: "PAYSTACK_VIDEO_PACK_150_GHS",
  },
  {
    id: "video_pack_300",
    label: "Video Pack $300",
    usdPrice: 300,
    videoCredits: 1200,
    expiryDays: 365,
    description: "One-time video credits (~$300). Valid 1 year.",
    envKey: "PAYSTACK_VIDEO_PACK_300_GHS",
  },
];

function amountFromEnv(envKey: string, usdFallback: number): number {
  const raw = process.env[envKey];
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return Math.round(usdFallback * USD_TO_GHS);
}

function resolvePackId(productId: string): VideoPackId | null {
  if ((VIDEO_PACK_IDS as readonly string[]).includes(productId)) {
    return productId as VideoPackId;
  }
  return LEGACY_PACK_ALIASES[productId] ?? null;
}

export function getVideoSubscription(productId: string) {
  const sub = VIDEO_SUBS.find((s) => s.id === productId);
  if (!sub) return null;
  return {
    label: sub.label,
    amountGhs: amountFromEnv(sub.envKey, sub.usdPrice),
    videoCredits: sub.videoCredits,
    periodDays: sub.periodDays,
    usdPrice: sub.usdPrice,
    type: "video_subscription" as const,
    planId: sub.id,
  };
}

export function getVideoCreditPack(productId: string) {
  const packId = resolvePackId(productId);
  if (!packId) return null;
  const pack = VIDEO_PACKS.find((p) => p.id === packId);
  if (!pack) return null;
  return {
    label: pack.label,
    amountGhs: amountFromEnv(pack.envKey, pack.usdPrice),
    videoCredits: pack.videoCredits,
    expiryDays: pack.expiryDays,
    usdPrice: pack.usdPrice,
    type: "video_credits" as const,
    productId: pack.id,
  };
}

export function listVideoCatalog() {
  return {
    subscriptions: VIDEO_SUBS.map((s) => ({
      id: s.id,
      label: s.label,
      usdPrice: s.usdPrice,
      amountGhs: amountFromEnv(s.envKey, s.usdPrice),
      videoCredits: s.videoCredits,
      periodDays: s.periodDays,
      description: s.description,
    })),
    packs: VIDEO_PACKS.map((p) => ({
      id: p.id,
      label: p.label,
      usdPrice: p.usdPrice,
      amountGhs: amountFromEnv(p.envKey, p.usdPrice),
      videoCredits: p.videoCredits,
      expiryDays: p.expiryDays,
      description: p.description,
    })),
    usdToGhsRate: USD_TO_GHS,
  };
}

export const VIDEO_SUBSCRIPTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;
