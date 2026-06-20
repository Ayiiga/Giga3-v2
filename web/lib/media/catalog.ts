export const IMAGE_CATEGORIES = [
  { id: "anime_art", label: "Anime Art", description: "Vibrant anime illustrations" },
  { id: "art_3d", label: "3D Art", description: "Rendered 3D visuals" },
  { id: "historical_scenes", label: "Historical Scenes", description: "Period-accurate scenes" },
  { id: "cinematic_posters", label: "Cinematic Posters", description: "Epic poster compositions" },
  { id: "social_graphics", label: "Social Media Graphics", description: "Feed-ready creatives" },
  { id: "infographics", label: "Infographics", description: "Structured educational and business visuals" },
  { id: "brochures", label: "Brochures", description: "Multi-section brochure-ready designs" },
  { id: "flyers", label: "Flyers", description: "Promotional one-page flyer visuals" },
  { id: "business_presentations", label: "Business Presentations", description: "Slide-ready business visual assets" },
  { id: "study_visuals", label: "Study Visualizations", description: "Notes, revision maps, and learning visuals" },
  { id: "marketing_assets", label: "Marketing Assets", description: "Ads, launch creatives, and campaign visuals" },
  { id: "comparison_tables", label: "Comparison Tables", description: "Side-by-side comparison visual layouts" },
  { id: "scientific_illustrations", label: "Scientific Illustrations", description: "Science diagrams and annotated visuals" },
  { id: "circuit_diagrams", label: "Circuit Diagrams", description: "Electrical and electronics visual diagrams" },
  { id: "geometry_drawings", label: "Geometry Drawings", description: "Geometry figures and measurement visuals" },
  { id: "math_graphs", label: "Mathematical Graphs", description: "Function graphs and coordinate visuals" },
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
