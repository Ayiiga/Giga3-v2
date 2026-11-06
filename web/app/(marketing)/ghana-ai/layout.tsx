import type { Metadata } from "next";
import { publicMetadata } from "@/lib/seo/publicMetadata";

const base = publicMetadata({
  path: "/ghana-ai",
  title: "Ghana AI & Digital Services — Giga3 Hub for Students, Teachers & Business",
  description:
    "Ghana's connected digital platform for BECE and WASSCE support, AI assistance, GigaLearn, social connection and creative services — built for Ghana.",
});

export const metadata: Metadata = {
  ...base,
  keywords: [
    "Ghana AI & Digital Services",
    "Ghana AI",
    "AI tools for Ghana students",
    "AI for BECE WASSCE",
    "Giga3 Hub",
    "AI for Ghana teachers",
    "AI for business Ghana",
  ],
  openGraph: {
    ...base.openGraph,
    title: "Ghana AI & Digital Services — Giga3 Hub | Built for Ghana",
    description:
      "Built for Ghana. AI chat, GigaLearn, BECE and WASSCE support, creators and business tools — with Twi, Ga, Ewe and Pidgin-friendly workflows.",
  },
};

export default function GhanaAiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
