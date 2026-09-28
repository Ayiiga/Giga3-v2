import type { DocumentTemplateId } from "@/lib/chat/documentTemplates";
import { siteConfig } from "@/lib/site";

export type ChatCreateCategoryId = "media" | "documents" | "ai" | "education";

export type ChatCreateActionId =
  | "media-unified"
  | "media-camera"
  | "media-photos"
  | "media-video"
  | "media-audio"
  | "doc-pdf"
  | "doc-research"
  | "doc-essay"
  | "doc-thesis"
  | "doc-cv-resume"
  | "doc-book"
  | "doc-lesson-notes"
  | "doc-coding"
  | "doc-programming"
  | "doc-markdown"
  | "doc-notes"
  | "ai-chat"
  | "ai-image"
  | "ai-video"
  | "ai-document"
  | "ai-coding"
  | "edu-assignment"
  | "edu-homework"
  | "edu-quiz"
  | "edu-lesson-plan"
  | "edu-study-notes";

export type ChatCreateMenuItem = {
  id: ChatCreateActionId;
  label: string;
  emoji: string;
  description: string;
  /** Runtime badge: on-device (offline, free) vs AI Studio (uses credits). */
  runtime?: "ON DEVICE" | "AI STUDIO";
};

export type ChatCreateMenuSection = {
  id: ChatCreateCategoryId;
  title: string;
  items: ChatCreateMenuItem[];
};

export const CHAT_CREATE_SECTIONS: ChatCreateMenuSection[] = [
  {
    id: "media",
    title: "Media",
    items: [
      {
        id: "media-unified",
        label: "Media",
        emoji: "📎",
        description: "Photos, video, camera, audio, files",
        runtime: "ON DEVICE",
      },
      { id: "media-camera", label: "Camera", emoji: "📷", description: "Capture a photo", runtime: "ON DEVICE" },
      { id: "media-photos", label: "Photos", emoji: "🖼", description: "One or more images", runtime: "ON DEVICE" },
      { id: "media-video", label: "Videos", emoji: "🎥", description: "Attach a video", runtime: "ON DEVICE" },
      { id: "media-audio", label: "Audio", emoji: "🎵", description: "Music or voice file", runtime: "ON DEVICE" },
    ],
  },
  {
    id: "documents",
    title: "Documents",
    items: [
      { id: "doc-pdf", label: "PDF", emoji: "📄", description: "PDF outline or analysis brief", runtime: "AI STUDIO" },
      {
        id: "doc-research",
        label: "Action Research",
        emoji: "🔬",
        description: "Research plan template",
        runtime: "AI STUDIO",
      },
      { id: "doc-essay", label: "Essay", emoji: "✍️", description: "Essay scaffold", runtime: "AI STUDIO" },
      { id: "doc-thesis", label: "Thesis", emoji: "🎓", description: "Graduate thesis structure", runtime: "AI STUDIO" },
      { id: "doc-cv-resume", label: "CV / Resume", emoji: "💼", description: "Professional CV template", runtime: "AI STUDIO" },
      { id: "doc-book", label: "Books", emoji: "📚", description: "Book outline", runtime: "AI STUDIO" },
      { id: "doc-lesson-notes", label: "Lesson Notes", emoji: "📓", description: "Class notes template", runtime: "AI STUDIO" },
      { id: "doc-coding", label: "Coding Project", emoji: "🧩", description: "Project README scaffold", runtime: "AI STUDIO" },
      {
        id: "doc-programming",
        label: "Programming File",
        emoji: "💻",
        description: "Source file draft",
      },
      { id: "doc-markdown", label: "Markdown", emoji: "📋", description: "Markdown document", runtime: "AI STUDIO" },
      { id: "doc-notes", label: "Notes", emoji: "🗒", description: "Quick notes template", runtime: "AI STUDIO" },
    ],
  },
  {
    id: "ai",
    title: "AI Creation",
    items: [
      { id: "ai-chat", label: "AI Chat", emoji: "💬", description: "Stay in chat", runtime: "AI STUDIO" },
      { id: "ai-image", label: "AI Image", emoji: "🖼", description: "Open Media Studio", runtime: "AI STUDIO" },
      { id: "ai-video", label: "AI Video", emoji: "🎬", description: "Open Video AI", runtime: "AI STUDIO" },
      { id: "ai-document", label: "AI Document", emoji: "📑", description: "Writing mode", runtime: "AI STUDIO" },
      { id: "ai-coding", label: "AI Coding Assistant", emoji: "⚡", description: "Coding mode", runtime: "AI STUDIO" },
    ],
  },
  {
    id: "education",
    title: "Education",
    items: [
      { id: "edu-assignment", label: "Assignment", emoji: "📌", description: "Assignment brief", runtime: "AI STUDIO" },
      { id: "edu-homework", label: "Homework", emoji: "🏠", description: "Homework planner", runtime: "AI STUDIO" },
      { id: "edu-quiz", label: "Quiz", emoji: "❓", description: "Quiz template", runtime: "AI STUDIO" },
      { id: "edu-lesson-plan", label: "Lesson Plan", emoji: "📅", description: "Lesson objectives", runtime: "AI STUDIO" },
      { id: "edu-study-notes", label: "Study Notes", emoji: "📖", description: "Study notes scaffold", runtime: "AI STUDIO" },
    ],
  },
];

