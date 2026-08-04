/**
 * Official Giga3 Creator Academy — four PDF series sold on the marketplace.
 * Each series is priced at GHS 150.00 (Paystack currency code GHS / GHC).
 */

export const CREATOR_SERIES_PRICE_GHS = 150;

export type CreatorSeriesId = "series-1" | "series-2" | "series-3" | "series-4";

export type CreatorSeriesMeta = {
  id: CreatorSeriesId;
  /** Stable tag used to match published Convex listings. */
  listingTag: string;
  seriesNumber: number;
  title: string;
  subtitle: string;
  description: string;
  previewText: string;
  category: "Technology" | "Education" | "Marketing" | "Business";
  productType: "ebook";
  license: "personal";
  fileName: string;
  /** Public path under the static site (trailing slash not required). */
  pdfPath: string;
  coverPath: string;
  topics: string[];
  accent: string;
};

export const CREATOR_SERIES: CreatorSeriesMeta[] = [
  {
    id: "series-1",
    listingTag: "giga3-series-1",
    seriesNumber: 1,
    title: "Giga3 AI PWA — Series 1: Platform Foundations",
    subtitle: "Install, chat, models, credits & offline",
    description:
      "The complete starter guide to the Giga3 AI progressive web app: install on phone or desktop, navigate chat and workspaces, choose Fast/Smart/Vision/Creator models, manage credits and themes, and stay productive offline.",
    previewText:
      "Learn how Giga3 runs as a PWA, how chat messaging works across Convex (and optional Supabase history), and how model tiers map to real product modes — so you start creating with confidence.",
    category: "Technology",
    productType: "ebook",
    license: "personal",
    fileName: "Giga3-AI-PWA-Series-1-Platform-Foundations.pdf",
    pdfPath: "/marketplace/series/giga3-series-1-platform-foundations.pdf",
    coverPath: "/marketplace/series/covers/series-1.svg",
    topics: [
      "PWA install & shell",
      "Chat & model tiers",
      "Credits & themes",
      "Offline reliability",
    ],
    accent: "#0f766e",
  },
  {
    id: "series-2",
    listingTag: "giga3-series-2",
    seriesNumber: 2,
    title: "Giga3 AI PWA — Series 2: Create & Publish",
    subtitle: "Media Studio, GigaEdit, cameras & export",
    description:
      "A creator production handbook for Media Studio and GigaEdit: generate and edit images/video, use pro camera workflows, apply templates and aspect crops, bake exports, and hand off polished posts to GigaSocial.",
    previewText:
      "From first frame to publish-ready file — cover fal.ai / Replicate / Google AI Studio failover, GigaEdit tabs, teleprompter, voice, and the publish handoff that lands in the GigaSocial composer.",
    category: "Education",
    productType: "ebook",
    license: "personal",
    fileName: "Giga3-AI-PWA-Series-2-Create-and-Publish.pdf",
    pdfPath: "/marketplace/series/giga3-series-2-create-and-publish.pdf",
    coverPath: "/marketplace/series/covers/series-2.svg",
    topics: [
      "Media Studio jobs",
      "GigaEdit pipeline",
      "Camera & export",
      "Publish handoff",
    ],
    accent: "#047857",
  },
  {
    id: "series-3",
    listingTag: "giga3-series-3",
    seriesNumber: 3,
    title: "Giga3 AI PWA — Series 3: GigaSocial Creator Playbook",
    subtitle: "Feed, community, tips, gifts & growth",
    description:
      "Grow on GigaSocial: craft posts that perform, use multi-account profiles, tip and gift mechanics, locked content unlocks, discovery, and community habits that turn followers into fans.",
    previewText:
      "Practical playbook for the GigaSocial feed — media controls, like/tip on media, creator gifts, unlocks, composer workflows, and growth loops tuned for African creators.",
    category: "Marketing",
    productType: "ebook",
    license: "personal",
    fileName: "Giga3-AI-PWA-Series-3-GigaSocial-Creator-Playbook.pdf",
    pdfPath: "/marketplace/series/giga3-series-3-gigasocial-creator-playbook.pdf",
    coverPath: "/marketplace/series/covers/series-3.svg",
    topics: [
      "Feed & composer",
      "Tips & gifts",
      "Multi-account",
      "Growth loops",
    ],
    accent: "#0d9488",
  },
  {
    id: "series-4",
    listingTag: "giga3-series-4",
    seriesNumber: 4,
    title: "Giga3 AI PWA — Series 4: Monetize & Marketplace",
    subtitle: "Paystack, products, verification & payouts",
    description:
      "Turn Giga3 into income: subscriptions and credits, marketplace listings at professional standards, identity verification, Paystack checkout in GHS, buyer delivery, reviews, and creator payouts.",
    previewText:
      "Everything sellers need — listing quality, file delivery, GHS 150 Creator Academy pricing model, platform fees, verification (national ID + GPS), and payout requests from the creator dashboard.",
    category: "Business",
    productType: "ebook",
    license: "personal",
    fileName: "Giga3-AI-PWA-Series-4-Monetize-and-Marketplace.pdf",
    pdfPath: "/marketplace/series/giga3-series-4-monetize-and-marketplace.pdf",
    coverPath: "/marketplace/series/covers/series-4.svg",
    topics: [
      "Paystack & GHS",
      "Sell digital goods",
      "Verification",
      "Payouts",
    ],
    accent: "#115e59",
  },
];

export const CREATOR_SERIES_OFFICIAL_TAG = "giga3-official-series";

export function formatSeriesPriceGhs(amount = CREATOR_SERIES_PRICE_GHS): string {
  return `GHS ${amount.toFixed(2)}`;
}

export function getCreatorSeriesById(id: string): CreatorSeriesMeta | undefined {
  return CREATOR_SERIES.find((s) => s.id === id || s.listingTag === id);
}
