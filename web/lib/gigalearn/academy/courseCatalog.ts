/**
 * Built-in GigaLearn Academy catalogue.
 * Courses reference existing curriculum/tools/media — they do not copy lesson bodies.
 */
import type { AcademyCourse, AcademyCourseListItem } from "@/lib/gigalearn/academy/types";

export const ACADEMY_CATEGORIES = [
  "Exam prep",
  "Core subjects",
  "Early years",
  "Teacher practice",
  "Study skills",
] as const;

export const ACADEMY_SUBJECTS = [
  "Mathematics",
  "English Language",
  "Science",
  "Integrated studies",
  "Teaching",
] as const;

const BUILTIN_COURSES: AcademyCourse[] = [
  {
    slug: "bece-maths-foundations",
    title: "BECE Mathematics Foundations",
    description:
      "A structured pathway through core JHS mathematics topics with practice and AI tutor support. Uses your existing GigaLearn practice tools — no duplicate question bank.",
    subject: "Mathematics",
    category: "Exam prep",
    difficulty: "beginner",
    durationMinutes: 240,
    learningObjectives: [
      "Refresh number operations and fractions for BECE",
      "Practise algebra and geometry strands with scored sets",
      "Identify weak topics and revisit them with the AI tutor",
    ],
    prerequisites: ["JHS / Basic 7–9 maths familiarity", "Signed-in Giga3 account"],
    curriculumPreview: "Aligned to Ghana CCP mathematics strands (gh-ccp) for Basic 7–9.",
    assessmentDescription:
      "Module practice quizzes via GigaLearn practice-questions / quiz-generator tools. Scores sync to your existing GigaLearn progress when you complete practice in-app.",
    instructorName: "GigaLearn Faculty",
    instructorBio: "Curriculum-aligned pathways curated for Ghanaian BECE learners.",
    access: "free",
    certificateEligible: false,
    completionRequirements:
      "Complete all required lessons and finish at least one scored practice set per module.",
    source: "catalog",
    status: "published",
    modules: [
      {
        id: "m1-numbers",
        title: "Numbers & operations",
        summary: "Warm-up practice on core number skills.",
        lessons: [
          {
            id: "l1-overview",
            title: "Pathway overview",
            summary: "How this Academy course uses Student Learn and practice tools.",
            required: true,
            estimatedMinutes: 10,
            activityKind: "lesson",
            resource: { kind: "gigalearn_tab", tab: "learn", label: "Open Student Learn" },
          },
          {
            id: "l1-practice",
            title: "Number operations practice",
            summary: "Generate a short practice set in Mathematics.",
            required: true,
            estimatedMinutes: 25,
            activityKind: "practice",
            resource: {
              kind: "curriculum_subject",
              subjectId: "mathematics",
              levelId: "basic-8",
              label: "Mathematics · Basic 8",
            },
          },
        ],
      },
      {
        id: "m2-algebra",
        title: "Introductory algebra",
        summary: "Practice + tutor loop for algebra readiness.",
        lessons: [
          {
            id: "l2-practice",
            title: "Algebra practice set",
            summary: "Use practice-questions with your studio context set to Mathematics.",
            required: true,
            estimatedMinutes: 30,
            activityKind: "quiz",
            resource: {
              kind: "gigalearn_tool",
              toolId: "practice-questions",
              label: "Practice questions tool",
            },
          },
          {
            id: "l2-tutor",
            title: "Ask the AI tutor about a weak topic",
            summary: "Resume with Adaptive Tutor — does not replace gigaLearnProgress rows.",
            required: false,
            estimatedMinutes: 20,
            activityKind: "tutor",
            resource: { kind: "gigalearn_tab", tab: "tutor", label: "Open AI Tutor" },
          },
        ],
      },
      {
        id: "m3-revision",
        title: "Revision & mock readiness",
        summary: "Use Revision Center on topics you have already practised.",
        lessons: [
          {
            id: "l3-revision",
            title: "Revision Center pass",
            summary: "Review weak topics already recorded in your learning path.",
            required: true,
            estimatedMinutes: 25,
            activityKind: "revision",
            resource: { kind: "gigalearn_tab", tab: "revision", label: "Open Revision" },
          },
        ],
      },
    ],
  },
  {
    slug: "wassce-english-writing",
    title: "WASSCE English Writing Skills",
    description:
      "Organise essay, comprehension, and language practice for SHS English using GigaLearn tools and study plans.",
    subject: "English Language",
    category: "Exam prep",
    difficulty: "intermediate",
    durationMinutes: 300,
    learningObjectives: [
      "Plan essay responses with clear structure",
      "Practise comprehension and summary skills",
      "Build a revision loop before mock exams",
    ],
    prerequisites: ["SHS English (Basic 10–12)", "Signed-in Giga3 account"],
    curriculumPreview: "Supports Ghana SHS English Language pathways (gh-shs).",
    assessmentDescription:
      "Practice and exam-prep generators inside GigaLearn. Academy tracks pathway resume separately from topic mastery scores.",
    instructorName: "GigaLearn Faculty",
    access: "free",
    certificateEligible: true,
    completionRequirements:
      "Complete required modules and mark resume checkpoints for each module.",
    source: "catalog",
    status: "published",
    modules: [
      {
        id: "m1-essay",
        title: "Essay foundations",
        summary: "Structure and practice prompts.",
        lessons: [
          {
            id: "l1-plan",
            title: "Study plan for English writing",
            summary: "Create a short study plan in Student tools.",
            required: true,
            estimatedMinutes: 20,
            activityKind: "lesson",
            resource: { kind: "gigalearn_tool", toolId: "study-plan", label: "Study plan tool" },
          },
          {
            id: "l1-practice",
            title: "Writing practice set",
            summary: "Practice questions scoped to English Language.",
            required: true,
            estimatedMinutes: 35,
            activityKind: "practice",
            resource: {
              kind: "curriculum_subject",
              subjectId: "english-language",
              levelId: "basic-11",
              label: "English · Basic 11",
            },
          },
        ],
      },
      {
        id: "m2-exam",
        title: "Exam prep drills",
        summary: "Timed-style exam prep using existing generators.",
        lessons: [
          {
            id: "l2-exam",
            title: "Exam prep session",
            summary: "Run exam-prep for WASSCE English topics.",
            required: true,
            estimatedMinutes: 40,
            activityKind: "quiz",
            resource: { kind: "gigalearn_tool", toolId: "exam-prep", label: "Exam prep tool" },
          },
        ],
      },
    ],
  },
  {
    slug: "kg2-ghana-discover",
    title: "KG2 Discover: Ghana Stories & Pictures",
    description:
      "Guided early-years pathway through GigaLearn Discover media (stories, pictures, culture) — references existing media packs.",
    subject: "Integrated studies",
    category: "Early years",
    difficulty: "beginner",
    durationMinutes: 120,
    learningObjectives: [
      "Explore Ghana-themed early years media safely",
      "Pair Discover sessions with Early years activities",
      "Support parent/teacher facilitation at home or school",
    ],
    prerequisites: ["KG 1–2 learners with an adult guide"],
    curriculumPreview: "Early years band (kg-2) within Ghana CCP.",
    assessmentDescription:
      "Light check-ins via Early years activities; no formal certificate in Phase 1.",
    instructorName: "GigaLearn Early Years",
    access: "free",
    certificateEligible: false,
    completionRequirements: "Complete required Discover/Early years lessons in the pathway.",
    source: "catalog",
    status: "published",
    modules: [
      {
        id: "m1-discover",
        title: "Discover media",
        summary: "Use the existing Discover hub media library.",
        lessons: [
          {
            id: "l1-discover",
            title: "Open Discover hub",
            summary: "Browse Ghana KG2 stories and pictures already on GigaLearn.",
            required: true,
            estimatedMinutes: 20,
            activityKind: "resource",
            resource: { kind: "gigalearn_tab", tab: "discover", label: "Open Discover" },
          },
          {
            id: "l1-early",
            title: "Early years activity",
            summary: "Continue in Early years with kg-2 context.",
            required: true,
            estimatedMinutes: 25,
            activityKind: "lesson",
            resource: { kind: "gigalearn_tab", tab: "early-years", label: "Open Early years" },
          },
        ],
      },
    ],
  },
  {
    slug: "teacher-lesson-studio-basics",
    title: "Teacher Studio: Lesson & Quiz Basics",
    description:
      "For educators — pathway through Teacher Studio generators (lessons, quizzes, worksheets) using existing credit-backed tools.",
    subject: "Teaching",
    category: "Teacher practice",
    difficulty: "beginner",
    durationMinutes: 90,
    learningObjectives: [
      "Generate a lesson outline with curriculum context",
      "Create a short quiz for classroom use",
      "Save and reuse outputs responsibly with credits",
    ],
    prerequisites: ["Teacher or educator role", "Credits available for generation tools"],
    curriculumPreview: "Works with any Ghana CCP/SHS subject selected in Studio context.",
    assessmentDescription: "Authoring checkpoints only — no student grading changes.",
    instructorName: "GigaLearn Faculty",
    access: "credits",
    creditCost: 2,
    certificateEligible: false,
    completionRequirements: "Complete required Teacher Studio lessons in the pathway.",
    source: "catalog",
    status: "published",
    modules: [
      {
        id: "m1-lesson",
        title: "Lesson generation",
        summary: "Use lesson-generator / lesson-notes in Teacher hub.",
        lessons: [
          {
            id: "l1-teacher",
            title: "Open Teacher Studio",
            summary: "Set curriculum context, then generate a lesson.",
            required: true,
            estimatedMinutes: 30,
            activityKind: "lesson",
            resource: { kind: "gigalearn_tab", tab: "teacher", label: "Open Teacher hub" },
          },
          {
            id: "l1-quiz",
            title: "Quiz generator practice",
            summary: "Create a short quiz with the existing quiz-generator tool.",
            required: true,
            estimatedMinutes: 25,
            activityKind: "quiz",
            resource: {
              kind: "gigalearn_tool",
              toolId: "quiz-generator",
              label: "Quiz generator",
            },
          },
        ],
      },
    ],
  },
];

