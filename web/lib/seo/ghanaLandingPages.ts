import type { Metadata } from "next";
import type { FaqItem } from "@/components/seo/JsonLd";
import { FREE_STARTER_CREDITS } from "@/lib/payments/subscriptionCatalog";
import { publicMetadata } from "@/lib/seo/publicMetadata";

export type GhanaLandingSection = {
  heading: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
};

export type GhanaLandingConfig = {
  path: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  lead: string;
  intro: readonly string[];
  sections: readonly GhanaLandingSection[];
  faq: readonly FaqItem[];
  breadcrumbLabel: string;
  relatedReading: readonly { href: string; label: string }[];
  primaryCta: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
};

export function ghanaLandingMetadata(config: GhanaLandingConfig): Metadata {
  return publicMetadata({
    path: config.path,
    title: config.metaTitle,
    description: config.metaDescription,
  });
}

/** Canonical Ghana/Africa SEO landing pages — static content only. */
export const GHANA_LANDING_PAGES = {
  teachers: {
    path: "/ai-for-teachers-ghana",
    metaTitle: "AI for Teachers in Ghana | Giga3 AI",
    metaDescription:
      "How Ghanaian teachers use Giga3 AI and GigaLearn for lesson planning, quizzes, worksheets, and classroom productivity — with GHS pricing via Paystack.",
    h1: "AI for Teachers in Ghana",
    lead:
      "Practical AI support for Ghanaian teachers — lesson ideas, quiz drafts, worksheet outlines, and classroom productivity inside Giga3 AI.",
    intro: [
      "Teachers in Ghana balance large classes, limited prep time, and diverse learner needs. Giga3 AI helps you draft materials faster while you stay in control of accuracy, tone, and what goes to students.",
      "GigaLearn adds structured study modes for JHS and SHS contexts. Organisation workspaces at /workspace let schools onboard teachers and students when your institution is ready.",
    ],
    sections: [
      {
        heading: "Lesson planning and classroom materials",
        paragraphs: [
          "Use Giga3 chat to outline lesson plans, simplify explanations, or generate discussion prompts. Export drafts to your own documents — Giga3 does not replace your professional judgment or official curriculum documents.",
        ],
        bullets: [
          "Draft lesson outlines and learning objectives",
          "Generate practice questions you can review before class",
          "Summarise long readings for teacher prep (not as a substitute for source texts)",
        ],
      },
      {
        heading: "GigaLearn for structured study support",
        paragraphs: [
          "GigaLearn connects tutoring personas, practice questions, and progress tracking to the same Giga3 account. It is designed for BECE and WASSCE revision support — not as an official WAEC or GES product.",
        ],
        bullets: [
          "Homework help and revision prompts for JHS and SHS",
          "Practice modes with server-side progress when signed in",
          "Hand-off from chat when students pick a tutor persona",
        ],
      },
    ],
    faq: [
      {
        question: "Is Giga3 AI an official GES or WAEC product?",
        answer:
          "No. Giga3 AI is an independent platform from Ghana. It can support teaching and learning workflows, but it is not affiliated with GES, WAEC, or any government examination body unless explicitly stated in a verified partnership announcement.",
      },
      {
        question: "Can teachers try Giga3 AI for free?",
        answer: `Yes. New accounts receive ${FREE_STARTER_CREDITS} starter credits to explore chat and GigaLearn before choosing a paid plan billed in GHS through Paystack.`,
      },
    ],
    breadcrumbLabel: "AI for teachers in Ghana",
    relatedReading: [
      { href: "/ai-for-schools-ghana", label: "AI for schools in Ghana" },
      { href: "/ai-for-bece-wassce-ghana", label: "AI for BECE & WASSCE preparation" },
      { href: "/gigalearn", label: "GigaLearn — AI tutor" },
    ],
    primaryCta: { href: "/gigalearn", label: "Open GigaLearn" },
    secondaryCta: { href: "/chat/login", label: "Sign in to chat" },
  },
  schools: {
    path: "/ai-for-schools-ghana",
    metaTitle: "AI for Schools in Ghana | Giga3 AI",
    metaDescription:
      "How schools in Ghana use Giga3 AI workspaces for classrooms, roles, and responsible AI learning — contact sales for volume onboarding.",
    h1: "AI for Schools in Ghana",
    lead:
      "Organisation workspaces, classrooms, and role-based access for schools exploring responsible AI — built on the same Giga3 chat and GigaLearn tools.",
    intro: [
      "Schools need more than a consumer chat login: they need structure, visibility, and clear roles for teachers, students, and administrators.",
      "Signed-in users can create organisation workspaces at /workspace with classrooms, assignments, and usage dashboards. Volume billing and custom credit pools are arranged via sales — not self-serve checkout.",
    ],
    sections: [
      {
        heading: "Workspaces and classrooms",
        paragraphs: [
          "Giga3 Enterprise & Education surfaces describe what is live today: org creation, member invites, teacher/student/parent roles, classrooms, and assignment flows.",
        ],
        bullets: [
          "Organisation dashboards with aggregated usage metrics",
          "Classroom and assignment flows for teachers and students",
          "Same server-side entitlements as consumer Giga3 accounts",
        ],
      },
      {
        heading: "Responsible AI in schools",
        paragraphs: [
          "AI should support learning — not replace teachers or bypass academic integrity policies. Giga3 publishes acceptable-use and AI usage policies schools can reference in their own guidelines.",
        ],
        bullets: [
          "Transparent AI limitations on public legal pages",
          "Teacher-reviewed materials before sharing with class",
          "No false claims of government accreditation",
        ],
      },
    ],
    faq: [
      {
        question: "Can our school get a custom contract?",
        answer:
          "Yes. Contact sales through the Enterprise page or site contact form for volume pricing, onboarding, and invoice billing. Consumer Paystack plans remain available for individual teachers and students.",
      },
      {
        question: "Does Giga3 replace our LMS?",
        answer:
          "No. Giga3 workspaces add AI chat, GigaLearn, and creator tools with org structure. Schools typically use it alongside existing LMS or classroom processes rather than as a full LMS replacement.",
      },
    ],
    breadcrumbLabel: "AI for schools in Ghana",
    relatedReading: [
      { href: "/enterprise", label: "Enterprise & Education" },
      { href: "/ai-for-teachers-ghana", label: "AI for teachers in Ghana" },
      { href: "/workspace", label: "Open workspace (sign in required)" },
    ],
    primaryCta: { href: "/enterprise", label: "Enterprise & Education" },
    secondaryCta: { href: "/contact", label: "Contact sales" },
  },
  beceWassce: {
    path: "/ai-for-bece-wassce-ghana",
    metaTitle: "AI for BECE & WASSCE Preparation in Ghana | Giga3 AI",
    metaDescription:
      "BECE and WASSCE revision support with GigaLearn on Giga3 AI — practice questions, study plans, and AI tutoring for JHS and SHS students in Ghana.",
    h1: "AI for BECE & WASSCE Preparation in Ghana",
    lead:
      "Structured revision support for JHS and SHS students preparing for BECE and WASSCE — through GigaLearn on Giga3 AI.",
    intro: [
      "Exam preparation needs consistent practice, clear explanations, and study plans students can follow between classes.",
      "GigaLearn provides AI tutoring, practice questions, and progress tracking for Ghana-focused study contexts. It supports revision — it is not an official WAEC paper bank or guaranteed pass product.",
    ],
    sections: [
      {
        heading: "BECE preparation (JHS)",
        paragraphs: [
          "Students can use GigaLearn and chat modes to revise core subjects, clarify concepts, and generate practice prompts they verify with teachers or textbooks.",
        ],
        bullets: [
          "English, Mathematics, Integrated Science, and Social Studies revision support",
          "Study plans and practice modes when signed in",
          "Persona hand-off from chat for focused tutoring tone",
        ],
      },
      {
        heading: "WASSCE preparation (SHS)",
        paragraphs: [
          "SHS students can explore core and elective topics with AI explanations, then cross-check answers against syllabus materials and classroom notes.",
        ],
        bullets: [
          "Core Mathematics, English, Integrated Science, Social Studies",
          "Elective subject prompts where students supply syllabus context",
          "Progress saved to your Giga3 account on the server",
        ],
      },
    ],
    faq: [
      {
        question: "Does Giga3 AI guarantee exam passes?",
        answer:
          "No. Giga3 AI is a study aid. Results depend on each student's effort, school preparation, and the official examination. Always verify AI-generated content with teachers and syllabus materials.",
      },
      {
        question: "Where should students start?",
        answer: `Create a free Giga3 account (${FREE_STARTER_CREDITS} starter credits), open GigaLearn, and pick a study mode that matches your level. Paid plans add monthly credits billed in GHS via Paystack.`,
      },
    ],
    breadcrumbLabel: "AI for BECE & WASSCE",
    relatedReading: [
      { href: "/gigalearn", label: "GigaLearn product page" },
      { href: "/ai-tools-for-students-ghana", label: "AI tools for students in Ghana" },
      { href: "/blog/category/bece-wassce", label: "BECE & WASSCE blog articles" },
    ],
    primaryCta: { href: "/gigalearn", label: "Start with GigaLearn" },
    secondaryCta: { href: "/chat/login", label: "Sign in free" },
  },
  business: {
    path: "/ai-for-business-ghana",
    metaTitle: "AI Tools for Ghanaian Businesses | Giga3 AI",
    metaDescription:
      "AI chat, research, writing, and automation for Ghanaian businesses — GHS billing via Paystack, workspaces for teams, and creator tools on Giga3 AI.",
    h1: "AI Tools for Ghanaian Businesses",
    lead:
      "Research, writing, coding assistance, and workflow automation for Ghanaian teams — with GHS pricing and Paystack billing on Giga3 AI.",
    intro: [
      "Businesses in Ghana use AI for customer communication drafts, research summaries, internal documentation, marketing copy, and developer productivity.",
      "Giga3 AI keeps billing, credits, and entitlements on the server. Teams can explore organisation workspaces; volume plans go through Enterprise sales.",
    ],
    sections: [
      {
        heading: "Everyday business workflows",
        paragraphs: [
          "Fast and Smart chat modes handle email drafts, meeting notes, research summaries, and spreadsheet explanations. Vision mode supports document and image inputs where your plan allows.",
        ],
        bullets: [
          "Research and writing assistance with cited web search where enabled",
          "Coding help for internal tools and scripts",
          "Media Studio for marketing visuals and Video AI for short clips",
        ],
      },
      {
        heading: "Teams and automation",
        paragraphs: [
          "Automation surfaces workflow agents and platform search for signed-in users. Enterprise workspaces add roles and classrooms when organisations onboard through sales.",
        ],
        bullets: [
          "/automation for workflow exploration (sign in required)",
          "/enterprise for schools, NGOs, and business teams",
          "Developer API for read-only GigaSocial integrations (Premium API keys)",
        ],
      },
    ],
    faq: [
      {
        question: "Can businesses pay in Ghana cedis?",
        answer:
          "Yes. Consumer and team starter plans bill through Paystack in GHS. Enterprise volume pricing and invoicing are arranged via contact sales.",
      },
      {
        question: "Is business data private?",
        answer:
          "Giga3 uses server-side authentication and authorization. Do not share confidential data in prompts unless your organisation's policy allows it. Review the Privacy Policy and Security pages for details.",
      },
    ],
    breadcrumbLabel: "AI for business in Ghana",
    relatedReading: [
      { href: "/enterprise", label: "Enterprise & Education" },
      { href: "/automation", label: "Automation workflows" },
      { href: "/ai-for-ghana", label: "AI for Ghana overview" },
    ],
    primaryCta: { href: "/chat/login", label: "Start with chat" },
    secondaryCta: { href: "/pricing", label: "View GHS pricing" },
  },
  creators: {
    path: "/ai-for-creators-ghana",
    metaTitle: "AI for Creators in Ghana | Giga3 AI",
    metaDescription:
      "Create, edit, and publish with Giga3 AI — Media Studio, Video AI, GigaEdit, and GigaSocial for Ghanaian creators with GHS marketplace payments.",
    h1: "AI for Creators in Ghana",
    lead:
      "From AI images and video to editing and community publishing — one creator workflow on Giga3 AI for Ghanaian creators.",
    intro: [
      "Creators in Ghana need tools that work on mobile networks, bill in cedis, and connect generation → edit → publish without juggling five separate apps.",
      "Giga3 links Media Studio, Video AI, GigaEdit, GigaSocial, and Marketplace under one account with server-checked credits.",
    ],
    sections: [
      {
        heading: "Create → Edit → Publish",
        paragraphs: [
          "Generate visuals in Media Studio or clips in Video AI, polish in GigaEdit, then publish to GigaSocial. Creator Studio helps draft captions and scripts before you post.",
        ],
        bullets: [
          "Media Studio — AI image generation and edit-with-source",
          "GigaEdit — trim, caption, and join on device",
          "GigaSocial — community feed, profiles, and publishing",
        ],
      },
      {
        heading: "Earn in GHS",
        paragraphs: [
          "Marketplace lets verified creators sell digital products with Paystack checkout in Ghana cedis. Tips and boosts on GigaSocial follow the live product rules on each surface.",
        ],
        bullets: [
          "Marketplace listings with secure file delivery after payment",
          "Creator Academy series priced separately from chat subscriptions",
          "No fabricated earnings claims — results vary by creator effort",
        ],
      },
    ],
    faq: [
      {
        question: "Do creators need separate apps?",
        answer:
          "No. Giga3 is a progressive web app. Install from /install and move between Media Studio, GigaEdit, and GigaSocial with one sign-in.",
      },
      {
        question: "Can I edit video on my phone?",
        answer:
          "Yes. GigaEdit runs in the browser with on-device editing features. Heavy exports may take longer on low-end devices — export errors surface recoverable messages rather than fake success.",
      },
    ],
    breadcrumbLabel: "AI for creators in Ghana",
    relatedReading: [
      { href: "/gigaedits", label: "GigaEdits — creator editing" },
      { href: "/media", label: "Media Studio" },
      { href: "/gigasocial", label: "GigaSocial community" },
    ],
    primaryCta: { href: "/media", label: "Open Media Studio" },
    secondaryCta: { href: "/gigaedit", label: "Open GigaEdit" },
  },
  africanAiTools: {
    path: "/african-ai-tools",
    metaTitle: "African AI Tools — Giga3 AI Platform",
    metaDescription:
      "Giga3 AI is an Africa-focused AI super app for chat, learning, media, and creator tools — built in Ghana with GHS billing and multi-provider failover.",
    h1: "African AI Tools on Giga3 AI",
    lead:
      "An Africa-focused AI platform for chat, education, media, and creator workflows — built in Ghana, billed in GHS, designed for learners and builders across the continent.",
    intro: [
      "Many global AI tools assume USD billing, desktop-first UX, and single-provider reliability. Giga3 AI is built with African users in mind: Paystack in Ghana cedis, PWA install on mobile, and server-side provider failover.",
      "This page describes what Giga3 offers today — not a ranking of every AI product on the continent.",
    ],
    sections: [
      {
        heading: "What makes Giga3 different for African users",
        paragraphs: [
          "Giga3 combines chat, GigaLearn, Media Studio, Video AI, GigaEdit, GigaSocial, and Marketplace in one account. Credits and subscriptions are enforced on the server — not in the browser.",
        ],
        bullets: [
          "GHS pricing via Paystack for consumer plans",
          "Progressive Web App install for low-bandwidth repeat visits",
          "Ghana-focused educational content cluster (BECE, WASSCE, teachers, schools)",
        ],
      },
      {
        heading: "Explore by audience",
        paragraphs: [
          "Pick the path that matches your goal. Each linked page describes real product capabilities — no fabricated partnerships or rankings.",
        ],
        bullets: [
          "Students — /ai-tools-for-students-ghana",
          "Teachers — /ai-for-teachers-ghana",
          "Businesses — /ai-for-business-ghana",
          "Creators — /ai-for-creators-ghana",
        ],
      },
    ],
    faq: [
      {
        question: "Is Giga3 AI only for Ghana?",
        answer:
          "Giga3 is built in Ghana and optimises for Ghanaian billing and education context, but the platform is available to users worldwide. Feature availability still depends on your plan and server-side entitlements.",
      },
      {
        question: "Which AI models does Giga3 use?",
        answer:
          "Giga3 routes requests server-side through configured providers such as OpenAI, Google Gemini, and OpenRouter, with media from fal.ai, Replicate, and Google AI Studio backup. Your browser never holds provider API keys.",
      },
    ],
    breadcrumbLabel: "African AI tools",
    relatedReading: [
      { href: "/ai-for-ghana", label: "AI for Ghana" },
      { href: "/features", label: "All Giga3 AI features" },
      { href: "/about", label: "About Giga3 AI" },
    ],
    primaryCta: { href: "/chat/login", label: "Try Giga3 free" },
    secondaryCta: { href: "/features", label: "Explore features" },
  },
} as const satisfies Record<string, GhanaLandingConfig>;

export const GHANA_LANDING_PATHS = Object.values(GHANA_LANDING_PAGES).map((p) => p.path);
