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
  "Technology",
] as const;

export const ACADEMY_SUBJECTS = [
  "Mathematics",
  "English Language",
  "Science",
  "Integrated studies",
  "Teaching",
  "Artificial Intelligence",
  "Web & PWA",
  "Mobile Development",
  "Robotics",
  "Digital Technologies",
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
    certificateEligible: true,
    completionRequirements:
      "Complete required lessons, pass module quizzes and the protected final (server-graded Academy assessments). Tutoring alone does not complete the course.",
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
    certificateEligible: true,
    completionRequirements:
      "Complete required Teacher Studio lessons, pass the reflection assessment, and receive instructor approval before a certificate is issued.",
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
  {
    slug: "ai-machine-learning",
    title: "Artificial Intelligence and Machine Learning",
    description:
      "Practical AI fundamentals — prompts, generative AI, agents, evaluation, privacy, and responsible use. Interactive objective practice when the AI question bank is imported.",
    subject: "Artificial Intelligence",
    category: "Technology",
    difficulty: "beginner",
    durationMinutes: 480,
    learningObjectives: [
      "Explain core AI and machine-learning ideas in plain language",
      "Write clearer prompts and evaluate AI outputs critically",
      "Recognise privacy, security, and ethics risks in AI workflows",
      "Plan simple AI-assisted automation without inventing unsafe claims",
    ],
    prerequisites: ["Basic computer literacy", "Signed-in Giga3 account"],
    curriculumPreview:
      "Technology Learning Hub · awaiting AI_500_Practical_Objective_Questions.pdf import.",
    assessmentDescription:
      "Interactive MCQ practice (learn, timed, topic, revision). Answer keys are server-graded; unverified items stay flagged for review.",
    instructorName: "GigaLearn Technology Faculty",
    access: "free",
    certificateEligible: true,
    completionRequirements:
      "Enrol, complete Technology Hub practice sessions, and pass module checkpoints when the bank is available.",
    source: "catalog",
    status: "published",
    modules: [
      {
        id: "m-ai-fundamentals",
        title: "AI fundamentals & prompting",
        summary: "Core concepts and practical prompt practice.",
        lessons: [
          {
            id: "l-ai-overview",
            title: "Course overview",
            summary: "How this pathway uses the Technology Learning Hub.",
            required: true,
            estimatedMinutes: 15,
            activityKind: "lesson",
            resource: {
              kind: "external",
              href: "/gigalearn/academy/tech/?course=ai-machine-learning",
              label: "Open Technology Hub",
            },
          },
          {
            id: "l-ai-practice",
            title: "AI practice bank",
            summary: "Starts when the AI question bank PDF is imported and validated.",
            required: true,
            estimatedMinutes: 60,
            activityKind: "practice",
            resource: {
              kind: "external",
              href: "/gigalearn/academy/tech/?course=ai-machine-learning&mode=learn",
              label: "Learn mode (when available)",
            },
          },
        ],
      },
    ],
  },
  {
    slug: "website-pwa-development",
    title: "Website Development and Progressive Web Apps",
    description:
      "Responsive design, PWAs, service workers, offline, security, accessibility, and deployment — scenario-based objective practice from the Website/PWA bank.",
    subject: "Web & PWA",
    category: "Technology",
    difficulty: "intermediate",
    durationMinutes: 600,
    learningObjectives: [
      "Choose practical fixes for responsive and PWA reliability issues",
      "Reason about caching, offline, and update UX safely",
      "Apply web security, accessibility, and SEO basics",
      "Troubleshoot common website/PWA failures with clear next steps",
    ],
    prerequisites: ["Familiarity with HTML/CSS or web basics", "Signed-in Giga3 account"],
    curriculumPreview:
      "Technology Learning Hub · Website_PWA_500 bank (unique approved items after dedupe).",
    assessmentDescription:
      "Learn, practice test, timed, topic, random, revision, and practical challenge modes. Server-side scoring.",
    instructorName: "GigaLearn Technology Faculty",
    access: "free",
    certificateEligible: true,
    completionRequirements:
      "Enrol and complete Technology Hub sessions covering core PWA topics; pass practice checkpoints.",
    source: "catalog",
    status: "published",
    modules: [
      {
        id: "m-web-foundations",
        title: "Responsive web & PWA foundations",
        summary: "Layout, installability, service workers, and offline behaviour.",
        lessons: [
          {
            id: "l-web-hub",
            title: "Open Technology Hub",
            summary: "Browse topics and start interactive practice.",
            required: true,
            estimatedMinutes: 20,
            activityKind: "lesson",
            resource: {
              kind: "external",
              href: "/gigalearn/academy/tech/?course=website-pwa-development",
              label: "Website & PWA practice",
            },
          },
          {
            id: "l-web-learn",
            title: "Learn mode (10 questions)",
            summary: "One question at a time with explanations after submit.",
            required: true,
            estimatedMinutes: 40,
            activityKind: "practice",
            resource: {
              kind: "external",
              href: "/gigalearn/academy/tech/?course=website-pwa-development&mode=learn",
              label: "Start learn mode",
            },
          },
          {
            id: "l-web-timed",
            title: "Timed assessment",
            summary: "Server-authoritative timer — client clock cannot alter results.",
            required: true,
            estimatedMinutes: 45,
            activityKind: "quiz",
            resource: {
              kind: "external",
              href: "/gigalearn/academy/tech/?course=website-pwa-development&mode=timed",
              label: "Timed assessment",
            },
          },
        ],
      },
      {
        id: "m-web-projects",
        title: "Practical web projects",
        summary: "Apply ideas with safe, written activities (no production experiments).",
        lessons: [
          {
            id: "l-web-project",
            title: "Manifest & offline checklist",
            summary: "Inspect a sample manifest and plan offline tests in a sandbox.",
            required: false,
            estimatedMinutes: 35,
            activityKind: "resource",
            resource: {
              kind: "external",
              href: "/gigalearn/academy/tech/?course=website-pwa-development&mode=challenge",
              label: "Practical challenge mode",
            },
          },
        ],
      },
    ],
  },
  {
    slug: "mobile-app-development",
    title: "Mobile App Development",
    description:
      "Mobile architecture, UI, APIs, auth, offline sync, push, security, and release practice. Interactive bank loads after the Mobile App PDF is imported.",
    subject: "Mobile Development",
    category: "Technology",
    difficulty: "intermediate",
    durationMinutes: 540,
    learningObjectives: [
      "Describe mobile app architecture and secure API integration",
      "Plan offline storage, sync, and push notification flows",
      "Spot common mobile security and performance issues",
      "Outline testing, payments, and release checklist steps",
    ],
    prerequisites: ["Basic programming or app-use familiarity", "Signed-in Giga3 account"],
    curriculumPreview:
      "Technology Learning Hub · awaiting Mobile_App_500_Practical_Objective_Questions.pdf import.",
    assessmentDescription:
      "Interactive MCQ practice when the mobile bank is available; server-graded results only.",
    instructorName: "GigaLearn Technology Faculty",
    access: "free",
    certificateEligible: true,
    completionRequirements:
      "Enrol and complete Technology Hub practice once the mobile bank is imported.",
    source: "catalog",
    status: "published",
    modules: [
      {
        id: "m-mobile-core",
        title: "Mobile foundations",
        summary: "Architecture, UI, and API practice pathway.",
        lessons: [
          {
            id: "l-mobile-hub",
            title: "Technology Hub",
            summary: "Opens the mobile course practice surface.",
            required: true,
            estimatedMinutes: 15,
            activityKind: "lesson",
            resource: {
              kind: "external",
              href: "/gigalearn/academy/tech/?course=mobile-app-development",
              label: "Open mobile hub",
            },
          },
        ],
      },
    ],
  },
  {
    slug: "robotics-intelligent-systems",
    title: "Robotics and Intelligent Systems",
    description:
      "Sensors, actuators, microcontrollers, navigation, safety, and troubleshooting — scenario MCQs. Never run hazardous robot experiments outside a supervised lab.",
    subject: "Robotics",
    category: "Technology",
    difficulty: "intermediate",
    durationMinutes: 600,
    learningObjectives: [
      "Choose safe sensing and control steps for common robot scenarios",
      "Diagnose motor, power, and calibration problems carefully",
      "Apply robotics safety and emergency-stop thinking",
      "Plan testing without claiming a hardware simulator that is not present",
    ],
    prerequisites: ["STEM curiosity; no lab hardware required for MCQ practice"],
    curriculumPreview:
      "Technology Learning Hub · Robotics_500 bank (unique approved items after dedupe).",
    assessmentDescription:
      "Interactive practice with safety-first explanations. No hardware simulation is claimed.",
    instructorName: "GigaLearn Technology Faculty",
    access: "free",
    certificateEligible: true,
    completionRequirements:
      "Enrol and complete Technology Hub sessions on sensors, control, and safety topics.",
    source: "catalog",
    status: "published",
    modules: [
      {
        id: "m-robot-core",
        title: "Sensors, control & safety",
        summary: "Practical decision-making for intelligent systems.",
        lessons: [
          {
            id: "l-robot-hub",
            title: "Open Technology Hub",
            summary: "Topic practice and timed assessments.",
            required: true,
            estimatedMinutes: 20,
            activityKind: "lesson",
            resource: {
              kind: "external",
              href: "/gigalearn/academy/tech/?course=robotics-intelligent-systems",
              label: "Robotics practice",
            },
          },
          {
            id: "l-robot-learn",
            title: "Learn mode",
            summary: "Submit answers before seeing explanations.",
            required: true,
            estimatedMinutes: 40,
            activityKind: "practice",
            resource: {
              kind: "external",
              href: "/gigalearn/academy/tech/?course=robotics-intelligent-systems&mode=learn",
              label: "Start learn mode",
            },
          },
          {
            id: "l-robot-challenge",
            title: "Practical challenge scenarios",
            summary: "Scenario-style items with reinforcement suggestions (written only).",
            required: false,
            estimatedMinutes: 35,
            activityKind: "quiz",
            resource: {
              kind: "external",
              href: "/gigalearn/academy/tech/?course=robotics-intelligent-systems&mode=challenge",
              label: "Challenge mode",
            },
          },
        ],
      },
    ],
  },
  {
    slug: "other-digital-technologies",
    title: "Other Digital Technologies",
    description:
      "Cybersecurity, cloud, IoT, networking, APIs, data, payments, and digital project practice from the Other Digital Technologies bank.",
    subject: "Digital Technologies",
    category: "Technology",
    difficulty: "beginner",
    durationMinutes: 540,
    learningObjectives: [
      "Recognise phishing and basic security hygiene",
      "Reason about cloud, networking, and API integration trade-offs",
      "Apply backup, privacy, and troubleshooting checklists",
      "Never test security against systems you do not own or have permission to assess",
    ],
    prerequisites: ["Everyday digital literacy", "Signed-in Giga3 account"],
    curriculumPreview:
      "Technology Learning Hub · Other_Digital_Technologies_500 bank (unique approved items).",
    assessmentDescription:
      "Full practice modes with server-side scoring and revision of incorrect items.",
    instructorName: "GigaLearn Technology Faculty",
    access: "free",
    certificateEligible: true,
    completionRequirements:
      "Enrol and complete Technology Hub practice across security and cloud topics.",
    source: "catalog",
    status: "published",
    modules: [
      {
        id: "m-digital-core",
        title: "Security, cloud & integration",
        summary: "Everyday digital technology decisions.",
        lessons: [
          {
            id: "l-digital-hub",
            title: "Open Technology Hub",
            summary: "Browse topics such as phishing, cloud, and APIs.",
            required: true,
            estimatedMinutes: 20,
            activityKind: "lesson",
            resource: {
              kind: "external",
              href: "/gigalearn/academy/tech/?course=other-digital-technologies",
              label: "Digital technologies practice",
            },
          },
          {
            id: "l-digital-topic",
            title: "Topic practice",
            summary: "Target a single topic with a short set.",
            required: true,
            estimatedMinutes: 35,
            activityKind: "practice",
            resource: {
              kind: "external",
              href: "/gigalearn/academy/tech/?course=other-digital-technologies&mode=topic",
              label: "Topic practice",
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
