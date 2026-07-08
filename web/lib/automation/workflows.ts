import type { AutomationWorkflow, WorkflowStep } from "./types";

const WORKFLOWS_KEY = "giga3_automation_workflows";
const RUNS_KEY = "giga3_automation_runs";

function step(
  id: string,
  label: string,
  partial: Omit<WorkflowStep, "id" | "label">
): WorkflowStep {
  return { id, label, ...partial };
}

export const BUILTIN_WORKFLOWS: AutomationWorkflow[] = [
  {
    id: "summarize-document",
    title: "Summarize document",
    description: "Turn uploaded or pasted text into clear bullet-point summaries.",
    category: "general",
    builtIn: true,
    createdAt: 0,
    updatedAt: 0,
    steps: [
      step("s1", "Summarize", {
        type: "chat",
        mode: "research",
        promptTemplate:
          "Summarize the following document in clear bullet points with key takeaways:\n\n{{input}}",
      }),
      step("s2", "Notify", {
        type: "notify",
        promptTemplate: "",
        notifyMessage: "Document summary ready.",
      }),
    ],
  },
  {
    id: "syllabus-lesson-notes",
    title: "Syllabus → lesson notes",
    description: "Generate structured lesson notes from a syllabus or topic list.",
    category: "education",
    builtIn: true,
    createdAt: 0,
    updatedAt: 0,
    steps: [
      step("s1", "Parse syllabus", {
        type: "gigalearn",
        toolId: "lesson-notes",
        promptTemplate: "Create lesson notes from this syllabus:\n\n{{input}}",
      }),
      step("s2", "Notify", {
        type: "notify",
        promptTemplate: "",
        notifyMessage: "Lesson notes saved to GigaLearn artifacts.",
      }),
    ],
  },
  {
    id: "image-captions",
    title: "Image → captions",
    description: "Generate social captions after creating an image in Media Studio.",
    category: "creator",
    builtIn: true,
    createdAt: 0,
    updatedAt: 0,
    steps: [
      step("s1", "Write captions", {
        type: "creator",
        toolId: "caption-generator",
        promptTemplate:
          "Write 3 engaging social media captions for an image about:\n\n{{input}}",
      }),
    ],
  },
  {
    id: "notes-to-quiz",
    title: "Lesson notes → quiz",
    description: "Produce a quiz automatically from existing lesson notes.",
    category: "education",
    builtIn: true,
    createdAt: 0,
    updatedAt: 0,
    steps: [
      step("s1", "Generate quiz", {
        type: "gigalearn",
        toolId: "quiz-generator",
        promptTemplate: "Generate a quiz from these lesson notes:\n\n{{input}}",
      }),
    ],
  },
  {
    id: "study-plan-auto",
    title: "Auto study plan",
    description: "Build a personalized study plan from subjects and exam date.",
    category: "education",
    builtIn: true,
    createdAt: 0,
    updatedAt: 0,
    steps: [
      step("s1", "Study plan", {
        type: "gigalearn",
        toolId: "study-plan",
        promptTemplate: "Create a study plan for:\n\n{{input}}",
      }),
    ],
  },
  {
    id: "organize-creations",
    title: "Organize AI creations",
    description: "Categorize and label your recent GigaLearn and Creator outputs.",
    category: "creator",
    builtIn: true,
    createdAt: 0,
    updatedAt: 0,
    steps: [
      step("s1", "Organize", {
        type: "chat",
        mode: "general",
        promptTemplate:
          "Organize these AI-generated items into labeled categories with a short index:\n\n{{input}}",
      }),
    ],
  },
  {
    id: "worksheet-from-topic",
    title: "Topic → worksheet",
    description: "Teacher worksheet with exercises and answer key.",
    category: "education",
    builtIn: true,
    createdAt: 0,
    updatedAt: 0,
    steps: [
      step("s1", "Worksheet", {
        type: "gigalearn",
        toolId: "worksheet-generator",
        promptTemplate: "Create a printable worksheet for:\n\n{{input}}",
      }),
    ],
  },
];

function readUserWorkflows(): AutomationWorkflow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WORKFLOWS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AutomationWorkflow[];
  } catch {
    return [];
  }
}

function writeUserWorkflows(workflows: AutomationWorkflow[]) {
  localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(workflows));
}

export function listWorkflows(): AutomationWorkflow[] {
  const user = readUserWorkflows();
  const builtInIds = new Set(BUILTIN_WORKFLOWS.map((w) => w.id));
  const custom = user.filter((w) => !builtInIds.has(w.id));
  return [...BUILTIN_WORKFLOWS, ...custom];
}

export function getWorkflow(id: string): AutomationWorkflow | undefined {
  return listWorkflows().find((w) => w.id === id);
}

export function saveWorkflow(
  workflow: Omit<AutomationWorkflow, "createdAt" | "updatedAt"> & {
    createdAt?: number;
    updatedAt?: number;
  }
): AutomationWorkflow {
  const now = Date.now();
  const record: AutomationWorkflow = {
    ...workflow,
    builtIn: false,
    createdAt: workflow.createdAt ?? now,
    updatedAt: now,
  };
  const user = readUserWorkflows().filter((w) => w.id !== record.id);
  writeUserWorkflows([record, ...user]);
  return record;
}

export function deleteWorkflow(id: string): boolean {
  if (BUILTIN_WORKFLOWS.some((w) => w.id === id)) return false;
  const next = readUserWorkflows().filter((w) => w.id !== id);
  writeUserWorkflows(next);
  return true;
}

export type WorkflowRun = import("./types").WorkflowRunRecord;

function readRuns(): WorkflowRun[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RUNS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WorkflowRun[];
  } catch {
    return [];
  }
}

function writeRuns(runs: WorkflowRun[]) {
  localStorage.setItem(RUNS_KEY, JSON.stringify(runs.slice(0, 40)));
}

export function listWorkflowRuns(): WorkflowRun[] {
  return readRuns().sort((a, b) => b.startedAt - a.startedAt);
}

export function saveWorkflowRun(run: WorkflowRun) {
  const existing = readRuns().filter((r) => r.id !== run.id);
  writeRuns([run, ...existing]);
}
