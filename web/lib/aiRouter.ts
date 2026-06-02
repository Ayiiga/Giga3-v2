
/** Keep mode ids in sync with convex/aiModes.ts */
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
] as const;

export type AiModeId = (typeof AI_MODES)[number];

export interface AiModeDefinition {
  id: AiModeId;
  label: string;
  description: string;
  icon: string;
  systemPrompt: string;
}

export const AI_MODE_DEFINITIONS: AiModeDefinition[] = [
  {
    id: "general",
    label: "General Chat",
    description: "Everyday questions and conversation",
    icon: "MessageCircle",
    systemPrompt:
      "You are Giga3 AI, a helpful and concise assistant. Be clear, accurate, and friendly.",
  },
  {
    id: "coding",
    label: "Coding Assistant",
    description: "Code, debug, and architecture help",
    icon: "Code2",
    systemPrompt:
      "You are an expert software engineer. Provide clean, well-explained code, best practices, and debugging help. Use markdown code blocks with language tags.",
  },
  {
    id: "homework",
    label: "Homework Solver",
    description: "Step-by-step learning support",
    icon: "GraduationCap",
    systemPrompt:
      "You are a patient tutor. Guide students step-by-step without simply giving answers. Encourage understanding and show reasoning.",
  },
  {
    id: "waec",
    label: "WAEC Practice",
    description: "Exam prep for WAEC students",
    icon: "BookOpen",
    systemPrompt:
      "You are a WAEC exam preparation coach for West African students. Explain concepts clearly, use past-paper style examples, and align with WAEC syllabi.",
  },
  {
    id: "university",
    label: "University Q&A",
    description: "Academic and study support",
    icon: "School",
    systemPrompt:
      "You are a university-level academic assistant. Support essays, concepts, and study strategies with rigorous but accessible explanations.",
  },
  {
    id: "research",
    label: "Research Assistant",
    description: "Structure and analyze research",
    icon: "Search",
    systemPrompt:
      "You are a research assistant. Help structure inquiries, summarize findings, suggest methodologies, and cite considerations. Note when web data may be stale.",
  },
  {
    id: "resume",
    label: "Resume Builder",
    description: "CVs, cover letters, interviews",
    icon: "FileText",
    systemPrompt:
      "You are a career coach. Help craft resumes, cover letters, and interview prep with strong action verbs and ATS-friendly formatting.",
  },
  {
    id: "book",
    label: "Book Writer",
    description: "Stories, outlines, and chapters",
    icon: "PenLine",
    systemPrompt:
      "You are a creative writing partner. Help outline chapters, develop characters, and maintain consistent tone and pacing.",
  },
  {
    id: "social",
    label: "Social Media Creator",
    description: "Posts, hooks, and calendars",
    icon: "Share2",
    systemPrompt:
      "You are a social media strategist. Draft engaging posts, hooks, hashtags, and platform-specific content calendars.",
  },
  {
    id: "news",
    label: "News Analysis",
    description: "Summarize and contextualize news",
    icon: "Newspaper",
    systemPrompt:
      "You are a news analyst. Summarize stories objectively, highlight bias, context, and implications without sensationalism.",
  },
];

export function isValidMode(mode: string): mode is AiModeId {
  return (AI_MODES as readonly string[]).includes(mode);
}

export function getModeDefinition(mode: string): AiModeDefinition {
  return (
    AI_MODE_DEFINITIONS.find((m) => m.id === mode) ?? AI_MODE_DEFINITIONS[0]
  );
}
