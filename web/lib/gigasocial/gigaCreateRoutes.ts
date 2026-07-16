import type { GigaCreateActionId } from "@/components/gigasocial/create/gigaCreateMenu";
import { siteConfig } from "@/lib/site";
import type { SocialPostTypeId } from "@/lib/gigasocial/sections";

export type GigaCreateRoute =
  | { kind: "compose"; action: GigaCreateActionId; body?: string; postType?: SocialPostTypeId }
  | { kind: "navigate"; href: string }
  | { kind: "toast"; message: string };

const DOCUMENT_TEMPLATES: Partial<Record<GigaCreateActionId, { body: string; postType: SocialPostTypeId }>> = {
  "doc-pdf": {
    body: "📄 PDF Document\n\nTitle:\n\nSummary:\n\nSections:\n1.\n2.\n3.\n",
    postType: "education",
  },
  "doc-word": {
    body: "📝 Document\n\n# Title\n\n## Introduction\n\n## Main content\n\n## Conclusion\n",
    postType: "education",
  },
  "doc-research": {
    body: "🔬 Action Research\n\nProblem:\n\nMethod:\n\nFindings:\n\nNext steps:\n",
    postType: "education",
  },
  "doc-essay": {
    body: "✍️ Essay\n\nThesis:\n\nIntroduction:\n\nBody paragraphs:\n\nConclusion:\n",
    postType: "education",
  },
  "doc-cv": {
    body: "🎓 Curriculum Vitae\n\nName:\nEducation:\nExperience:\nSkills:\nReferences:\n",
    postType: "education",
  },
  "doc-resume": {
    body: "💼 Resume\n\nSummary:\nExperience:\nSkills:\nEducation:\n",
    postType: "education",
  },
  "doc-book": {
    body: "📚 Book draft\n\nTitle:\n\nChapter 1 outline:\n\nKey themes:\n",
    postType: "education",
  },
  "doc-lesson-notes": {
    body: "📓 Lesson notes\n\nTopic:\n\nKey points:\n\nQuestions:\n",
    postType: "education",
  },
  "doc-coding": {
    body: "🧩 Coding project\n\nProject name:\n\nGoals:\n\nStack:\n\nTasks:\n",
    postType: "creator",
  },
  "doc-programming": {
    body: "💻 Programming file\n\nLanguage:\n\nPurpose:\n\n```\n// code here\n```\n",
    postType: "creator",
  },
  "doc-markdown": {
    body: "# Markdown document\n\n## Section\n\n- Item one\n- Item two\n",
    postType: "education",
  },
  "doc-presentation": {
    body: "📊 Presentation\n\nSlide 1 — Title\nSlide 2 — Overview\nSlide 3 — Key points\nSlide 4 — Summary\n",
    postType: "education",
  },
  "edu-assignment": {
    body: "📌 Assignment\n\nSubject:\n\nDue date:\n\nTasks:\n1.\n2.\n",
    postType: "education",
  },
  "edu-quiz": {
    body: "❓ Quiz\n\nQ1:\nA)\nB)\nC)\n\nQ2:\n",
    postType: "education",
  },
  "edu-notes": {
    body: "🗒 Study notes\n\nTopic:\n\nSummary:\n\nKey terms:\n",
    postType: "education",
  },
  "edu-homework": {
    body: "🏠 Homework\n\nSubject:\n\nTasks:\n\nDeadline:\n",
    postType: "education",
  },
  "edu-lesson-plan": {
    body: "📅 Lesson plan\n\nObjectives:\n\nActivities:\n\nAssessment:\n",
    postType: "education",
  },
};

export function resolveGigaCreateRoute(action: GigaCreateActionId): GigaCreateRoute {
  switch (action) {
    case "media-unified":
    case "media-photo":
    case "photo-studio":
      return { kind: "compose", action: "photo-studio", postType: "image" };
    case "media-video":
    case "video-studio":
      return { kind: "compose", action: "video-studio", postType: "video" };
    case "media-camera":
      return { kind: "compose", action: "media-camera", postType: "image" };
    case "media-audio":
      return { kind: "compose", action: "media-audio", postType: "image" };
    case "ai-chat":
      return { kind: "navigate", href: siteConfig.links.dashboard };
    case "ai-image":
      return { kind: "navigate", href: siteConfig.links.media };
    case "ai-video":
      return { kind: "navigate", href: siteConfig.links.video };
    case "ai-document":
      return { kind: "navigate", href: `${siteConfig.links.dashboard}?category=writing` };
    case "ai-coding":
      return { kind: "navigate", href: `${siteConfig.links.dashboard}?category=coding` };
    case "remix":
      return {
        kind: "toast",
        message: "Choose a post below and tap Remix to start a remix chain.",
      };
    case "live-content":
      return { kind: "compose", action: "live-content" };
    default: {
      const template = DOCUMENT_TEMPLATES[action];
      if (template) {
        return {
          kind: "compose",
          action,
          body: template.body,
          postType: template.postType,
        };
      }
      return { kind: "compose", action };
    }
  }
}
