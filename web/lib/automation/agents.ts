import type { AgentDefinition } from "./types";

export const AI_AGENTS: AgentDefinition[] = [
  {
    id: "study",
    label: "Study Assistant",
    description: "Quizzes, study plans, and exam prep for students.",
    mode: "gigalearn",
    systemHint:
      "You are a patient study coach. Break topics into steps, use examples, and encourage understanding.",
    suggestedWorkflowIds: ["study-plan-auto", "notes-to-quiz"],
    gigalearnTab: "student",
  },
  {
    id: "teacher",
    label: "Teacher Assistant",
    description: "Lesson notes, worksheets, and class activities.",
    mode: "gigalearn",
    systemHint:
      "You are an experienced teacher. Provide structured lesson materials aligned to curriculum.",
    suggestedWorkflowIds: ["syllabus-lesson-notes", "worksheet-from-topic"],
    gigalearnTab: "teacher",
  },
  {
    id: "business",
    label: "Business Assistant",
    description: "Reports, summaries, and professional communication.",
    mode: "general",
    systemHint:
      "You are a business analyst. Be concise, actionable, and professional.",
    suggestedWorkflowIds: ["summarize-document"],
  },
  {
    id: "marketing",
    label: "Marketing Assistant",
    description: "Social posts, hooks, and campaign ideas.",
    mode: "social",
    systemHint:
      "You are a creative marketer. Write engaging copy with clear calls to action.",
    suggestedWorkflowIds: ["image-captions"],
    creatorLink: "/creator-studio",
  },
  {
    id: "writing",
    label: "Writing Assistant",
    description: "Essays, stories, resumes, and long-form content.",
    mode: "book",
    systemHint:
      "You are an expert writer. Match tone to audience and structure clearly.",
    suggestedWorkflowIds: ["summarize-document"],
  },
  {
    id: "coding",
    label: "Coding Assistant",
    description: "Code, debug, and explain technical solutions.",
    mode: "coding",
    systemHint:
      "You are a senior engineer. Provide working code with brief explanations.",
    suggestedWorkflowIds: [],
  },
  {
    id: "research",
    label: "Research Assistant",
    description: "Structured research, citations, and analysis.",
    mode: "research",
    systemHint:
      "You are a research analyst. Cite uncertainty, structure findings, and suggest next steps.",
    suggestedWorkflowIds: ["summarize-document"],
  },
  {
    id: "creator",
    label: "Creator Assistant",
    description: "Content ideation, scripts, and creator workflows.",
    mode: "social",
    systemHint:
      "You are a creator coach. Focus on hooks, audience growth, and reusable content.",
    suggestedWorkflowIds: ["image-captions", "organize-creations"],
    creatorLink: "/creator-studio",
  },
];

export function getAgent(id: string): AgentDefinition | undefined {
  return AI_AGENTS.find((a) => a.id === id);
}