const DOCUMENT_TEMPLATE_MAP: Partial<Record<ChatCreateActionId, DocumentTemplateId>> = {
  "doc-cv-resume": "resume",
  "doc-essay": "essay",
  "doc-thesis": "thesis",
  "doc-book": "book-writing",
  "doc-research": "research-paper",
};

const INLINE_TEMPLATES: Partial<Record<ChatCreateActionId, string>> = {
  "doc-pdf":
    "Help me draft or analyze a PDF document.\n\nTopic:\n\nKey sections:\n1.\n2.\n3.\n",
  "doc-lesson-notes": "📓 Lesson notes\n\nTopic:\n\nKey points:\n\nQuestions:\n",
  "doc-coding":
    "🧩 Coding project\n\nProject name:\n\nGoals:\n\nStack:\n\nTasks:\n",
  "doc-programming":
    "💻 Programming file\n\nLanguage:\n\nPurpose:\n\n```\n// code here\n```\n",
  "doc-markdown": "# Markdown document\n\n## Section\n\n- Item one\n- Item two\n",
  "doc-notes": "Quick notes\n\nTopic:\n\nSummary:\n\nAction items:\n",
  "edu-assignment": "📌 Assignment\n\nSubject:\n\nDue date:\n\nTasks:\n1.\n2.\n",
  "edu-homework": "🏠 Homework\n\nSubject:\n\nTasks:\n\nDeadline:\n",
  "edu-quiz": "❓ Quiz\n\nQ1:\nA)\nB)\nC)\n\nQ2:\n",
  "edu-lesson-plan": "📅 Lesson plan\n\nObjectives:\n\nActivities:\n\nAssessment:\n",
  "edu-study-notes": "📖 Study notes\n\nTopic:\n\nSummary:\n\nKey terms:\n",
};

export type ChatCreateRoute =
  | { kind: "media"; action: ChatCreateActionId }
  | { kind: "template"; documentId: DocumentTemplateId }
  | { kind: "insert"; body: string }
  | { kind: "navigate"; href: string }
  | { kind: "noop" };

export function resolveChatCreateRoute(action: ChatCreateActionId): ChatCreateRoute {
  if (
    action === "media-unified" ||
    action === "media-camera" ||
    action === "media-photos" ||
    action === "media-video" ||
    action === "media-audio"
  ) {
    return { kind: "media", action };
  }

  const documentId = DOCUMENT_TEMPLATE_MAP[action];
  if (documentId) return { kind: "template", documentId };

  const body = INLINE_TEMPLATES[action];
  if (body) return { kind: "insert", body };

  switch (action) {
    case "ai-chat":
      return { kind: "noop" };
    case "ai-image":
      return { kind: "navigate", href: siteConfig.links.media };
    case "ai-video":
      return { kind: "navigate", href: siteConfig.links.video };
    case "ai-document":
      return { kind: "navigate", href: `${siteConfig.links.dashboard}?category=writing` };
    case "ai-coding":
      return { kind: "navigate", href: `${siteConfig.links.dashboard}?category=coding` };
    default:
      return { kind: "noop" };
  }
}
