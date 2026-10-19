import type { PublicProductPageShellProps } from "@/components/seo/PublicProductPageShell";
import { PRODUCT_CATALOG } from "@/lib/seo/productCatalog";

function catalogEntry(href: string) {
  const entry = PRODUCT_CATALOG.find((p) => p.href === href || p.href === `${href}/`);
  if (!entry) throw new Error(`Missing product catalog entry for ${href}`);
  return entry;
}

export const AI_STUDIO_PAGE: PublicProductPageShellProps = {
  title: "Giga3 AI Studio — Creative AI workflows",
  description: catalogEntry("/ai-studio").description,
  audience: "creators, students, and businesses exploring AI-powered media",
  whatItDoes:
    "Giga3 AI Studio is the creative umbrella inside Giga3 AI. It routes you to Media Studio for images and Video AI for clips — the same credit-based tools used from chat and Creator Studio.",
  whoFor: [
    "Creators who start with a prompt and need images or short video",
    "Students making visuals for projects and presentations",
    "Teams prototyping marketing assets in Ghana Cedis (GHS)",
  ],
  capabilities: [
    "AI image generation and edit-with-source in Media Studio",
    "Text-to-video workflows in Video AI with tiered credit costs",
    "Hand-offs from chat, Creator Studio, and GigaEdit when you are signed in",
    "Responsible use: verify AI outputs before publishing; credits enforced server-side",
  ],
  giga3Connection:
    "Open Media Studio or Video AI from here, then publish through GigaEdit or GigaSocial. Billing, entitlements, and credits stay on your Giga3 account — nothing runs client-side without server checks.",
  primaryHref: "/media",
  primaryLabel: "Open Media Studio",
  secondaryHref: "/video",
  secondaryLabel: "Open Video AI",
};

export const GIGAEDITS_PAGE: PublicProductPageShellProps = {
  title: "GigaEdits — Creator editing on Giga3",
  description:
    "GigaEdits is the creator editing product on Giga3 AI — trim, caption, and publish video with GigaEdit, then share on GigaSocial.",
  audience: "creators, educators, and social publishers",
  whatItDoes:
    "GigaEdits is the marketing home for creator editing on Giga3. The GigaEdit app at /gigaedit/ is where you trim, join, caption, and publish — after you generate clips in Video AI or Media Studio. Start with the Creator Growth Starter Pack: Hook Reel (9:16), YouTube Intro (16:9), or Promo Poster (4:5) — format starters that seed aspect ratio and title; you import your media and finish with existing Giga3 AI tools.",
  whoFor: [
    "Short-form creators polishing reels and social clips",
    "Educators packaging lesson segments",
    "Marketers combining AI-generated assets before posting",
  ],
  capabilities: [
    "Creator Growth Starter Pack — Hook Reel, YouTube Intro, Promo Poster format starters",
    "Timeline editing, captions, and audio in GigaEdit",
    "Import from Video AI and device uploads",
    "Publish-ready exports for GigaSocial",
  ],
  giga3Connection:
    "Creator Studio helps you draft; Media Studio and Video AI generate assets; GigaEdits (GigaEdit) finishes and publishes to GigaSocial or download. Project drafts save on your device in the browser — not to cloud account backup yet.",
  primaryHref: "/gigaedit",
  primaryLabel: "Open GigaEdit",
  secondaryHref: "/creator-studio",
  secondaryLabel: "Creator Studio",
};

export const MEDIA_PAGE_SHELL: PublicProductPageShellProps = {
  title: "Media Studio — AI image generation on Giga3",
  description: catalogEntry("/media").description,
  audience: "creators, students, and marketers making visuals",
  whatItDoes:
    "Media Studio generates and edits AI images from text prompts. Optional source-image edit mode uses your upload as a starting point. Credits are checked server-side before each job.",
  whoFor: [
    "Chat users who need images inline or in Creator Studio",
    "Social creators making post visuals before GigaEdit or GigaSocial",
    "Students illustrating projects and presentations",
  ],
  capabilities: [
    "Text-to-image generation with provider failover on the backend",
    "Edit-with-source when you pass a reference image URL",
    "Recent generations list and hand-off links to chat and GigaEdit",
  ],
  giga3Connection:
    "Media Studio shares the same Giga3 account, credits, and entitlements as chat. Sign in to generate; results can be saved, downloaded, or opened in GigaEdit and GigaSocial.",
  primaryHref: "/media",
  primaryLabel: "Open Media Studio",
  secondaryHref: "/chat",
  secondaryLabel: "Open chat",
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

export const VIDEO_PAGE_SHELL: PublicProductPageShellProps = {
  title: "Video AI — Generate clips on Giga3",
  description: catalogEntry("/video").description,
  audience: "creators and marketers making short video",
  whatItDoes:
    "Video AI generates short clips from text prompts (and optional first-frame images). Credits are checked server-side before each job; results hand off to GigaEdit for editing.",
  whoFor: [
    "Social creators prototyping reels and ads",
    "Educators illustrating concepts with short clips",
    "Teams exploring AI video before full production",
  ],
  capabilities: [
    "Text-to-video with synced audio (provider failover on the backend)",
    "Separate video-credit wallet for Video AI plans and packs",
    "Export to GigaEdit and GigaSocial publishing flows",
  ],
  giga3Connection:
    "Video AI sits beside Media Studio under the Giga3 AI Studio creative umbrella. Sign in to generate; entitlements and video credits are enforced on the server — balances are not exposed on public pages.",
  primaryHref: "/video",
  primaryLabel: "Open Video AI",
  secondaryHref: "/video/plans",
  secondaryLabel: "Video plans",
};
