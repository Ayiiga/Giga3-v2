import { publicMetadata } from "@/lib/seo/publicMetadata";

// Query-param creator profile shell; canonical creator pages live under /gigasocial/profile/<handle>/.
export const metadata = publicMetadata({
  path: "/creator",
  title: "Creator profile — Giga3 AI Marketplace",
  description: "Marketplace creator profile and listings on Giga3 AI.",
  index: false,
});

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
