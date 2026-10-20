import type { PublicProductPageShellProps } from "@/components/seo/PublicProductPageShell";
import { PRODUCT_CATALOG } from "@/lib/seo/productCatalog";

function catalogEntry(href: string) {
  const entry = PRODUCT_CATALOG.find((p) => p.href === href || p.href === `${href}/`);
  if (!entry) throw new Error(`Missing product catalog entry for ${href}`);
  return entry;
}

/** Retired creative umbrella — CTAs point at retained education-first products. */
export const AI_STUDIO_PAGE: PublicProductPageShellProps = {
  title: "Giga3 AI Studio — retired creative umbrella",
  description:
    "Giga3 AI Studio is no longer a dedicated product. Continue with AI Assistant, GigaLearn Academy, Exam Practice, and GigaSocial.",
  audience: "learners, teachers, and creators using Giga3 AI",
  whatItDoes:
    "The former AI Studio umbrella that pointed at Media Studio and Video AI has been retired. Giga3 AI now prioritises learning and productivity tools under one account.",
  whoFor: [
    "Students and teachers using Academy and Exam Practice",
    "Anyone who needs chat, writing, research, or in-chat images",
    "Creators publishing on GigaSocial",
  ],
  capabilities: [
    "AI Assistant for chat, writing, research, coding, and images",
    "GigaLearn Academy courses, tutoring, and certificates",
    "Exam Practice with server-graded sessions",
    "GigaSocial publishing and Marketplace digital products",
  ],
  giga3Connection:
    "Billing, entitlements, and credits stay on your Giga3 account. Dedicated Media Studio and Video AI entry points are retired; shared image services remain available from the AI Assistant when signed in.",
  primaryHref: "/chat",
  primaryLabel: "Open AI Assistant",
  secondaryHref: "/gigalearn/academy",
  secondaryLabel: "Open Academy",
};

/** Retired GigaEdits marketing shell — CTAs point at GigaSocial and Creator Studio. */
export const GIGAEDITS_PAGE: PublicProductPageShellProps = {
  title: "GigaEdits — retired creator editing product",
  description:
    "GigaEdits is no longer a dedicated Giga3 product. Continue with AI Assistant, Creator Studio, and GigaSocial. Local device drafts are not deleted.",
  audience: "creators, educators, and social publishers",
  whatItDoes:
    "GigaEdits marketing pages are retired. Draft in Creator Studio, get help from the AI Assistant, and publish on GigaSocial. Device-local editor drafts remain on your browser if you already created them.",
  whoFor: [
    "Creators publishing to GigaSocial",
    "Educators packaging learning materials",
    "Writers using Creator Studio and Document Studio",
  ],
  capabilities: [
    "Creator Studio for writing and social drafts",
    "AI Assistant for research and in-chat images",
    "GigaSocial feed and publishing",
    "Marketplace for selling digital learning products",
  ],
  giga3Connection:
    "Project drafts saved in the browser are not deleted. GigaEdits is no longer advertised as a standalone product; education and social tools remain under the same Giga3 account.",
  primaryHref: "/gigasocial",
  primaryLabel: "Open GigaSocial",
  secondaryHref: "/creator-studio",
  secondaryLabel: "Creator Studio",
};

/** Retired Media Studio shell — CTAs point at AI Assistant. */
export const MEDIA_PAGE_SHELL: PublicProductPageShellProps = {
  title: "Media Studio — retired dedicated product",
  description:
    "Media Studio is no longer a dedicated Giga3 product. Generate and edit images in the AI Assistant when signed in.",
  audience: "creators, students, and marketers making visuals",
  whatItDoes:
    "Standalone Media Studio entry points are retired. Image generation and edit-with-source remain available through the signed-in AI Assistant using the same server-checked credits.",
  whoFor: [
    "Chat users who need images inline",
    "Students illustrating projects and presentations",
    "Creators drafting in Creator Studio before GigaSocial",
  ],
  capabilities: [
    "In-chat image help from the AI Assistant",
    "Server-side credit checks before generation jobs",
    "Hand-off deep links preserved for existing chat workflows",
  ],
  giga3Connection:
    "Media Studio is not advertised as a standalone product. Shared image backends, credits, and entitlements remain intact for AI Assistant workflows.",
  primaryHref: "/chat",
  primaryLabel: "Open AI Assistant",
  secondaryHref: "/gigalearn/academy",
  secondaryLabel: "Open Academy",
};

