export type GigaCreateCategoryId = "media" | "documents" | "ai" | "education" | "social";

export type GigaCreateActionId =
  | "video-studio"
  | "photo-studio"
  | "text-post"
  | "remix"
  | "ai-enhance"
  | "learning-post"
  | "product-post"
  | "live-content"
  | "media-unified"
  | "media-photo"
  | "media-video"
  | "media-camera"
  | "media-audio"
  | "doc-pdf"
  | "doc-word"
  | "doc-research"
  | "doc-essay"
  | "doc-cv"
  | "doc-resume"
  | "doc-book"
  | "doc-lesson-notes"
  | "doc-coding"
  | "doc-programming"
  | "doc-markdown"
  | "doc-presentation"
  | "doc-spreadsheet"
  | "ai-chat"
  | "ai-image"
  | "ai-video"
  | "ai-document"
  | "ai-coding"
  | "edu-assignment"
  | "edu-quiz"
  | "edu-notes"
  | "edu-homework"
  | "edu-lesson-plan";

export type GigaCreateMenuItem = {
  id: GigaCreateActionId;
  label: string;
  emoji: string;
  description: string;
  disabled?: boolean;
};

export type GigaCreateMenuSection = {
  id: GigaCreateCategoryId;
  title: string;
  subtitle: string;
  items: GigaCreateMenuItem[];
};

const MEDIA_ITEMS: GigaCreateMenuItem[] = [
  {
    id: "media-unified",
    label: "Media",
    emoji: "📎",
    description: "Photos, video, camera, music, and files in one picker",
  },
  {
    id: "media-photo",
    label: "Photo",
    emoji: "📸",
    description: "Share a single photo or gallery",
  },
  {
    id: "media-video",
    label: "Video",
    emoji: "🎥",
    description: "Record or upload a short video",
  },
  {
    id: "media-camera",
    label: "Camera",
    emoji: "📷",
    description: "Capture with your device camera",
  },
  {
    id: "media-audio",
    label: "Audio / Music",
    emoji: "🎵",
    description: "Attach music to photo posts",
  },
];

const DOCUMENT_ITEMS: GigaCreateMenuItem[] = [
  {
    id: "doc-pdf",
    label: "PDF",
    emoji: "📄",
    description: "Draft or outline a PDF document",
  },
  {
    id: "doc-word",
    label: "Word-style Document",
    emoji: "📝",
    description: "Structured document with headings",
  },
  {
    id: "doc-research",
    label: "Action Research",
    emoji: "🔬",
    description: "Research plan and findings template",
  },
  {
    id: "doc-essay",
    label: "Essay",
    emoji: "✍️",
    description: "Essay outline and draft",
  },
  {
    id: "doc-cv",
    label: "Curriculum Vitae (CV)",
    emoji: "🎓",
    description: "Academic CV template",
  },
  {
    id: "doc-resume",
    label: "Resume",
    emoji: "💼",
    description: "Professional resume template",
  },
  {
    id: "doc-book",
    label: "Books",
    emoji: "📚",
    description: "Book outline or chapter draft",
  },
  {
    id: "doc-lesson-notes",
    label: "Lesson Notes",
    emoji: "📓",
    description: "Class notes and key points",
  },
  {
    id: "doc-coding",
    label: "Coding Project",
    emoji: "🧩",
    description: "Project README and structure",
  },
  {
    id: "doc-programming",
    label: "Programming File",
    emoji: "💻",
    description: "Source file draft or snippet",
  },
  {
    id: "doc-markdown",
    label: "Markdown",
    emoji: "📋",
    description: "Markdown document template",
  },
  {
    id: "doc-presentation",
    label: "Presentation",
    emoji: "📊",
    description: "Slide deck outline",
  },
  {
    id: "doc-spreadsheet",
    label: "Spreadsheet",
    emoji: "📈",
    description: "Coming soon — table and data template",
    disabled: true,
  },
];

const AI_ITEMS: GigaCreateMenuItem[] = [
  {
    id: "ai-chat",
    label: "AI Chat",
    emoji: "💬",
    description: "Open Giga3 AI Assistant",
  },
  {
    id: "ai-image",
    label: "AI Image",
    emoji: "🖼",
    description: "Generate images in Media Studio",
  },
  {
    id: "ai-video",
    label: "AI Video",
    emoji: "🎬",
    description: "Generate video in Video AI",
  },
  {
    id: "ai-document",
    label: "AI Document",
    emoji: "📑",
    description: "Draft documents with AI",
  },
  {
    id: "ai-coding",
    label: "AI Coding Assistant",
    emoji: "⚡",
    description: "Code help in chat (coding mode)",
  },
];

