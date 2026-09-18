/** Workspace drawer filter tabs + template shortcuts (single source of truth). */

export type WorkspaceFilterTabId =
  | "All"
  | "Chat"
  | "Learn"
  | "Create"
  | "Social"
  | "Research"
  | "Books"
  | "Code"
  | "CV";

export const WORKSPACE_FILTER_TABS: { id: WorkspaceFilterTabId; label: string }[] = [
  { id: "All", label: "All" },
  { id: "Chat", label: "Chat" },
  { id: "Learn", label: "Learn" },
  { id: "Create", label: "Create" },
  { id: "Social", label: "Social" },
  { id: "Research", label: "Research" },
  { id: "Books", label: "Books" },
  { id: "Code", label: "Code" },
  { id: "CV", label: "CV" },
];

/** Which filter tabs each workspace app card belongs to (by app id / nav label). */
const APP_TABS: Record<string, WorkspaceFilterTabId[]> = {
  gigasocial: ["Social"],
  gigaedit: ["Create"],
  gigalearn: ["Learn"],
  "media-studio": ["Create"],
  blog: ["Research"],
  Home: ["Chat"],
  "My Documents": ["Chat"],
  "Creator Studio": ["Create"],
  Marketplace: ["Create", "Social"],
  "AI Tools": ["Chat"],
  Automation: ["Chat"],
  "News desk": ["Research"],
  "Sports desk": ["Research"],
};

export function workspaceTabsForItem(key: string): WorkspaceFilterTabId[] {
  return APP_TABS[key] ?? [];
}

export function itemMatchesWorkspaceTab(key: string, tab: WorkspaceFilterTabId): boolean {
  if (tab === "All") return true;
  return workspaceTabsForItem(key).includes(tab);
}

/** Runtime badge for workspace cards: offline on-device vs credit-based AI Studio. */
export function workspaceRuntimeBadge(key: string): "ON DEVICE" | "AI STUDIO" | null {
  if (key === "gigaedit") return "ON DEVICE";
  if (key === "gigalearn" || key === "media-studio") return "AI STUDIO";
  return null;
}

export type WorkspaceTemplateShortcut = {
  id: string;
  tab: WorkspaceFilterTabId;
  title: string;
  description: string;
  prompt: string;
  runtime: "ON DEVICE" | "AI STUDIO";
};

export const WORKSPACE_TEMPLATE_SHORTCUTS: WorkspaceTemplateShortcut[] = [
  {
    id: "book-template",
    tab: "Books",
    title: "Book Template",
    description: "Generate a book outline",
    prompt:
      "Help me plan a book — propose a title, target audience, full chapter outline, and draft Chapter 1.",
    runtime: "AI STUDIO",
  },
  {
    id: "research-paper",
    tab: "Research",
    title: "Research Paper",
    description: "Research writing with citations",
    prompt:
      "Write a research-style answer with clear findings, analysis, and citations where available. Topic: ",
    runtime: "AI STUDIO",
  },
  {
    id: "essay-citations",
    tab: "Research",
    title: "Essay",
    description: "Essay with citations",
    prompt:
      "Write a structured essay with introduction, body paragraphs, citations, and conclusion. Topic: ",
    runtime: "AI STUDIO",
  },
  {
    id: "cv-ghana",
    tab: "CV",
    title: "CV",
    description: "CV for a Ghana job",
    prompt:
      "Draft a professional CV in Ghana format — contact details, profile, skills, experience with measurable results, education, referees. Ask me for missing details.",
    runtime: "AI STUDIO",
  },
  {
    id: "code-african-context",
    tab: "Code",
    title: "Code",
    description: "Coding with African context",
    prompt:
      "Help me with code using African context (e.g. mobile money, Ghanaian names, GHS currency). Language and task: ",
    runtime: "AI STUDIO",
  },
  {
    id: "lesson-plan",
    tab: "Learn",
    title: "Lesson Plan",
    description: "GigaLearn practice",
    prompt: "Create a GigaLearn-style lesson with objectives, worked examples, and 5 practice questions. Topic: ",
    runtime: "ON DEVICE",
  },
];

export function templateShortcutsForTab(tab: WorkspaceFilterTabId): WorkspaceTemplateShortcut[] {
  if (tab === "All") return WORKSPACE_TEMPLATE_SHORTCUTS;
  return WORKSPACE_TEMPLATE_SHORTCUTS.filter((s) => s.tab === tab);
}
