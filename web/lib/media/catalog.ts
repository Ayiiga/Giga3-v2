export const IMAGE_CATEGORIES = [
  { id: "anime_art", label: "Anime Art", description: "Vibrant anime illustrations" },
  { id: "art_3d", label: "3D Art", description: "Rendered 3D visuals" },
  { id: "historical_scenes", label: "Historical Scenes", description: "Period-accurate scenes" },
  { id: "cinematic_posters", label: "Cinematic Posters", description: "Epic poster compositions" },
  { id: "social_graphics", label: "Social Media Graphics", description: "Feed-ready creatives" },
] as const;

export const VIDEO_CATEGORIES = [
  { id: "anime_videos", label: "Anime Videos", description: "Anime-style motion" },
  { id: "historical_movies", label: "Historical Movies", description: "Period film scenes" },
  { id: "dramatic_scenes", label: "Dramatic Scenes", description: "High-drama clips" },
  { id: "cinematic_trailers", label: "Cinematic Trailers", description: "Trailer-style cuts" },
  { id: "social_shorts", label: "Social Media Shorts", description: "Vertical short-form" },
] as const;

export type ImageCategoryId = (typeof IMAGE_CATEGORIES)[number]["id"];
export type VideoCategoryId = (typeof VIDEO_CATEGORIES)[number]["id"];
