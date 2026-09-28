import type { Metadata } from "next";
import { publicMetadata } from "@/lib/seo/publicMetadata";

const base = publicMetadata({
  path: "/ghana-ai",
  title:
    "Ghana AI Super App - Giga3AI | #1 AI Platform for Ghana Students, Teachers & Business",
  description:
    "Ghana's #1 AI Super App for BECE, WASSCE & beyond. Giga3AI helps Ghana students, teachers & businesses with AI chat, GigaLearn, video creation & more. Built for Ghana curriculum.",
});

export const metadata: Metadata = {
  ...base,
  keywords: [
    "Ghana AI Super App",
    "Ghana AI",
    "AI tools for Ghana students",
    "AI for BECE WASSCE",
    "Giga3AI",
    "AI for Ghana teachers",
    "AI for business Ghana",
  ],
  openGraph: {
    ...base.openGraph,
    title: "Ghana AI Super App - Giga3AI | Built for Ghana",
    description:
      "Built for Ghana. #1 AI platform for BECE/WASSCE, teachers, creators & business. Twi, Ga, Ewe, Pidgin support.",
  },
};

export default function GhanaAiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
