/** Video AI credit costs — independent from chat `CREDIT_COSTS`. */

export const VIDEO_AI_COSTS = {
  text_to_video: 5,
  image_to_video: 6,
  talking_avatar: 8,
  educational: 6,
  product_ad: 7,
  promotional: 6,
  social_reel: 5,
  presentation: 6,
  cinematic: 10,
} as const;

export type VideoAiCategory = keyof typeof VIDEO_AI_COSTS;

export function videoCostForCategory(category: string): number {
  if (category in VIDEO_AI_COSTS) {
    return VIDEO_AI_COSTS[category as VideoAiCategory];
  }
  return VIDEO_AI_COSTS.text_to_video;
}

export const FREE_VIDEO_STARTER_CREDITS = 5;