export const GIGALEARN_PAGE_SHELL: PublicProductPageShellProps = {
  title: "How GigaLearn works",
  description:
    "GigaLearn helps you study Ghana curriculum topics, practise exam-style questions, track progress, and learn with an AI tutor — then continue into structured Academy pathways when you want a guided course.",
  audience: "students, teachers, and parents in Ghana and across Africa",
  whatItDoes:
    "Open Student for subjects, lessons, quizzes and exam prep; Teacher for classroom tools; Create for learning materials; Parent for home support; Insight for progress signals; and AI Tutor for guided help. Sign-in is required to save progress and use credits.",
  whoFor: [
    "JHS and SHS students preparing for BECE and WASSCE",
    "Teachers building classroom activities and quizzes",
    "Parents supporting revision at home",
  ],
  capabilities: [
    "Ghana curriculum-aligned study modes and practice questions",
    "Exam preparation workflows for BECE and WASSCE revision",
    "Teacher tools and parent-friendly progress views",
    "Academy courses for structured pathways on top of daily practice",
    "Responsible AI learning — verify answers with teachers and syllabus materials",
  ],
  giga3Connection:
    "GigaLearn uses the same credits and entitlements as Giga3 chat. For exam-focused workflows, see AI for BECE and WASSCE preparation at /ai-for-bece-wassce-ghana/. Organisation workspaces can route students through /workspace when your school is onboarded.",
  primaryHref: "/gigalearn/academy/",
  primaryLabel: "Open GigaLearn Academy",
  secondaryHref: "/ai-for-bece-wassce-ghana",
  secondaryLabel: "BECE & WASSCE guide",
  relatedLinks: [
    {
      href: "/blog/ai-skills-every-ghanaian-student-should-learn-2026/",
      label: "AI skills every Ghanaian student should learn in 2026",
    },
    {
      href: "/blog/how-to-start-learning-coding-in-ghana/",
      label: "How to start learning coding in Ghana",
    },
    {
      href: "/blog/coding-vs-ai-which-skill-beginners-learn-first/",
      label: "Coding vs AI: which skill beginners should learn first",
    },
    {
      href: "/ai-tools-for-students-ghana/",
      label: "AI tools for students in Ghana",
    },
    {
      href: "/ai-for-teachers-ghana/",
      label: "AI for teachers in Ghana",
    },
    {
      href: "/ai-for-schools-ghana/",
      label: "AI for schools in Ghana",
    },
  ],
};

export const ENTERPRISE_PAGE_SHELL: PublicProductPageShellProps = {
  title: "Enterprise & Education — Giga3 workspaces",
  description: catalogEntry("/enterprise").description,
  audience: "schools, universities, NGOs, and business teams",
  whatItDoes:
    "Signed-in users can create organisation workspaces at /workspace with roles (admin, teacher, student, parent), classrooms, assignments, and aggregated usage dashboards. Volume billing and custom credit pools are arranged via sales — not self-serve checkout.",
  whoFor: [
    "Schools rolling out AI study support with classroom structure",
    "NGOs training staff on responsible AI use",
    "Business teams exploring shared org access before a sales conversation",
  ],
  capabilities: [
    "Create org workspaces, invite members, and assign roles",
    "Classrooms, assignments, and submission flows (teacher/student dashboards)",
    "Aggregated org analytics — AI requests, learning sessions, assignment counts",
  ],
  giga3Connection:
    "Workspaces reuse Giga3 chat, GigaLearn, and creator tools under the same server-side entitlements. Individual consumer accounts are unchanged. Contact sales for enterprise billing and onboarding.",
  primaryHref: "/workspace",
  primaryLabel: "Open workspace",
  secondaryHref: "/#contact",
  secondaryLabel: "Contact sales",
};

export const MARKETPLACE_PAGE_SHELL: PublicProductPageShellProps = {
  title: "Digital Products for Learning, Business, and Creativity",
  description:
    "Discover eligible ebooks, educational materials, templates, and business resources from Giga3 creators. Buy in Ghana cedis with Paystack, or list your own digital products after account review.",
  audience: "learners, creators, and buyers in Ghana and beyond",
  whatItDoes:
    "Search the catalogue, open a listing, pay with Paystack, then download from My purchases once payment is verified. Sellers list products through Start Selling — uploads are moderated before they appear publicly.",
  whoFor: [
    "Students buying study guides and templates",
    "Creators selling digital products alongside GigaSocial",
    "Teams sourcing vetted educational resources",
  ],
  capabilities: [
    "How to purchase: browse → checkout with Paystack → download from My purchases",
    "How to sell: open Start Selling, submit product details, wait for moderation",
    "Payment security: Paystack only; files unlock after verified payment",
    "Verified creator badges when a seller has completed verification",
  ],
  giga3Connection:
    "Marketplace complements GigaLearn and Creator Studio — sell what you create on Giga3. Purchases do not replace chat subscription credits; each product lists its own GHS price. Terms: /legal/terms and /legal/refunds.",
  primaryHref: "/marketplace/#marketplace-catalogue",
  primaryLabel: "Browse products",
  secondaryHref: "/marketplace/sell",
  secondaryLabel: "Start selling",
};

/** Retired Video AI shell — CTAs point at AI Assistant and GigaSocial. */
export const VIDEO_PAGE_SHELL: PublicProductPageShellProps = {
  title: "Video AI — retired dedicated product",
  description:
    "Standalone Video AI is no longer a dedicated Giga3 product. Continue with AI Assistant and GigaSocial.",
  audience: "creators and educators making short video",
  whatItDoes:
    "Dedicated Video AI entry points are retired with Media Studio. Ask the AI Assistant for guidance, or publish your own media on GigaSocial. Server video credit tables remain intact; no production data was deleted.",
  whoFor: [
    "Creators publishing on GigaSocial",
    "Educators packaging lesson segments",
    "Teams exploring AI tools under one Giga3 account",
  ],
  capabilities: [
    "AI Assistant for creative guidance",
    "GigaSocial for publishing community media",
    "Marketplace for selling digital learning products",
  ],
  giga3Connection:
    "Video AI is not advertised as a standalone product. Shared backends and credit ledgers are preserved; entitlements continue to be enforced server-side.",
  primaryHref: "/chat",
  primaryLabel: "Open AI Assistant",
  secondaryHref: "/gigasocial",
  secondaryLabel: "Open GigaSocial",
};
