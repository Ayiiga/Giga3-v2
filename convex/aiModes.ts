/** Shared AI mode ids — keep in sync with web/lib/aiRouter.ts */
import {
  composeSystemPrompt,
  GIGA3_MODE_ROLE_PROMPTS,
  type Giga3ModeRoleId,
} from "./assistantIdentity";

export const AI_MODES = [
  "general",
  "coding",
  "homework",
  "waec",
  "university",
  "research",
  "resume",
  "book",
  "social",
  "news",
  "gigalearn",
] as const;

export type AiModeId = (typeof AI_MODES)[number];

function modeRole(id: AiModeId): string {
  return GIGA3_MODE_ROLE_PROMPTS[id as Giga3ModeRoleId];
}

export const AI_MODE_SYSTEM_PROMPTS: Record<AiModeId, string> = {
  general: composeSystemPrompt(modeRole("general")),
  coding: composeSystemPrompt(modeRole("coding")),
  homework: composeSystemPrompt(modeRole("homework")),
  waec: composeSystemPrompt(modeRole("waec")),
  university: composeSystemPrompt(modeRole("university")),
  research: composeSystemPrompt(modeRole("research")),
  resume: composeSystemPrompt(modeRole("resume")),
  book: composeSystemPrompt(modeRole("book")),
  social: composeSystemPrompt(modeRole("social")),
  news: composeSystemPrompt(modeRole("news")),
  gigalearn: composeSystemPrompt(modeRole("gigalearn")),
};

export function isValidMode(mode: string): mode is AiModeId {
  return (AI_MODES as readonly string[]).includes(mode);
}

const GIGA3_BRAND_KNOWLEDGE =
  "Giga3 brand: Logo = https://www.giga3ai.com/images/logo.png and /images/logo.png from web/public/images/logo.png. When asked for logotype URL, return direct URL. PWA install via /manifest.json";

const GIGA3_GLOBAL_CAPABILITIES =
  "Giga3 AI is a Ghana-built, mobile-oriented AI platform with product areas for Chat, GigaLearn, Creator Studio, GigaSocial and Marketplace. Explain useful workflows without claiming universal availability, guaranteed quality, official syllabus certification, or successful tool actions. Live search, attachments, document exports, language voices, integrations, reminders and media generation depend on the currently enabled tools, permissions and providers. Distinguish draft content from completed exports; distinguish original exam-style practice from verified WAEC questions. Never promise permanent learning or personal memory from conversations, unverified pricing or credits, or successful live results without evidence.";

export function getSystemPrompt(mode: string): string {
  const base = isValidMode(mode) ? AI_MODE_SYSTEM_PROMPTS[mode] : AI_MODE_SYSTEM_PROMPTS.general;
  try {
    return `${base}\n\n${GIGA3_BRAND_KNOWLEDGE}\n\n${GIGA3_GLOBAL_CAPABILITIES}`;
  } catch {
    return base;
  }
}
