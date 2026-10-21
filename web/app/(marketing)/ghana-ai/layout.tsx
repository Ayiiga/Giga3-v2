import type { Metadata } from "next";
import { publicMetadata } from "@/lib/seo/publicMetadata";

const base = publicMetadata({
  path: "/ghana-ai",
  title: "Ghana AI Super App — Giga3 AI for Students, Teachers & Business",
  description:
    "Ghana's AI Super App for BECE and WASSCE. AI chat, GigaLearn Academy and Exam Practice for students, teachers and businesses — built for Ghana.",
});

export const metadata: Metadata = {
  ...base,
  keywords: [
    "Ghana AI Super App",
    "Ghana AI",
    "AI tools for Ghana students",
    "AI for BECE WASSCE",
    "Giga3 AI",
    "AI for Ghana teachers",
    "AI for business Ghana",
  ],
  openGraph: {
    ...base.openGraph,
    title: "Ghana AI Super App — Giga3 AI | Built for Ghana",
    description:
      "Built for Ghana. AI chat, GigaLearn, BECE and WASSCE support, creators and business tools — with Twi, Ga, Ewe and Pidgin-friendly workflows.",
  },
};

export default function GhanaAiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
