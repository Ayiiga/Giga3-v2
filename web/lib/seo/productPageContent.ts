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
    "GigaEdits covers the edit step in the Giga3 creator workflow. The GigaEdit app handles trimming, joining, captions, and publishing — after you generate clips in Video AI or Media Studio.",
  whoFor: [
    "Short-form creators polishing reels and social clips",
    "Educators packaging lesson segments",
    "Marketers combining AI-generated assets before posting",
  ],
  capabilities: [
    "Timeline editing, captions, and audio in GigaEdit",
    "Import from Video AI and device uploads",
    "Publish-ready exports for GigaSocial",
  ],
  giga3Connection:
    "Creator Studio helps you draft; Media Studio and Video AI generate assets; GigaEdits (GigaEdit) finishes and publishes to GigaSocial or download. Sign in to save projects to your account.",
  primaryHref: "/gigaedit",
  primaryLabel: "Open GigaEdit",
  secondaryHref: "/creator-studio",
  secondaryLabel: "Creator Studio",
};

export const ENTERPRISE_PAGE_SHELL: PublicProductPageShellProps = {
  title: "Enterprise & Education — Giga3 workspaces",
  description: catalogEntry("/enterprise").description,
  audience: "schools, universities, NGOs, and business teams",
  whatItDoes:
    "Enterprise & Education workspaces give organisations role-based access to Giga3 AI Chat, GigaLearn, and creator tools — with admin visibility and classroom-friendly flows.",
  whoFor: [
    "Schools and universities rolling out AI study support",
    "NGOs training staff on responsible AI use",
    "Business teams needing shared access without exposing API keys",
  ],
  capabilities: [
    "Organisation workspaces with role-based access",
    "Classroom and educator flows via GigaLearn",
    "Central billing conversation — custom credit pools and onboarding",
  ],
  giga3Connection:
    "Workspaces reuse the same Giga3 chat, learning, and creator products. Entitlements and credits are validated server-side; contact us for volume pricing instead of self-serve checkout.",
  primaryHref: "/workspace",
  primaryLabel: "Explore workspaces",
  secondaryHref: "/#contact",
  secondaryLabel: "Contact sales",
};

export const MARKETPLACE_PAGE_SHELL: PublicProductPageShellProps = {
  title: "Giga3 Marketplace — Buy digital products in GHS",
  description: catalogEntry("/marketplace").description,
  audience: "learners, creators, and buyers in Ghana and beyond",
  whatItDoes:
    "Browse ebooks, templates, and educational PDFs from verified creators. Pay with Paystack in GHS — files unlock only after payment succeeds.",
  whoFor: [
    "Students buying study guides and templates",
    "Creators selling digital products alongside GigaSocial",
    "Teams sourcing vetted educational resources",
  ],
  capabilities: [
    "Search, categories, and verified creator badges",
    "Paystack checkout with secure file delivery",
    "Creator Academy official series (priced separately from subscriptions)",
  ],
  giga3Connection:
    "Marketplace complements GigaLearn and Creator Studio — sell what you create on Giga3. Purchases do not replace chat subscription credits; each product lists its own GHS price.",
  primaryHref: "/marketplace",
  primaryLabel: "Browse marketplace",
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