export function listBuiltinAcademyCourses(): AcademyCourse[] {
  return BUILTIN_COURSES.filter((c) => c.status === "published");
}

export function getBuiltinAcademyCourse(slug: string): AcademyCourse | undefined {
  const normalized = slug.trim().toLowerCase();
  return BUILTIN_COURSES.find((c) => c.slug === normalized);
}

export function toAcademyListItem(course: AcademyCourse): AcademyCourseListItem {
  const lessonCount = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  return {
    slug: course.slug,
    title: course.title,
    description: course.description,
    subject: course.subject,
    category: course.category,
    difficulty: course.difficulty,
    durationMinutes: course.durationMinutes,
    access: course.access,
    creditCost: course.creditCost,
    certificateEligible: course.certificateEligible,
    instructorName: course.instructorName,
    moduleCount: course.modules.length,
    lessonCount,
    source: course.source,
  };
}

export function filterAcademyCourses(
  courses: AcademyCourseListItem[],
  opts: {
    query?: string;
    subject?: string;
    category?: string;
    difficulty?: string;
  }
): AcademyCourseListItem[] {
  const q = opts.query?.trim().toLowerCase() ?? "";
  return courses.filter((c) => {
    if (opts.subject && opts.subject !== "all" && c.subject !== opts.subject) return false;
    if (opts.category && opts.category !== "all" && c.category !== opts.category) return false;
    if (opts.difficulty && opts.difficulty !== "all" && c.difficulty !== opts.difficulty)
      return false;
    if (!q) return true;
    const hay = `${c.title} ${c.description} ${c.subject} ${c.category}`.toLowerCase();
    return hay.includes(q);
  });
}

export function countPathwayLessons(course: AcademyCourse): {
  total: number;
  required: number;
} {
  let total = 0;
  let required = 0;
  for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      total += 1;
      if (lesson.required) required += 1;
    }
  }
  return { total, required };
}

export function resolveResumeLesson(
  course: AcademyCourse,
  lastModuleId?: string,
  lastLessonId?: string
): { moduleId: string; lessonId: string } | null {
  if (lastModuleId && lastLessonId) {
    const mod = course.modules.find((m) => m.id === lastModuleId);
    const lesson = mod?.lessons.find((l) => l.id === lastLessonId);
    if (mod && lesson) return { moduleId: mod.id, lessonId: lesson.id };
  }
  const first = course.modules[0]?.lessons[0];
  if (!first || !course.modules[0]) return null;
  return { moduleId: course.modules[0].id, lessonId: first.id };
}