const EDUCATION_ITEMS: GigaCreateMenuItem[] = [
  {
    id: "edu-assignment",
    label: "Assignment",
    emoji: "📌",
    description: "Assignment brief and tasks",
  },
  {
    id: "edu-quiz",
    label: "Quiz",
    emoji: "❓",
    description: "Quiz questions and answers",
  },
  {
    id: "edu-notes",
    label: "Notes",
    emoji: "🗒",
    description: "Study notes template",
  },
  {
    id: "edu-homework",
    label: "Homework",
    emoji: "🏠",
    description: "Homework planner",
  },
  {
    id: "edu-lesson-plan",
    label: "Lesson Plan",
    emoji: "📅",
    description: "Lesson objectives and activities",
  },
];

const SOCIAL_ITEMS: GigaCreateMenuItem[] = [
  {
    id: "text-post",
    label: "Text Post",
    emoji: "✍️",
    description: "Write an update or story",
  },
  {
    id: "remix",
    label: "Remix Content",
    emoji: "🎵",
    description: "Tap Remix on a post in your feed",
  },
  {
    id: "learning-post",
    label: "Learning Post",
    emoji: "📚",
    description: "Share educational content",
  },
  {
    id: "product-post",
    label: "Product Post",
    emoji: "🛒",
    description: "Showcase something you sell",
  },
  {
    id: "ai-enhance",
    label: "AI Enhance",
    emoji: "🤖",
    description: "Improve caption and hashtags",
  },
  {
    id: "live-content",
    label: "Live Stream",
    emoji: "🔴",
    description: "Go live with video, audio, or screen share",
  },
];

export const GIGA_CREATE_SECTIONS: GigaCreateMenuSection[] = [
  { id: "media", title: "Media", subtitle: "Photos, video, camera, and music", items: MEDIA_ITEMS },
  {
    id: "documents",
    title: "Documents",
    subtitle: "PDF, essays, CVs, and more",
    items: DOCUMENT_ITEMS,
  },
  { id: "ai", title: "AI Creation", subtitle: "Chat, image, video, and code", items: AI_ITEMS },
  {
    id: "education",
    title: "Education",
    subtitle: "Assignments, quizzes, and lesson plans",
    items: EDUCATION_ITEMS,
  },
  {
    id: "social",
    title: "Social",
    subtitle: "Posts, remix, and live",
    items: SOCIAL_ITEMS,
  },
];

/** Flat list for backward compatibility. */
export const GIGA_CREATE_MENU: GigaCreateMenuItem[] = GIGA_CREATE_SECTIONS.flatMap(
  (section) => section.items
);

export function getGigaCreateSections(options?: {
  enableLive?: boolean;
}): GigaCreateMenuSection[] {
  return GIGA_CREATE_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => item.id !== "live-content" || options?.enableLive !== false
    ),
  })).filter((section) => section.items.length > 0);
}

/** Five-option upload menu for the GigaSocial (+) FAB — feed only. */
export const GIGA_CREATE_FAB_ITEMS: GigaCreateMenuItem[] = [
  {
    id: "media-camera",
    label: "Camera",
    emoji: "📷",
    description: "Capture photos or videos with your device camera",
  },
  {
    id: "media-unified",
    label: "Photo / Photo with Music",
    emoji: "🖼️",
    description: "Select photos, add music, and create a slideshow",
  },
  {
    id: "video-studio",
    label: "Video",
    emoji: "🎥",
    description: "Record or choose a video — trim, filters, and captions",
  },
  {
    id: "text-post",
    label: "Post",
    emoji: "✍️",
    description: "Write a post with photos, emojis, and hashtags",
  },
  {
    id: "live-content",
    label: "Go Live",
    emoji: "🔴",
    description: "Start a live broadcast with title and audience",
  },
];

export function getGigaCreateFabItems(options?: {
  enableLive?: boolean;
}): GigaCreateMenuItem[] {
  return GIGA_CREATE_FAB_ITEMS.filter(
    (item) => item.id !== "live-content" || options?.enableLive !== false
  );
}
