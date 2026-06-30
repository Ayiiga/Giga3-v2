export const VIDEO_AI_CATEGORIES = [
  { id: "text_to_video", label: "Text to Video", description: "Generate motion from a written prompt" },
  { id: "image_to_video", label: "Image to Video", description: "Animate a still image" },
  { id: "talking_avatar", label: "Talking Avatar", description: "Presenter-style talking head clips" },
  { id: "educational", label: "Educational", description: "Lessons and explainers" },
  { id: "product_ad", label: "Product Ad", description: "Product showcase advertisements" },
  { id: "promotional", label: "Promotional", description: "Campaign and promo videos" },
  { id: "social_reel", label: "Social Reel", description: "Vertical short-form content" },
  { id: "presentation", label: "Presentation", description: "Business slide motion graphics" },
  { id: "cinematic", label: "Cinematic", description: "Film-style storytelling" },
] as const;

export const VIDEO_AI_COSTS: Record<string, number> = {
  text_to_video: 5,
  image_to_video: 6,
  talking_avatar: 8,
  educational: 6,
  product_ad: 7,
  promotional: 6,
  social_reel: 5,
  presentation: 6,
  cinematic: 10,
};

export const VIDEO_SUBSCRIPTIONS = [
  {
    id: "video_sub_creator",
    label: "Video Creator",
    usdPrice: 10,
    videoCredits: 40,
    description: "Monthly video credits for reels and social clips.",
  },
  {
    id: "video_sub_pro",
    label: "Video Pro",
    usdPrice: 50,
    videoCredits: 250,
    description: "Professional campaigns and education.",
    highlighted: true,
  },
  {
    id: "video_sub_studio",
    label: "Video Studio",
    usdPrice: 100,
    videoCredits: 600,
    description: "Studio volume for agencies and cinematic work.",
  },
] as const;

export const VIDEO_PACKS = [
  { id: "video_pack_10", label: "Pack $10", usdPrice: 10, videoCredits: 35, expiryDays: 90 },
  { id: "video_pack_25", label: "Pack $25", usdPrice: 25, videoCredits: 100, expiryDays: 120 },
  { id: "video_pack_50", label: "Pack $50", usdPrice: 50, videoCredits: 220, expiryDays: 180 },
  { id: "video_pack_100", label: "Pack $100", usdPrice: 100, videoCredits: 500, expiryDays: 365 },
] as const;
